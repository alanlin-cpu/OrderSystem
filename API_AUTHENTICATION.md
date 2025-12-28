# API 驗證機制完整指南

## 📌 什麼是 API 驗證機制？

API 驗證機制是一套安全防護措施，用來確保只有**授權的用戶端**才能訪問和操作後端 API，防止未經授權的訪問、資料洩露和濫用。

## 🔒 目前系統存在的安全問題

### 問題 1：環境變數暴露
```javascript
// ❌ 前端代碼被打包後會暴露這些敏感信息
export const GAS_URL = import.meta.env.VITE_GAS_URL 
// 結果：任何人都可以從 dist/assets/*.js 中找到 GAS_URL
```

### 問題 2：無身份驗證的 API 端點
目前除了登入和讀取已結算訂單，其他所有 API 調用都沒有身份驗證：
- ❌ 任何人都能提交訂單
- ❌ 任何人都能刪除訂單
- ❌ 任何人都能進行結算操作

### 問題 3：無速率限制
- ❌ 攻擊者可以快速發送大量請求
- ❌ 沒有防止濫用的機制

### 問題 4：無 CORS 限制
- ❌ 來自任何域的請求都被接受
- ❌ 容易被惡意網站利用

---

## ✅ 4 種常見的 API 驗證方式

### 1️⃣ **API Key（最簡單）**
```
概念：客戶端傳遞一個唯一的密鑰
使用場景：簡單的服務-to-服務通信
優點：實現簡單、運行快
缺點：無法區分用戶、容易被盜用
```

### 2️⃣ **OAuth 2.0（最安全）**
```
概念：授權框架，用戶授予應用程式有限的訪問權限
使用場景：企業應用、多用戶系統
優點：安全性高、可以精細控制權限
缺點：實現複雜
```

### 3️⃣ **JWT（JSON Web Token）（最流行）** ⭐
```
概念：包含用戶資訊的加密 token，有過期時間
使用場景：前後端分離、移動應用
優點：無狀態、易於擴展、安全性高
缺點：需要後端驗證簽名
```

### 4️⃣ **Session + Cookie（傳統方式）**
```
概念：在後端儲存用戶會話，通過 Cookie 識別
使用場景：傳統 Web 應用
優點：經過驗證、安全可靠
缺點：不適合無狀態 API
```

---

## 🚀 本系統推薦方案：API Key + 基於用戶驗證

結合簡單性和安全性，我推薦採用：
1. **登入成功後**，返回一個 **API Token**
2. **每次 API 調用**都傳遞這個 Token
3. **後端驗證** Token 的有效性和權限

---

## 💻 實作範例

### 前端實作

#### 1. 修改 useAuth.js - 儲存 Token
```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react'
import { saveUser, loadUser } from '../services/storageService'
import { loginUser } from '../services/orderService'

export function useAuth(pushToast) {
  const [user, setUser] = useState(null)
  const [apiToken, setApiToken] = useState(null)  // 🆕 新增

  useEffect(() => {
    const savedUser = loadUser()
    const savedToken = localStorage.getItem('apiToken')  // 🆕 新增
    if (savedUser) {
      setUser(savedUser)
      if (savedToken) setApiToken(savedToken)  // 🆕 新增
    }
  }, [])

  useEffect(() => {
    saveUser(user)
  }, [user])

  // 🆕 新增：儲存 Token
  useEffect(() => {
    if (apiToken) {
      localStorage.setItem('apiToken', apiToken)
    } else {
      localStorage.removeItem('apiToken')
    }
  }, [apiToken])

  const handleLogin = async (username, password) => {
    if (!username || !password) {
      pushToast('請輸入帳號和密碼', 'error')
      return false
    }

    pushToast('登入中...', 'info', 2000)

    try {
      const data = await loginUser(username, password)
      
      if (data.success) {
        setUser(data.username)
        setApiToken(data.token)  // 🆕 新增：儲存 token
        pushToast(`歡迎 ${data.displayName || username}！`, 'success')
        return true
      } else {
        pushToast(data.message || '登入失敗', 'error', 4000)
        return false
      }
    } catch (error) {
      console.error('登入驗證失敗:', error)
      pushToast('無法連接到伺服器，請檢查網路連線', 'error', 4000)
      return false
    }
  }

  const handleLogout = () => {
    setUser(null)
    setApiToken(null)  // 🆕 新增：清除 token
  }

  return {
    user,
    apiToken,  // 🆕 新增
    handleLogin,
    handleLogout
  }
}
```

