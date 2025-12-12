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