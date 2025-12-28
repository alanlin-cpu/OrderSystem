/**
 * LocalStorage 封裝服務
 * 統一管理所有本地存儲操作
 */

const STORAGE_KEYS = {
  USER: 'user',
  ORDERS: 'orders',
  ARCHIVES: 'archives'
}

/**
 * 儲存使用者資料
 */
export function saveUser(username) {
  try {
    if (username) {
      localStorage.setItem(STORAGE_KEYS.USER, username)
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER)
    }
  } catch (e) {
    console.warn('儲存使用者失敗', e)
  }
}

/**
 * 載入使用者資料
 */
export function loadUser() {
  try {
    return localStorage.getItem(STORAGE_KEYS.USER)
  } catch (e) {
    console.warn('載入使用者失敗', e)
    return null
  }
}

/**
 * 儲存訂單列表
 */
export function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))
  } catch (e) {
    console.warn('儲存本地訂單失敗', e)
  }
}

/**
 * 載入訂單列表
 */
export function loadOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.warn('載入訂單失敗', e)
    return []
  }
}

/**
 * 儲存結算檔案
 */
export function saveArchives(archives) {
  try {
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives))
  } catch (e) {
    console.warn('儲存本地結算檔案失敗', e)
  }
}

/**
 * 載入結算檔案
 */
export function loadArchives() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ARCHIVES)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.warn('載入結算檔案失敗', e)
    return []
  }
}
