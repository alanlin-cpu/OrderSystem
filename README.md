# OrderSystem

簡介
-
一個以 Vite + React 建置的簡易訂購範例應用。

本檔說明如何在本機開發、建置，並以 GitHub Pages 發佈。

快速上手
-
1. 安裝相依套件

```bash
npm install
```

2. 本機開發（開啟 Vite 開發伺服器）

```bash
npm run dev
```

3. 建置

```bash
npm run build
```

4. 發佈到 GitHub Pages

預設使用 `gh-pages` 發佈 `dist` 目錄。請確認 `package.json` 的 `homepage` 已設定為你的 GitHub Pages URL，例如：

```
"homepage": "https://alanlin-cpu.github.io/OrderSystem/"
```

如要發佈：

```bash
npm run deploy
```

重要設定說明
-
- 若使用 GitHub Pages（User/Project pages），請在 `vite.config.js` 中把 `base` 設為 `/<repo-name>/`（本專案為 `/OrderSystem/`），範例：

```js
export default defineConfig({
  base: '/OrderSystem/',
  plugins: [react()]
})
```

- 在 `index.html` 中使用相對路徑載入 entry（`src/main.jsx`），讓 Vite 在建置時自動加上 `base`。

檢查與驗證
-
- 建置完成後，開啟 `dist/index.html`，確認資源路徑為 `/OrderSystem/assets/...`（或對應的 `homepage` 路徑）。
- 若使用自訂網域或 GitHub Pages 設定不同，請調整 `homepage` 與 `vite.config.js` 的 `base`。

其他
-
若要我幫你直接發佈或更新 `homepage`、提交檔案，我可以代為執行。

**Google Sheets 與 Google Apps Script 使用指南**
-

概覽
-
本節說明如何把應用與 Google Sheets 整合，並使用 Google Apps Script (Apps Script) 建立簡易 API（Web App），讓前端可透過 HTTP 呼叫新增或讀取試算表。

步驟總覽
-
1. 建立 Google Sheet 並取得 Sheet ID
2. 在 Google Sheets 建立 Apps Script 專案
3. 撰寫 `doPost(e)` 或 `doGet(e)` 處理函式以讀寫試算表
4. 部署為 Web App（設定授權與存取範圍）
5. 從前端呼叫 Web App URL（用 `fetch`）

詳細步驟
-
1) 建立 Sheet 並取得 ID
- 開啟 Google Sheets，建立新的試算表，記下網址中的 ID（例如 `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit` 中的 `<SHEET_ID>`）。
- 建議建立一個標題列（header），例如 `timestamp`, `name`, `email`, `item`, `qty`。

2) 在 Sheets -> Extensions -> Apps Script 建立腳本
- 進入 `Extensions` → `Apps Script`，建立新的 Script 專案。這個專案會自動綁定到該試算表。

3) 範例 Apps Script 程式（新增列）
-
```javascript
const SHEET_NAME = 'Sheet1'; // 你的工作表名稱

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const body = typeof e.postData === 'object' ? e.postData.contents : e.postData;
    const data = JSON.parse(body || '{}');
    // 依標題欄位順序 append
    const row = [new Date().toISOString(), data.name || '', data.email || '', data.item || '', data.qty || ''];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

- 若要讀取資料，可實作 `doGet(e)` 或建立其他函式並使用 `ContentService` 回傳 JSON。

4) 部署為 Web App
- 在 Apps Script 編輯器中選 `Deploy` → `New deployment`。
- 選擇 `Web app`，設定 `Execute as` 為 `Me`，`Who has access` 可先選 `Anyone`（測試用）。
- 部署後會取得一個 Web App URL（類似 `https://script.google.com/macros/s/.../exec`），這就是前端要呼叫的目標。
- 注意：第一次部署會需要授權，且 `Anyone` 無需 Google 帳號即可存取（風險較高）。

5) 前端呼叫範例（使用 Fetch）
-
```javascript
async function sendOrder(payload) {
  const url = 'https://script.google.com/macros/s/你的部署ID/exec';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// 使用範例
sendOrder({ name: 'Alice', email: 'a@example.com', item: 'Coffee', qty: 2 })
  .then(r => console.log(r))
  .catch(console.error);
```

進階：使用 Google Sheets API 與服務帳戶（伺服器端）
-
如果你要從後端伺服器（非 Apps Script）直接存取 Sheets，建議使用 Google Sheets API 與服務帳戶：
- 在 Google Cloud Console 建專案並啟用 Google Sheets API。
- 建立服務帳戶並產生金鑰（JSON）。
- 將服務帳戶的 email 加到目標試算表的共用名單中（編輯權限）。
- 使用 Google 提供的套件（例如 Node.js 的 `googleapis`）來驗證並呼叫 Sheets API。

安全性與注意事項
-
- 若部署 Web App 並設定為 `Anyone` 可存取，請注意資料隱私與濫用風險；可在 Apps Script 程式內加入簡單的 API key 檢查（例如檢查 `e.parameter.key` 或 JSON body 裡的 `key`）。
- 若需更嚴謹的存取控制，請使用 OAuth 或服務帳戶並將前端改為呼叫受保護的後端。
- Apps Script 的執行配額與限制：請參考官方文件，避免短時間大量寫入造成配額耗盡。

測試與偵錯
-
- 在 Apps Script 編輯器可直接執行測試函式並查看執行記錄（Execution log）與授權流程。
- 前端 fetch 呼叫遇錯可查看瀏覽器 Network 面板與 Apps Script 的執行記錄以了解錯誤資訊。

範例：加入簡單 API Key 檢查（Apps Script）
-
```javascript
const API_KEY = '你的-簡易-api-key';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.key !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' })).setMimeType(ContentService.MimeType.JSON);
    }
    // 剩下同上：appendRow...
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

結語
-
本節提供一個簡單、快速把前端與 Google Sheets 整合的做法：使用 Apps Script 部署 Web App，前端直接以 `fetch` 呼叫 `doPost` 新增資料。若需要更高安全性或大量資料處理，建議改用 Google Cloud + Sheets API 並採用服務帳戶或後端代理。

如需我幫你：
- 建立範例 Apps Script 並部署（需提供 Google 帳號授權流程）
- 將前端整合呼叫程式碼加入 `src/` 並示範 UI
請告訴我你要我幫哪一項，我會接續處理。