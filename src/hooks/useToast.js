import { useState } from 'react'

/**
 * Toast 通知的自定義 Hook
 * 管理 Toast 訊息的顯示與移除
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const pushToast = (message, type = 'success', ttl = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, ttl)
  }

  return { toasts, pushToast }
}
