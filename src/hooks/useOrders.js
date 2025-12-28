import { useState, useEffect, useRef, startTransition } from 'react'
import { computeOrderID, computeSettlementID } from '../utils'
import { saveOrders, loadOrders, saveArchives, loadArchives } from '../services/storageService'
import { 
  loadOrdersFromApi, 
  loadOrdersFromSheet, 
  getSettledOrderIDs,
  submitOrderToApi,
  deleteOrderInApi,
  sendSettlementToApi
} from '../services/orderService'

/**
 * 訂單管理的自定義 Hook
 * 管理訂單狀態、同步邏輯、結算功能
 */
export function useOrders(user, pushToast) {
  const [orders, setOrders] = useState([])
  const [archives, setArchives] = useState([])
  const [lastRemoteIDs, setLastRemoteIDs] = useState(new Set())
  const [syncFailedOrders, setSyncFailedOrders] = useState(new Set())
  const recentSubmissionsRef = useRef(new Map())

  // 取得已結算訂單的 ID 集合
  const getArchivedIDs = () => new Set(
    archives.flatMap(a => 
      (Array.isArray(a.orders) ? a.orders : [])
        .map(o => o.orderID || computeOrderID(o.timestamp))
        .filter(Boolean)
    )
  )

  // 初始化載入
  useEffect(() => {
    const savedOrders = loadOrders()
    const processedOrders = Array.isArray(savedOrders)
      ? savedOrders.map(o => ({ 
          ...o, 
          orderID: o.orderID || computeOrderID(o.timestamp) 
        }))
      : []

    const savedArchives = loadArchives()

    if (processedOrders.length > 0) {
      setOrders(processedOrders)
    } else {
      // 若本地沒有訂單，嘗試從遠端載入
      (async () => {
        try {
          const { remoteOrders } = await loadOrdersFromApi()
          if (remoteOrders && remoteOrders.length > 0) {
            setOrders(remoteOrders)
          }
        } catch (_) {
          try {
            const { remoteOrders } = await loadOrdersFromSheet()
            if (remoteOrders && remoteOrders.length > 0) {
              setOrders(remoteOrders)
            }
          } catch (e) {
            console.warn('初始載入訂單失敗', e)
          }
        }
      })()
    }

    if (Array.isArray(savedArchives)) {
      setArchives(savedArchives)
    }
  }, [])

  // 持久化訂單（debounce）
  useEffect(() => {
    const timer = setTimeout(() => {
      saveOrders(orders)
    }, 300)
    return () => clearTimeout(timer)
  }, [orders])

  // 持久化結算檔案
  useEffect(() => {
    saveArchives(archives)
  }, [archives])

  // 共用的同步邏輯
  const processSyncResult = (
    remoteIDs = new Set(), 
    remoteOrders = [], 
    prevOrders = [], 
    settledIDs = new Set()
  ) => {
    const now = Date.now()
    const recentSubmissions = recentSubmissionsRef.current
    
    // 防禦性檢查
    if (!Array.isArray(remoteOrders)) remoteOrders = []
    if (!Array.isArray(prevOrders)) prevOrders = []
    
    // 清理過期的最近提交記錄（超過 2 分鐘）
    for (const [id, timestamp] of recentSubmissions.entries()) {
      if (now - timestamp > 120000) {
        recentSubmissions.delete(id)
      }
    }
    
    const archivedIDs = getArchivedIDs()
    
    // 步驟1：處理已在遠端結算的訂單
    const ordersToArchive = prevOrders.filter(o => settledIDs.has(o.orderID))
    if (ordersToArchive.length > 0) {
      setArchives(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        orders: ordersToArchive,
        note: '從其他裝置同步的已結算訂單'
      }])
      pushToast(
        `已自動歸檔 ${ordersToArchive.length} 筆其他裝置結算的訂單`, 
        'info', 
        3000
      )
    }
    
    // 步驟2：合併遠端訂單到本地
    const incomingOrders = remoteOrders.filter(o => 
      o.orderID && 
      !archivedIDs.has(o.orderID) && 
      !settledIDs.has(o.orderID)
    )
    
    let merged = [...prevOrders.filter(o => !settledIDs.has(o.orderID))]
    
    incomingOrders.forEach(remoteOrder => {
      const idx = merged.findIndex(
        localOrder => localOrder.orderID === remoteOrder.orderID
      )
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...remoteOrder }
      } else {
        merged.push(remoteOrder)
      }
    })
    
    // 步驟3：計算同步失敗的訂單
    const localIDs = new Set(merged.map(o => o.orderID).filter(Boolean))
    const nextFailed = new Set()
    
    localIDs.forEach(id => { 
      if (!remoteIDs.has(id) && 
          !recentSubmissions.has(id) && 
          !settledIDs.has(id)) {
        nextFailed.add(id)
      }
    })
    setSyncFailedOrders(nextFailed)
    
    return merged
  }

  // 手動同步
  const handleManualSync = async () => {
    try {
      const { remoteIDs, remoteOrders } = await loadOrdersFromApi()
      const settledIDs = await getSettledOrderIDs()
      
      setOrders(prev => processSyncResult(remoteIDs, remoteOrders, prev, settledIDs))
    } catch (err) {
      console.warn('doGet 同步失敗，嘗試 gviz fallback', err)
      try {
        const { remoteIDs, remoteOrders } = await loadOrdersFromSheet()
        setOrders(prev => processSyncResult(remoteIDs, remoteOrders, prev, new Set()))
      } catch (err2) {
        console.warn('同步失敗', err2)
      }
    }
  }

  // 首次載入後同步
  useEffect(() => {
    if (!user) return
    handleManualSync()
  }, [user])

  // 自動同步
  useEffect(() => {
    if (!user) return
    
    const onFocus = () => { handleManualSync() }
    window.addEventListener('focus', onFocus)
    
    const syncInterval = setInterval(() => {
      handleManualSync()
    }, 10000) // 10 秒
    
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(syncInterval)
    }
  }, [user])

  // 提交訂單
  const submitOrder = async (orderData) => {
    const now = new Date()
    const orderID = computeOrderID(now)

    const payload = {
      ...orderData,
      orderID,
      timestamp: now.toISOString(),
      user,
      deletedBy: null,
      deletedAt: null
    }

    pushToast('已送出訂單！', 'success')
    
    // 記錄最近提交
    recentSubmissionsRef.current.set(orderID, Date.now())
    
    // 更新本地狀態
    startTransition(() => {
      setOrders((prev) => [...prev, payload])
    })

    // 背景上傳
    try {
      await submitOrderToApi(payload)
    } catch (err) {
      console.error('背景上傳 Google Sheet 失敗:', err)
      pushToast('訂單已送出，本機保留；雲端暫時失敗', 'error')
    }

    return payload
  }

  // 刪除訂單
  const deleteOrder = async (index) => {
    const orderToDelete = orders[index]
    if (!orderToDelete) return

    const deletedAt = new Date().toISOString()
    
    setOrders((prev) => {
      const newOrders = [...prev]
      newOrders[index] = { 
        ...newOrders[index], 
        deleted: true, 
        deletedBy: user, 
        deletedAt 
      }
      return newOrders
    })

    try {
      await deleteOrderInApi(
        orderToDelete.orderID || computeOrderID(orderToDelete.timestamp),
        user,
        deletedAt
      )
    } catch (err) {
      console.error('同步刪除狀態到 Google Sheet 失敗:', err)
      pushToast('刪除已標記，本機完成；雲端同步失敗', 'error')
    }
  }

  // 結算訂單
  const settleOrders = async (indicesToSettle) => {
    const settled = indicesToSettle.map(i => orders[i]).filter(Boolean)
    if (settled.length === 0) return

    await sendSettlementToApi(settled, user)

    setArchives((prev) => [
      ...prev, 
      { 
        id: Date.now(), 
        timestamp: new Date().toISOString(), 
        orders: settled 
      }
    ])
    
    const remaining = orders.filter((_, idx) => !indicesToSettle.includes(idx))
    setOrders(remaining)
  }

  // 結算所有訂單
  const settleAllOrders = async () => {
    if (!orders || orders.length === 0) return
    const all = [...orders]

    await sendSettlementToApi(all, user)

    setArchives((prev) => [
      ...prev, 
      { 
        id: Date.now(), 
        timestamp: new Date().toISOString(), 
        orders: all 
      }
    ])
    setOrders([])
  }

  // 重試上傳
  const retryUpload = async (index) => {
    const orderToRetry = orders[index]
    if (!orderToRetry) return

    pushToast('重新上傳中...', 'info', 2000)

    try {
      await submitOrderToApi(orderToRetry)
      
      setSyncFailedOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderToRetry.orderID)
        return newSet
      })
      
      pushToast('重新上傳成功！', 'success')
    } catch (err) {
      console.error('重新上傳失敗:', err)
      pushToast('重新上傳失敗，請稍後再試', 'error', 4000)
    }
  }

  return {
    orders,
    archives,
    syncFailedOrders,
    submitOrder,
    deleteOrder,
    settleOrders,
    settleAllOrders,
    retryUpload,
    handleManualSync
  }
}
