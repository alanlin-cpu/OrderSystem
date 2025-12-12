import React, { useState } from 'react'
import './App.css'  // 導入 CSS

export default function App() {
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [promoAppliedAmount, setPromoAppliedAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const validCodes = { SAVE10: 10, SAVE20: 20 }

  const applyPromoCode = () => {
    const code = promoCode.trim().toUpperCase()
    if (validCodes[code]) {
      setPromoAppliedAmount(validCodes[code])
      setPromoMessage(`已套用折扣碼 ${code}：減 ${validCodes[code]} 元`)
      setDiscount(validCodes[code])
    } else {
      setPromoAppliedAmount(0)
      setPromoMessage('折扣碼無效')
    }
  }

  const menu = [
    { id: 1, name: 'Coffee', price: 50 },
    { id: 2, name: 'Tea', price: 40 },
    { id: 3, name: 'Sandwich', price: 80 }
  ]

  const handleLogin = (e) => {
    e.preventDefault()
    const username = e.target.username.value.trim()
    const password = e.target.password.value.trim()
    if (username && password) setUser(username)
    else alert('請輸入帳號和密碼')
  }

  const addToCart = (item) => setCart((prev) => [...prev, item])
  const removeFromCart = (index) => setCart((prev) => prev.filter((_, i) => i !== index))

  const subtotal = cart.reduce((s, it) => s + it.price, 0)
  const total = Math.max(0, subtotal - Number(discount || 0))

  const submitOrder = async () => {
    if (!cart.length) { alert('購物車為空'); return }

    const payload = {
      user,
      items: cart,
      subtotal,
      discount: Number(discount || 0),
      promoCode: promoAppliedAmount ? promoCode.trim().toUpperCase() : '',
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
      setPromoAppliedAmount(0)
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
        {/* 左邊：菜單 */}
        <div className="column">
          <h3 className="section-title">菜單</h3>
          <ul className="menu-list">
            {menu.map(item => (
              <li key={item.id} className="menu-item">
                <span>{item.name} - ${item.price}</span>
                <button className="btn-add" onClick={() => addToCart(item)}>加入</button>
              </li>
            ))}
          </ul>
        </div>

        {/* 右邊：購物車 */}
        <div className="column">
          <h3 className="section-title">目前餐點 (購物車)</h3>
          {cart.length === 0 ? (
            <div className="empty-cart">購物車為空</div>
          ) : (
            <ul className="cart-list">
              {cart.map((it, i) => (
                <li key={i} className="cart-item">
                  <span>{it.name} - ${it.price}</span>
                  <button className="btn-remove" onClick={() => removeFromCart(i)}>移除</button>
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