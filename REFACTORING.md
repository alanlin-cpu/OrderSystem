# 程式碼重構說明

## 📋 重構概述

這次重構將原本 748 行的 `App.jsx` 拆分成多個模組化的檔案，大幅提升程式碼的可維護性、可測試性和可讀性。

## 🏗️ 新的目錄結構

```
src/
├── hooks/                    # 自定義 React Hooks
│   ├── index.js             # 統一導出
│   ├── useAuth.js           # 使用者認證邏輯
│   ├── useCart.js           # 購物車管理
│   ├── useOrders.js         # 訂單管理與同步
│   └── useToast.js          # Toast 通知
│
├── services/                 # 業務邏輯服務層
│   ├── index.js             # 統一導出
│   ├── orderService.js      # 訂單 API 調用
│   └── storageService.js    # LocalStorage 封裝
│
├── components/               # React 組件
│   ├── CheckoutOptions.jsx  # 結帳選項組件
│   ├── ConfirmDialog.jsx    # 確認對話框
│   └── Toast.jsx            # Toast 通知組件
│
├── App.jsx                   # 主應用程式 (重構後 212 行)
├── Menu.jsx                  # 菜單組件
├── OrderHistory.jsx          # 訂單歷史組件
├── config.js                 # 配置文件
└── utils.js                  # 工具函數
```

## 📦 各模組職責

### Hooks

#### `useAuth.js`
- **職責**：管理使用者認證狀態
- **功能**：
  - 登入驗證
  - 登出處理
  - 使用者狀態持久化
- **API**：
  ```javascript
  const { user, handleLogin, handleLogout } = useAuth(pushToast)
  ```

#### `useCart.js`
- **職責**：管理購物車狀態和邏輯
- **功能**：
  - 加入/移除商品
  - 更新商品數量
  - 套用折扣代碼
  - 計算小計、折扣、總計
  - 管理付款方式
- **API**：
  ```javascript
  const {
    cart,
    discount,
    promoCode,
    paymentAmounts,
    subtotal,
    discountAmount,
    total,
    handleAddItem,
    updateQuantity,
    clearCart,
    ...
  } = useCart()
  ```

#### `useOrders.js`
- **職責**：管理訂單狀態和同步邏輯
- **功能**：
  - 訂單 CRUD 操作
  - 自動同步（視窗聚焦、定期同步）
  - 結算功能
  - 同步失敗重試
  - 本地與遠端訂單合併
- **API**：
  ```javascript
  const {
    orders,
    syncFailedOrders,
    submitOrder,
    deleteOrder,
    settleOrders,
    settleAllOrders,
    retryUpload
  } = useOrders(user, pushToast)
  ```

#### `useToast.js`
- **職責**：管理 Toast 通知
- **功能**：
  - 顯示成功/錯誤/資訊訊息
  - 自動消失計時
- **API**：
  ```javascript
  const { toasts, pushToast } = useToast()
  pushToast('訊息內容', 'success', 3000)
  ```

### Services

#### `orderService.js`
- **職責**：封裝所有訂單相關的 API 調用
- **功能**：
  - 從 Google Sheets 載入訂單
  - 從 Apps Script API 載入訂單
  - 提交訂單到後端
  - 標記訂單刪除
  - 發送結算資料
  - 使用者登入驗證
- **API**：
  ```javascript
  import { 
    loadOrdersFromApi, 
    loadOrdersFromSheet,
    submitOrderToApi,
    deleteOrderInApi,
    sendSettlementToApi,
    loginUser
  } from './services/orderService'
  ```

#### `storageService.js`
- **職責**：封裝 LocalStorage 操作
- **功能**：
  - 儲存/載入使用者資料
  - 儲存/載入訂單列表
  - 儲存/載入結算檔案
- **API**：
  ```javascript
  import { 
    saveUser, 
    loadUser,
    saveOrders, 
    loadOrders,
    saveArchives, 
    loadArchives
  } from './services/storageService'
  ```

## 🎯 重構優勢

### 1. **關注點分離**
- 每個模組只負責一個特定功能
- UI 邏輯與業務邏輯分離
- API 調用與狀態管理分離

### 2. **可維護性提升**
- 程式碼量減少：`App.jsx` 從 748 行降至 212 行（減少 71%）
- 邏輯清晰：每個功能都有明確的位置
- 易於定位 bug：模組化後更容易追蹤問題

### 3. **可測試性提升**
- 每個 Hook 可以獨立測試
- Service 層可以模擬（Mock）測試
- 易於撰寫單元測試和整合測試

### 4. **可重用性提升**
- Hooks 可以在不同組件中重用
- Service 函數可以在多處調用
- 減少重複程式碼

### 5. **易於擴展**
- 新增功能只需修改對應模組
- 不會影響其他功能
- 符合開放封閉原則（OCP）

## 🔄 重構前後對比

### 重構前
```javascript
// App.jsx - 748 行
export default function App() {
  // 所有狀態混在一起
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [toasts, setToasts] = useState([])
  
  // 所有函數混在一起
  async function loadOrdersFromSheet() { ... }
  async function loadOrdersFromApi() { ... }
  const handleLogin = async (e) => { ... }
  const submitOrder = async () => { ... }
  
  // 龐大的 JSX
  return ( ... )
}
```

### 重構後
```javascript
// App.jsx - 212 行
export default function App() {
  // 清晰的 Hooks 調用
  const { toasts, pushToast } = useToast()
  const { user, handleLogin, handleLogout } = useAuth(pushToast)
  const { cart, subtotal, total, ... } = useCart()
  const { orders, submitOrder, ... } = useOrders(user, pushToast)
  
  // 簡潔的業務邏輯
  const handleOrderSubmit = async () => {
    // 組合訂單資料
    await submitOrder(orderData)
    clearCart()
  }
  
  // 乾淨的 JSX
  return ( ... )
}
```

## 📝 遷移指南

如果需要修改功能，現在可以直接定位到對應模組：

| 功能 | 修改位置 |
|------|----------|
| 登入邏輯 | `hooks/useAuth.js` |
| 購物車計算 | `hooks/useCart.js` |
| 訂單同步 | `hooks/useOrders.js` |
| API 調用 | `services/orderService.js` |
| 本地存儲 | `services/storageService.js` |
| Toast 通知 | `hooks/useToast.js` |

## 🚀 後續優化建議

1. **加入 TypeScript**：提供型別安全
2. **撰寫單元測試**：為每個 Hook 和 Service 撰寫測試
3. **加入 ESLint + Prettier**：統一程式碼風格
4. **實作錯誤邊界**：更好的錯誤處理
5. **加入 Loading 狀態**：提升使用者體驗

## ✅ 驗證

重構後系統已通過建置測試：
```bash
npm run build
✓ 45 modules transformed.
✓ built in 1.39s
```

所有功能保持不變，程式碼結構更清晰，維護更容易！
