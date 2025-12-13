import React, { useState, useEffect } from 'react'
import './App.css'
import OrderHistory from './OrderHistory'

export default function App() {
  const SHEET_ID = '1m2TkzWJb1U-jTm6JKDAnmM-WsHY1NbMlxQwVa_q-jx8'
  const SHEET_NAME = 'Orders'

  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])  // { item, quantity, sweetness, ice }
  const [orders, setOrders] = useState([])
  const [archives, setArchives] = useState([]) // settlement archives
  const [currentPage, setCurrentPage] = useState('menu') // 'menu' or 'history'

  const [discount, setDiscount] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  // 客製化彈出視窗狀態
  const [selectedItem, setSelectedItem] = useState(null)
  const [sweetness, setSweetness] = useState('正常糖')
  const [ice, setIce] = useState('正常冰')

  const computeOrderID = (tsInput) => {
    try {
      const d = tsInput ? new Date(tsInput) : new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}${m}${day}${hh}${mm}`
    } catch {
      return `${Date.now()}`
    }
  }

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
        // 若本地沒有訂單，嘗試從 Google Sheet 載入
        loadOrdersFromSheet()
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
      const parsed = rows.map(r => {
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
      })
      if (parsed.length > 0) setOrders(parsed)
    } catch (e) {
      console.warn('載入雲端訂單失敗（可能需要將試算表發佈為公開）', e)
    }
  }

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

    // 生成訂單編號: 日期時間組成 (YYYYMMDDHHMM)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const date = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const orderID = `${year}${month}${date}${hours}${minutes}`

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
    alert('已送出訂單!')
    setOrders((prev) => [...prev, payload])
    setCart([])
    setDiscount(null)
    setPromoCode('')
    setPromoMessage('')

    // 異步在背景傳送到 Google Apps Script（不阻擋 UI）
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyPIeUwfSrcA6r_ULVVVzITfsJj02-CUaWeGLxQK8IfKZZTkjy6uCZQoCxTko2gv_Qf/exec'
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.error('背景上傳 Google Sheet 失敗:', err)
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
      const GAS_URL = 'https://script.google.com/macros/s/AKfycbyPIeUwfSrcA6r_ULVVVzITfsJj02-CUaWeGLxQK8IfKZZTkjy6uCZQoCxTko2gv_Qf/exec'
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
      })
    }

    const handleSettleOrders = (indicesToSettle) => {
      // collect settled orders from current orders
      const settled = indicesToSettle.map(i => orders[i]).filter(Boolean)
      if (settled.length === 0) return
      // archive settled orders
      setArchives((prev) => [...prev, { id: Date.now(), timestamp: new Date().toISOString(), orders: settled }])
      // remove settled orders from active orders so they no longer show
      setOrders((prev) => prev.filter((_, idx) => !indicesToSettle.includes(idx)))
    }

    const handleSettleAllOrders = () => {
      // archive all orders (including ones marked deleted) and clear the orders list
      if (!orders || orders.length === 0) return
      const all = [...orders]
      setArchives((prev) => [...prev, { id: Date.now(), timestamp: new Date().toISOString(), orders: all }])
      setOrders([])
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
              {cart.map((entry, index) => (
                <li key={index} className="cart-item">
                  <span>
                    {entry.item.name} - ${entry.item.price} × {entry.quantity}<br />
                    <small>{entry.sweetness} ・ {entry.ice}</small>
                  </span>
                  <div className="quantity-controls">
                    <button className="quantity-btn quantity-btn-minus" onClick={() => updateQuantity(index, -1)}>−</button>
                    <span className="quantity">{entry.quantity}</span>
                    <button className="quantity-btn quantity-btn-plus" onClick={() => updateQuantity(index, 1)}>+</button>
                  </div>
                </li>
              ))}
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