import { GAS_URL, SHEET_ID, SHEET_NAME } from '../config'
import { computeOrderID } from '../utils'

/**
 * 訂單 API 服務
 * 封裝所有與後端/Google Sheets 的交互
 */

/**
 * 從 Google Sheets (gviz API) 載入訂單
 */
export async function loadOrdersFromSheet() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`
    const res = await fetch(url)
    const text = await res.text()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    
    if (start === -1 || end === -1) {
      throw new Error('Unexpected response from gviz')
    }
    
    const data = JSON.parse(text.slice(start, end + 1))
    const rows = data?.table?.rows || []
    
    // Skip first row (header) and parse remaining rows
    const parsed = rows.slice(1).map(r => {
      const c = r.c || []
      const ts = c[0]?.v || new Date().toISOString()
      const orderID = c[1]?.v || computeOrderID(ts)
      const uname = c[2]?.v || ''
      let items = []
      try { 
        items = JSON.parse(c[3]?.v || '[]') 
      } catch (_) {}
      
      const subtotal = Number(c[4]?.v || 0)
      const discountAmount = Number(c[5]?.v || 0)
      const total = Number(c[6]?.v || 0)
      const payment = c[7]?.v || 'cash'
      const promo = c[8]?.v || ''
      const deletedBy = c[9]?.v || ''
      const deletedAt = c[10]?.v || ''
      
      return { 
        user: uname, 
        items, 
        subtotal, 
        discountAmount, 
        total, 
        paymentMethod: payment, 
        promoCode: promo, 
        timestamp: ts, 
        deletedBy, 
        deletedAt, 
        orderID 
      }
    }).filter(o => o.orderID && String(o.orderID).length > 5)
    
    const remoteIDs = new Set(parsed.map(o => o.orderID).filter(Boolean))
    
    return { remoteIDs, remoteOrders: parsed }
  } catch (e) {
    console.warn('載入雲端訂單失敗（可能需要將試算表發佈為公開）', e)
    return { remoteIDs: new Set(), remoteOrders: [] }
  }
}

/**
 * 從 Apps Script API 載入訂單
 */
export async function loadOrdersFromApi() {
  const url = `${GAS_URL}?action=get`
  const res = await fetch(url, { method: 'GET' })
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  
  const data = await res.json()
  const list = Array.isArray(data?.orders) ? data.orders : []
  
  if (list.length === 0) {
    return { remoteIDs: new Set(), remoteOrders: [] }
  }
  
  // Fallback: 若 items 為空但有 itemsStr，嘗試解析字符串
  list.forEach(o => {
    if ((!o.items || o.items.length === 0) && o.itemsStr) {
      try {
        o.items = JSON.parse(o.itemsStr)
      } catch (_) {
        o.items = []
      }
    }
  })
  
  const remoteIDs = new Set(list.map(o => o.orderID).filter(Boolean))
  
  return { remoteIDs, remoteOrders: list }
}

/**
 * 獲取已結算的訂單 ID 列表
 */
export async function getSettledOrderIDs() {
  try {
    const settledResponse = await fetch(`${GAS_URL}?action=getSettledOrderIDs`)
    const settledData = await settledResponse.json()
    return new Set(settledData.settledOrderIDs || [])
  } catch (err) {
    console.warn('獲取已結算訂單ID失敗', err)
    return new Set()
  }
}

/**
 * 提交訂單到後端
 */
export async function submitOrderToApi(payload) {
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  })
}

/**
 * 標記訂單為已刪除
 */
export async function deleteOrderInApi(orderID, deletedBy, deletedAt) {
  const deletePayload = {
    action: 'delete',
    orderID,
    deletedBy,
    deletedAt
  }
  
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(deletePayload)
  })
}

/**
 * 發送結算資料到後端
 */
export async function sendSettlementToApi(settledOrders, user, note = '') {
  const ts = new Date().toISOString()
  const batchId = computeOrderID(ts)
  const subtotalSum = settledOrders.reduce((s, o) => s + Number(o.subtotal || 0), 0)
  const discountSum = settledOrders.reduce((s, o) => s + Number(o.discountAmount || 0), 0)
  const totalSum = settledOrders.reduce((s, o) => s + Number(o.total || 0), 0)

  // 計算產品銷量
  const productCounts = {}
  settledOrders.forEach(o => {
    o.items.forEach(it => {
      productCounts[it.name] = (productCounts[it.name] || 0) + (it.quantity || 1)
    })
  })
  const sortedProducts = Object.entries(productCounts)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

  const payload = {
    action: 'settlement',
    batchId,
    user,
    count: settledOrders.length,
    subtotalSum,
    discountSum,
    totalSum,
    note,
    orders: settledOrders,
    productCounts: sortedProducts
  }

  // 同步刪除狀態
  const deletedOrders = settledOrders.filter(o => o.deleted || o.deletedAt)
  deletedOrders.forEach(o => {
    deleteOrderInApi(
      o.orderID || computeOrderID(o.timestamp),
      o.deletedBy || user,
      o.deletedAt || ts
    ).catch(() => {})
  })

  // 送 Settlement 到 GAS
  await fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  })

  return { batchId }
}

/**
 * 使用者登入驗證
 */
export async function loginUser(username, password) {
  const url = `${GAS_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  const response = await fetch(url)
  return response.json()
}