#### 2. 修改 orderService.js - 傳遞 Token
```javascript
// services/orderService.js
import { GAS_URL } from '../config'
import { computeOrderID } from '../utils'

/**
 * 提交訂單到後端（帶 Token）
 */
export async function submitOrderToApi(payload, apiToken) {  // 🆕 新增參數
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 
      'Content-Type': 'text/plain',
      'X-API-Token': apiToken  // 🆕 新增 token 到 header
    },
    body: JSON.stringify(payload)
  })
}

/**
 * 標記訂單為已刪除（帶 Token）
 */
export async function deleteOrderInApi(orderID, deletedBy, deletedAt, apiToken) {  // 🆕
  const deletePayload = {
    action: 'delete',
    orderID,
    deletedBy,
    deletedAt
  }
  
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 
      'Content-Type': 'text/plain',
      'X-API-Token': apiToken  // 🆕 新增 token 到 header
    },
    body: JSON.stringify(deletePayload)
  })
}

/**
 * 發送結算資料到後端（帶 Token）
 */
export async function sendSettlementToApi(settledOrders, user, note = '', apiToken) {  // 🆕
  const ts = new Date().toISOString()
  const batchId = computeOrderID(ts)
  
  const payload = {
    action: 'settlement',
    batchId,
    user,
    orders: settledOrders,
    // ... 其他字段
  }

  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 
      'Content-Type': 'text/plain',
      'X-API-Token': apiToken  // 🆕 新增 token 到 header
    },
    body: JSON.stringify(payload)
  })
}
```

#### 3. 修改 useOrders.js - 使用 apiToken
```javascript
// hooks/useOrders.js
export function useOrders(user, apiToken, pushToast) {  // 🆕 新增 apiToken 參數
  // ...
  
  const submitOrder = async (orderData) => {
    // ...
    try {
      await submitOrderToApi(payload, apiToken)  // 🆕 傳遞 token
    } catch (err) {
      // ...
    }
  }

  const deleteOrder = async (index) => {
    // ...
    try {
      await deleteOrderInApi(
        orderID,
        user,
        deletedAt,
        apiToken  // 🆕 傳遞 token
      )
    } catch (err) {
      // ...
    }
  }

  // ...
}
```

#### 4. 修改 App.jsx - 傳遞 apiToken
```javascript
// App.jsx
export default function App() {
  const [currentPage, setCurrentPage] = useState('menu')

  const { toasts, pushToast } = useToast()
  const { user, apiToken, handleLogin: login, handleLogout } = useAuth(pushToast)  // 🆕
  // ...
  const {
    orders,
    syncFailedOrders,
    submitOrder: submitOrderToService,
    // ...
  } = useOrders(user, apiToken, pushToast)  // 🆕 傳遞 apiToken
  
  // ...
}
```

---

### 後端實作（Google Apps Script）

#### 1. 添加 Token 生成和驗證函數

```javascript
// Code.gs 頂部添加

// ✅ 密鑰管理
const API_TOKENS = {};  // 在內存中存儲活躍的 tokens
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000;  // 8 小時過期

/**
 * 生成一個隨機的 Token（20 位英數字符）
 */
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 驗證 Token 是否有效
 */
function validateToken(token) {
  if (!token || !API_TOKENS[token]) {
    return false;
  }
  
  const tokenData = API_TOKENS[token];
  const now = Date.now();
  
  // 檢查過期時間
  if (now > tokenData.expiresAt) {
    delete API_TOKENS[token];  // 刪除過期 token
    return false;
  }
  
  return true;
}

/**
 * 獲取 Token 對應的用戶名
 */
function getUserFromToken(token) {
  if (!validateToken(token)) return null;
  return API_TOKENS[token].username;
}

/**
 * 存儲 Token（登入後調用）
 */
function storeToken(username, token) {
  API_TOKENS[token] = {
    username: username,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS
  };
}

/**
 * 清除 Token（登出時調用）
 */
function clearToken(token) {
  delete API_TOKENS[token];
}

/**
 * 定期清理過期的 token（可以通過時間觸發器調用）
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const token in API_TOKENS) {
    if (now > API_TOKENS[token].expiresAt) {
      delete API_TOKENS[token];
    }
  }
}
```

