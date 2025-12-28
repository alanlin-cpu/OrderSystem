import { useState, useEffect } from 'react'
import { saveUser, loadUser } from '../services/storageService'
import { loginUser } from '../services/orderService'

/**
 * 使用者認證的自定義 Hook
 * 管理登入、登出和使用者狀態持久化
 */
export function useAuth(pushToast) {
  const [user, setUser] = useState(null)

  // 載入已儲存的使用者
  useEffect(() => {
    const savedUser = loadUser()
    if (savedUser) {
      setUser(savedUser)
    }
  }, [])

  // 儲存使用者到 localStorage
  useEffect(() => {
    saveUser(user)
  }, [user])

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
  }

  return {
    user,
    handleLogin,
    handleLogout
  }
}
