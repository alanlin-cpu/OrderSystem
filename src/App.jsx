import React, { useState } from 'react'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])  // { item, quantity, sweetness, ice }

  const [discount, setDiscount] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  // 客製化彈出視窗狀態
  const [selectedItem, setSelectedItem] = useState(null)
  const [sweetness, setSweetness] = useState('正常糖')
  const [ice, setIce] = useState('正常冰')

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

    const payload = {
      user,
      items: itemsForPayload,
      subtotal,
      discountAmount,
      discountType: discount ? discount.type : null,
      promoCode: discount ? promoCode.trim().toUpperCase() : '',
      total,
      paymentMethod,
      timestamp: new Date().toISOString()
    }

    try {
      const GAS_URL = 'YOUR_GOOGLE_APP_SCRIPT_URL'
      await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      alert('已送出訂單!')
      setCart([])
      setDiscount(0)
      setPromoCode('')
      setPromoMessage('')
    } catch (err) {
    console.error(err)
      alert('送單失敗，請檢查網路/後端設定')
    }
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

  return (
    <div className="container">
      <h2 className="header">歡迎 {user}</h2>

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
                {Object.keys(promoOptions).map(code => (
                  <option key={code} value={code}>{code} - 減 {promoOptions[code]} 元</option>
                ))}
              </select>
              <button className="btn-apply" type="button" onClick={applyPromoCode}>套用</button>
            </div>
            {promoMessage && (
              <div className={`message ${discount > 0 ? 'success' : 'error'}`}>{promoMessage}</div>
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