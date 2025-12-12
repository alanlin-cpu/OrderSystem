import React, { useState } from 'react'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  
  // 購物車改成物件陣列：{ item, quantity }
  const [cart, setCart] = useState([])
  
  const [discount, setDiscount] = useState(0)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const validCodes = { SAVE10: 10, SAVE20: 20 }

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

  // 加入購物車：同品項則增加數量
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(entry => entry.item.id === item.id)
      if (existing) {
        return prev.map(entry =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  // 改變數量
  const updateQuantity = (id, delta) => {
    setCart((prev) => {
      return prev
        .map(entry => 
          entry.item.id === id
            ? { ...entry, quantity: entry.quantity + delta }
            : entry
        )
        .filter(entry => entry.quantity > 0)  // 自動移除 quantity <= 0 的項目
    })
  }

  const applyPromoCode = () => {
    const code = promoCode.trim().toUpperCase()
    if (validCodes[code]) {
      setDiscount(validCodes[code])
      setPromoMessage(`已套用折扣碼 ${code}：減 ${validCodes[code]} 元`)
    } else {
      setDiscount(0)
      setPromoMessage('折扣碼無效')
    }
  }

  // 計算小計與總計
  const subtotal = cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)
  const total = Math.max(0, subtotal - Number(discount))

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('購物車為空')
      return
    }

    const itemsForPayload = cart.map(entry => ({
      ...entry.item,
      quantity: entry.quantity
    }))

    const payload = {
      user,
      items: itemsForPayload,
      subtotal,
      discount: Number(discount),
      promoCode: discount > 0 ? promoCode.trim().toUpperCase() : '',
      total,
      paymentMethod,
      timestamp: new Date().toISOString()
    }

    try {
      const GAS_URL = 'YOUR_GOOGLE_APP_SCRIPT_URL'
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
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
              <div key={item.id} className="menu-card" onClick={() => addToCart(item)}>
                <div className="menu-card-name">{item.name}</div>
                <div className="menu-card-price">${item.price}</div>
                <button className="btn-add">加入購物車</button>
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
              {cart.map((entry) => (
                <li key={entry.item.id} className="cart-item">
                  <span>{entry.item.name} - ${entry.item.price} × {entry.quantity}</span>
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn quantity-btn-minus"
                      onClick={() => updateQuantity(entry.item.id, -1)}
                    >
                      −
                    </button>
                    <span className="quantity">{entry.quantity}</span>
                    <button
                      className="quantity-btn quantity-btn-plus"
                      onClick={() => updateQuantity(entry.item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="checkout-box">
            <div>小計: ${subtotal}</div>

            <div className="form-row">
              <label>折扣 (數字):</label>
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" />
            </div>

            <div className="form-row">
              <label>折扣碼:</label>
              <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="如 SAVE10" />
              <button className="btn-apply" onClick={applyPromoCode}>套用</button>
            </div>
            {promoMessage && (
              <div className={`message ${promoMessage.includes('無效') ? 'error' : 'success'}`}>
                {promoMessage}
              </div>
            )}

            <div className="form-row">
              <label>支付方式:</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">現金</option>
                <option value="card">信用卡</option>
                <option value="mobile">行動支付</option>
              </select>
            </div>

            <div className="total">總計: ${total}</div>

            <button className="btn-submit" onClick={submitOrder}>送出訂單</button>
          </div>
        </div>
      </div>
    </div>
  )
}