#### 2. 修改 doGet - 登入時返回 Token
```javascript
// 在 doGet 的登入邏輯中修改
if (action === 'login') {
  const username = String(e.parameter.username || '').trim();
  const password = String(e.parameter.password || '').trim();
  
  // ... 驗證帳號密碼 ...
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const storedUsername = String(row[0] || '').trim();
    const storedPassword = String(row[1] || '').trim();
    const displayName = String(row[2] || '').trim();
    
    if (storedUsername === username && storedPassword === password) {
      const token = generateToken();  // ✅ 生成 token
      storeToken(username, token);     // ✅ 存儲 token
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          username: username,
          displayName: displayName || username,
          token: token  // ✅ 返回 token 給前端
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, message: '帳號或密碼錯誤' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

#### 3. 修改 doPost - 驗證每個請求
```javascript
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const payload = raw ? JSON.parse(raw) : {};

    // ✅ 驗證 Token（除了登入請求外）
    const authToken = e && e.parameter && e.parameter['X-API-Token'];
    if (!validateToken(authToken)) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: '未經授權: 無效的 token' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ✅ 獲取該 token 對應的用戶
    const tokenUser = getUserFromToken(authToken);
    if (!tokenUser) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: '未經授權: 用戶不存在' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ✅ 驗證用戶是否有權限進行此操作
    // 例如：只有某些用戶可以進行結算
    if (payload.action === 'settlement') {
      // 可以檢查用戶的角色
      // if (userRole !== 'manager') return unauthorized()
    }

    // ... 原有的 doPost 邏輯 ...
  } catch (err) {
    // ... 錯誤處理 ...
  }
}
```

---

## 🛡️ 完整的安全檢查清單

| 檢查項目 | 目前狀態 | 推薦實作 |
|---------|--------|--------|
| API 驗證 | ❌ 無 | ✅ Token 驗證 |
| CORS 限制 | ❌ 無 | ✅ 限制來源 |
| 速率限制 | ❌ 無 | ✅ 每分鐘限制請求數 |
| HTTPS | ✅ GAS 內置 | ✅ 保持 |
| 密碼加密 | ❌ 純文本 | ✅ 使用加密函數 |
| Token 過期 | ❌ 無 | ✅ 8 小時自動過期 |
| 日誌審計 | ⚠️ 基礎 | ✅ 記錄所有操作 |
| 資料驗證 | ⚠️ 基礎 | ✅ 嚴格驗證輸入 |

---

## 📊 實作步驟總結

### 優先級 1：立即實作（關鍵安全）
1. ✅ 添加 Token 驗證機制
2. ✅ 登入後返回 Token
3. ✅ 所有寫入操作驗證 Token

### 優先級 2：短期實作（提升安全）
4. ⏳ 密碼加密存儲
5. ⏳ 添加速率限制
6. ⏳ 更詳細的審計日誌

### 優先級 3：長期優化
7. ⏳ JWT 簽名驗證
8. ⏳ 多因素認證
9. ⏳ IP 白名單

---

## ⚠️ 常見的安全陷阱

### 1. Token 存儲位置
```javascript
// ❌ 不安全：存在全域變數
window.apiToken = 'abc123'

// ✅ 安全：存在 localStorage（配合 HTTPS）
localStorage.setItem('apiToken', token)

// ✅ 更安全：存在內存（頁面刷新後丟失）
const apiToken = ref(null)
```

### 2. 不要在 URL 中傳遞 Token
```javascript
// ❌ 危險：Token 會在瀏覽器歷史中暴露
fetch(`${GAS_URL}?token=${apiToken}`)

// ✅ 安全：使用 Header 傳遞
fetch(GAS_URL, {
  headers: { 'X-API-Token': apiToken }
})
```

### 3. HTTPS 很重要
```
❌ http:// + Token = 容易被中間人攻擊
✅ https:// + Token = 加密保護
```

---

## 🎯 下一步

想要我幫你實作這個驗證機制嗎？我可以：
1. 更新前端代碼（useAuth, orderService, useOrders, App.jsx）
2. 更新後端 Code.gs 添加 Token 驗證
3. 添加速率限制和其他安全功能

請告訴我你的優先選擇！
