import React, { useState, useEffect } from 'react'
import { GAS_URL, SHEET_ID, SHEET_NAME } from './config'
import { computeOrderID, computeSettlementID } from './utils'
import ToastContainer from './components/Toast'
import './App.css'
import OrderHistory from './OrderHistory'

export default function App() {
  // moved to config.js

  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])  // { item, quantity, sweetness, ice }
  const [orders, setOrders] = useState([])
  const [archives, setArchives] = useState([]) // settlement archives
  const [currentPage, setCurrentPage] = useState('menu') // 'menu' or 'history'

  const [discount, setDiscount] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  // Toast state
  const [toasts, setToasts] = useState([]) // { id, type: 'success'|'error'|'info', message }
  const pushToast = (message, type = 'success', ttl = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl)
  }

  // 客製化彈出視窗狀態
  const [selectedItem, setSelectedItem] = useState(null)
  const [sweetness, setSweetness] = useState('正常糖')
  const [ice, setIce] = useState('正常冰')

  // computeOrderID now comes from utils.js

  // 持久化：載入 orders/archives；變更時儲存到 localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user')
      if (savedUser) setUser(savedUser)

      const savedPayment = localStorage.getItem('paymentMethod')
      if (savedPayment) setPaymentMethod(savedPayment)

      const savedOrdersRaw = JSON.parse(localStorage.getItem('orders') || '[]')
      const savedOrders = Array.isArray(savedOrdersRaw)
        ? savedOrdersRaw.map(o => ({ ...o, orderID: o.orderID || computeOrderID(o.timestamp) }))
        : []
      const savedArchives = JSON.parse(localStorage.getItem('archives') || '[]')
      if (Array.isArray(savedOrders) && savedOrders.length > 0) {
        setOrders(savedOrders)
      } else {
        // 若本地沒有訂單，優先嘗試從 Apps Script API (doGet) 載入，失敗則退回 gviz
        (async () => {
          try {
            await loadOrdersFromApi()
          } catch (_) {
            loadOrdersFromSheet()
          }
        })()
      }
      if (Array.isArray(savedArchives)) setArchives(savedArchives)
    } catch (e) {
      console.warn('載入本地或雲端訂單時發生問題', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('orders', JSON.stringify(orders))
    } catch (e) {
      console.warn('儲存本地訂單失敗', e)
    }
  }, [orders])

  useEffect(() => {
    try {
      localStorage.setItem('archives', JSON.stringify(archives))
    } catch (e) {
      console.warn('儲存本地結算檔案失敗', e)
    }
  }, [archives])

  useEffect(() => {
    try {
      if (user) localStorage.setItem('user', user)
    } catch (e) {
      console.warn('儲存使用者失敗', e)
    }
  }, [user])

  useEffect(() => {
    try {
      if (paymentMethod) localStorage.setItem('paymentMethod', paymentMethod)
    } catch (e) {
      console.warn('儲存付款方式失敗', e)
    }
  }, [paymentMethod])

  async function loadOrdersFromSheet() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`
      const res = await fetch(url)
      const text = await res.text()
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('Unexpected response from gviz')
      const data = JSON.parse(text.slice(start, end + 1))
      const rows = data?.table?.rows || []
      // Skip first row (header) and parse remaining rows
      const parsed = rows.slice(1).map(r => {
        const c = r.c || []
        const ts = c[0]?.v || new Date().toISOString()  // 時間
        const orderID = c[1]?.v || computeOrderID(ts)    // 訂單編號
        const uname = c[2]?.v || ''
        let items = []
        try { items = JSON.parse(c[3]?.v || '[]') } catch (_) {}
        const subtotal = Number(c[4]?.v || 0)
        const discountAmount = Number(c[5]?.v || 0)
        const total = Number(c[6]?.v || 0)
        const payment = c[7]?.v || 'cash'
        const promo = c[8]?.v || ''
        const deletedBy = c[9]?.v || ''
        const deletedAt = c[10]?.v || ''
        return { user: uname, items, subtotal, discountAmount, total, paymentMethod: payment, promoCode: promo, timestamp: ts, deletedBy, deletedAt, orderID }
      }).filter(o => o.orderID && String(o.orderID).length > 5) // Filter out invalid rows
      if (parsed.length === 0) return 0

      // 排除已結算（archives）中的訂單，避免重複顯示
      const archivedIDs = new Set(
        (archives || [])
          .flatMap(a => Array.isArray(a.orders) ? a.orders : [])
          .map(o => o.orderID)
          .filter(Boolean)
      )
      const filtered = parsed.filter(o => o.orderID && !archivedIDs.has(o.orderID))
      if (filtered.length === 0) return 0

      let added = 0
      setOrders((prev) => {
        const merged = [...prev]
        filtered.forEach(o => {
          const idx = merged.findIndex(x => x.orderID === o.orderID)
          if (idx >= 0) {
            // 保留較新欄位（例如 deleted 狀態）
            merged[idx] = { ...merged[idx], ...o }
          } else {
            merged.push(o)
            added += 1
          }
        })
        return merged
      })
      return added
    } catch (e) {
      console.warn('載入雲端訂單失敗（可能需要將試算表發佈為公開）', e)
      return 0
    }
  }

  async function loadOrdersFromApi() {
    // 期望 GAS doGet 回傳 JSON: { orders: [ { orderID, timestamp, user, items, subtotal, discountAmount, total, paymentMethod, promoCode, deletedBy, deletedAt } ] }
    const url = `${GAS_URL}?action=get`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list = Array.isArray(data?.orders) ? data.orders : []
    if (list.length === 0) return 0

    // Fallback: 若 items 為空但有 itemsStr，嘗試解析字符串（多層 fallback 應對舊資料轉換期）
    list.forEach(o => {
      if ((!o.items || o.items.length === 0) && o.itemsStr) {
        try {
          // 嘗試 JSON.parse（第 4 欄若儲存的是 JSON）
          o.items = JSON.parse(o.itemsStr)
        } catch (_) {
          // itemsStr 不是 JSON 格式，保留空陣列
          o.items = []
        }
      }
    })

    const archivedIDs = new Set(
      (archives || [])
        .flatMap(a => Array.isArray(a.orders) ? a.orders : [])
        .map(o => o.orderID)
        .filter(Boolean)
    )
    const incoming = list.filter(o => o.orderID && !archivedIDs.has(o.orderID))
    if (incoming.length === 0) return 0

    let added = 0
    setOrders((prev) => {
      const merged = [...prev]
      incoming.forEach(o => {
        const idx = merged.findIndex(x => x.orderID === o.orderID)
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...o }
        } else {
          merged.push(o)
          added += 1
        }
      })
      return merged
    })
    return added
  }


  const handleManualSync = async () => {
    try {
      const addedFromApi = await loadOrdersFromApi()
      // 無 toast 提示，靜默同步
    } catch (err) {
      console.warn('doGet 同步失敗，嘗試 gviz fallback', err)
      try {
        const addedFromSheet = await loadOrdersFromSheet()
        // 無 toast 提示，靜默同步
      } catch (err2) {
        console.warn('同步失敗', err2)
      }
    }
  }

  // 自動同步：視窗聚焦時同步（需登入後啟用）
  useEffect(() => {
    if (!user) return
    const onFocus = () => { handleManualSync() }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [user])

  const promoOptions = {
    A: { type: 'percent', value: 10 }, // 10% off
    B: { type: 'percent', value: 20 }, // 20% off
    C: { type: 'fixed', value: 20 },   // minus $20
    D: { type: 'fixed', value: 30 }    // minus $30
  }

  const menu = [
    { id: 1, name: 'Coffee', price: 50 },
    { id: 2, name: 'Tea', price: 40 },
    { id: 3, name: 'Sandwich', price: 80 },
    { id: 4, name: 'Latte', price: 70 },
    { id: 5, name: 'Cake', price: 60 },
    { id: 6, name: 'Juice', price: 55 }
  ]

  const handleLogin = (e) => {
    e.preventDefault()
    const username = e.target.username.value.trim()
    const password = e.target.password.value.trim()
    if (username && password) setUser(username)
    else alert('請輸入帳號和密碼')
  }

  const handleLogout = () => {
    setUser(null)
    try { localStorage.removeItem('user') } catch {}
  }

  // 開啟客製化視窗
  const openCustomization = (item) => {
    setSelectedItem(item)
    setSweetness('正常糖')
    setIce('正常冰')
  }

  // 加入購物車（帶客製化選項）
  const addToCartWithOptions = () => {
    if (!selectedItem) return

    setCart((prev) => {
      const existing = prev.find(
        entry => entry.item.id === selectedItem.id &&
                 entry.sweetness === sweetness &&
                 entry.ice === ice
      )
      if (existing) {
        return prev.map(entry =>
          entry.item.id === selectedItem.id && entry.sweetness === sweetness && entry.ice === ice
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      }
      return [...prev, { item: selectedItem, quantity: 1, sweetness, ice }]
    })

    // 關閉視窗
    setSelectedItem(null)
  }

  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      return prev
        .map((entry, i) => i === index ? { ...entry, quantity: entry.quantity + delta } : entry)
        .filter(entry => entry.quantity > 0)
    })
  }

  const applyPromoCode = () => {
    const code = (promoCode || '').toString().trim().toUpperCase()
    if (!code) {
      setDiscount(null)
      setPromoMessage('請選擇折扣代碼')
      return
    }
    const opt = promoOptions[code]
    if (opt) {
      setDiscount(opt)
      if (opt.type === 'percent') setPromoMessage(`已套用折扣 ${code}：${opt.value}% off`)
      else setPromoMessage(`已套用折扣 ${code}：減 $${opt.value}`)
    } else {
      setDiscount(null)
      setPromoMessage('折扣代碼無效')
    }
  }

  const subtotal = cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)
  const discountAmount = (() => {
    if (!discount) return 0
    if (discount.type === 'percent') return Math.round(subtotal * (discount.value / 100))
    return Number(discount.value) || 0
  })()
  const total = Math.max(0, subtotal - discountAmount)

  const submitOrder = async () => {
    if (cart.length === 0) { alert('購物車為空'); return }

    const itemsForPayload = cart.map(entry => ({
      ...entry.item,
      quantity: entry.quantity,
      sweetness: entry.sweetness,
      ice: entry.ice
    }))

    // 生成訂單編號：精確到毫秒 (YYYYMMDDHHMMSSmmm)
    const now = new Date()
    const orderID = computeOrderID(now)

    const payload = {
      orderID,                              // 訂單編號
      timestamp: now.toISOString(),         // 用於前端顯示和 Sheet 第一列（時間）
      user,
      items: itemsForPayload,
      subtotal,
      discountAmount,
      total,
      paymentMethod,
      promoCode: discount ? promoCode.trim().toUpperCase() : '',
      deletedBy: null,    // 初始未刪除
      deletedAt: null     // 初始未刪除
    }

    // 立即更新本地狀態（不等待網路回應）
    pushToast('已送出訂單！', 'success')
    setOrders((prev) => [...prev, payload])
    setCart([])
    setDiscount(null)
    setPromoCode('')
    setPromoMessage('')

    // 異步在背景傳送到 Google Apps Script（不阻擋 UI）
    // GAS_URL from config
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.error('背景上傳 Google Sheet 失敗:', err)
      pushToast('訂單已送出，本機保留；雲端暫時失敗', 'error')
    })
  }

  if (!user) return (
    <div className="login-container">
      <h2>員工登入</h2>
      <form onSubmit={handleLogin}>
        <input name="username" placeholder="帳號" required />
        <input name="password" type="password" placeholder="密碼" required />
        <button type="submit">登入</button>
      </form>
    </div>
  )

  // 訂單記錄頁面
  if (currentPage === 'history') {
    const handleDeleteOrder = (index) => {
      const orderToDelete = orders[index]
      if (!orderToDelete) return

      const deletedAt = new Date().toISOString()
      
      // 更新本地狀態
      setOrders((prev) => {
        const newOrders = [...prev]
        newOrders[index] = { ...newOrders[index], deleted: true, deletedBy: user, deletedAt }
        return newOrders
      })

      // 同步到 Google Sheet，使用 orderID 找到對應行更新刪除者資訊
      const deletePayload = {
        action: 'delete',
        orderID: orderToDelete.orderID || computeOrderID(orderToDelete.timestamp),
        deletedBy: user,
        deletedAt
      }

      fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(deletePayload)
      }).catch(err => {
        console.error('同步刪除狀態到 Google Sheet 失敗:', err)
        pushToast('刪除已標記，本機完成；雲端同步失敗', 'error')
      })
    }

    const sendSettlementToGas = async (settledOrders, note = '') => {
      const ts = new Date().toISOString()
      const batchId = computeSettlementID(ts)
      console.log('Settlement orders:', settledOrders)
      const subtotalSum = settledOrders.reduce((s, o) => s + Number(o.subtotal || 0), 0)
      const discountSum = settledOrders.reduce((s, o) => s + Number(o.discountAmount || 0), 0)
      const totalSum = settledOrders.reduce((s, o) => s + Number(o.total || 0), 0)
      console.log('Settlement sums:', { subtotalSum, discountSum, totalSum, count: settledOrders.length })

      const payload = {
        action: 'settlement',
        batchId,
        user,
        count: settledOrders.length,
        subtotalSum,
        discountSum,
        totalSum,
        note,
        orders: settledOrders
      }

      // 同步刪除狀態（可選）：把本地被標記 deleted 的訂單上傳 GAS
      const deletedOrders = settledOrders.filter(o => o.deleted || o.deletedAt)
      deletedOrders.forEach(o => {
        const delPayload = {
          action: 'delete',
          orderID: o.orderID || computeOrderID(o.timestamp),
          deletedBy: o.deletedBy || user,
          deletedAt: o.deletedAt || ts
        }
        fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(delPayload)
        }).catch(() => {})
      })

      // 送 Settlement 到 GAS（no-cors 背景）
      fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('結算上傳失敗', err))

      return { batchId }
    }

    const handleSettleOrders = async (indicesToSettle) => {
      const settled = indicesToSettle.map(i => orders[i]).filter(Boolean)
      if (settled.length === 0) return

      await sendSettlementToGas(settled)

      // archive locally
      setArchives((prev) => [...prev, { id: Date.now(), timestamp: new Date().toISOString(), orders: settled }])
      // remove settled orders from active orders
      setOrders((prev) => prev.filter((_, idx) => !indicesToSettle.includes(idx)))

      // 同步更新 localStorage：orders 清空相對應項目
      try {
        const remaining = orders.filter((_, idx) => !indicesToSettle.includes(idx))
        localStorage.setItem('orders', JSON.stringify(remaining))
      } catch {}
    }

    const handleSettleAllOrders = async () => {
      if (!orders || orders.length === 0) return
      const all = [...orders]

      await sendSettlementToGas(all)

      // archive and clear locally
      setArchives((prev) => [...prev, { id: Date.now(), timestamp: new Date().toISOString(), orders: all }])
      setOrders([])
      try { localStorage.setItem('orders', JSON.stringify([])) } catch {}
    }

    return <OrderHistory orders={orders} onBack={() => setCurrentPage('menu')} onDeleteOrder={handleDeleteOrder} onSettleOrders={handleSettleOrders} onSettleAllOrders={handleSettleAllOrders} />
  }

  // 菜單與購物車頁面
  return (
    <div className="container">
      <div className="header-with-nav">
        <h2 className="header">歡迎 {user}</h2>
        <div style={{display:'flex', gap:8}}>
          <button className="btn-nav-history" onClick={() => setCurrentPage('history')}>📋 訂單記錄</button>
          <button className="btn-nav-history" onClick={handleLogout}>🚪 登出</button>
        </div>
      </div>
      {/* <div className="debug">DEBUG: user={String(user)} subtotal={subtotal} items={cart.length} discountAmount={discount ? (discount.type==='percent'?Math.round(subtotal*(discount.value/100)):discount.value):0}</div> */}

      {/* Toasts */}
      <ToastContainer toasts={toasts} />

      <div className="layout">
        {/* 左邊：格狀菜單 */}
        <div className="column">
          <h3 className="section-title">菜單</h3>
          <div className="menu-grid">
            {menu.map(item => (
              <div
                key={item.id}
                className="menu-card"
                onClick={() => openCustomization(item)}  // 整個卡片可點
              >
                <div className="menu-card-name">{item.name}</div>
                <div className="menu-card-price">${item.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 右邊：購物車 */}
        <div className="column">
          <h3 className="section-title">目前餐點 (購物車)</h3>
          {cart.length === 0 ? (
            <div className="empty-cart">購物車為空</div>
          ) : (
            <ul className="cart-list">
              {(() => {
                const original = cart.map((entry, idx) => ({...entry, __idx: idx}))
                const nameOrder = []
                original.forEach(e => { const n = e.item?.name; if (n && !nameOrder.includes(n)) nameOrder.push(n) })
                return original
                  .sort((a,b) => {
                    const an = a.item?.name || ''
                    const bn = b.item?.name || ''
                    const ai = nameOrder.indexOf(an)
                    const bi = nameOrder.indexOf(bn)
                    if (ai !== bi) return ai - bi
                    return a.__idx - b.__idx
                  })
                  .map((entry, index) => (
                <li key={index} className="cart-item">
                  <span>
                    {entry.item.name} x{entry.quantity} • ${entry.item.price}<br />
                    <small>{entry.sweetness} ・ {entry.ice}</small>
                  </span>
                  <div className="quantity-controls">
                    <button className="quantity-btn quantity-btn-minus" onClick={() => updateQuantity(index, -1)}>−</button>
                    <span className="quantity">{entry.quantity}</span>
                    <button className="quantity-btn quantity-btn-plus" onClick={() => updateQuantity(index, 1)}>+</button>
                  </div>
                </li>
                  ))
              })()}
            </ul>
          )}

          <div className="checkout-box">
            <div>小計: ${subtotal}</div>

            <div className="form-row">
              <label>折扣代碼</label>
              <select value={promoCode} onChange={(e) => setPromoCode(e.target.value)}>
                <option value="">-- 選擇 --</option>
                {Object.keys(promoOptions).map(code => {
                  const opt = promoOptions[code]
                  const desc = opt.type === 'percent' ? `${opt.value}% off` : `減 $${opt.value}`
                  return <option key={code} value={code}>{code} - {desc}</option>
                })}
              </select>
              <button className="btn-apply" type="button" onClick={applyPromoCode}>套用</button>
            </div>
            {promoMessage && (
              <div className={`message ${discount ? 'success' : 'error'}`}>{promoMessage}</div>
            )}

            <div className="form-row">
              <label>付款方式</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">現金</option>
                <option value="card">信用卡</option>
                <option value="linepay">Line Pay</option>
              </select>
            </div>

            <div className="total">總計: ${total}</div>
            <button className="btn-submit" onClick={submitOrder}>送出訂單</button>
          </div>
        </div>
      </div>

      {/* 客製化彈出視窗 */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{selectedItem.name} - ${selectedItem.price}</div>

            <div className="options-group">
              <div className="options-title">甜度</div>
              <div className="options-buttons">
                {['無糖', '少糖', '半糖', '正常糖'].map(opt => (
                  <button
                    key={opt}
                    className={`option-btn ${sweetness === opt ? 'selected' : ''}`}
                    onClick={() => setSweetness(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="options-group">
              <div className="options-title">冰塊</div>
              <div className="options-buttons">
                {['去冰', '少冰', '正常冰'].map(opt => (
                  <button
                    key={opt}
                    className={`option-btn ${ice === opt ? 'selected' : ''}`}
                    onClick={() => setIce(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-buttons">
              <button className="modal-btn-cancel" onClick={() => setSelectedItem(null)}>取消</button>
              <button className="modal-btn-add" onClick={addToCartWithOptions}>加入購物車</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}