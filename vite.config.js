import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/OrderSystem/',
  plugins: [react()],
  // No TS forced entry; entry comes from index.html -> /src/main.jsx
})