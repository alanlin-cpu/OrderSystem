import React, { useState } from 'react'

export default function App() {
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])

  // numeric discount (kept for compatibility with tests)
  const [discount, setDiscount] = useState(0)

  // promo code logic
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [promoAppliedAmount, setPromoAppliedAmount] = useState(0)
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

  const [paymentMethod, setPaymentMethod] = useState('cash')

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
      const GAS_URL = 'YOUR_GOOGLE_APP_SCRIPT_URL' // replace with your GAS web app URL
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
    <div style={{ padding: 20 }}>
      <h2>員工登入</h2>
      <form onSubmit={handleLogin}>
        <div><input name="username" placeholder="帳號" required /></div>
        <div><input name="password" type="password" placeholder="密碼" required /></div>
        <div style={{ marginTop: 8 }}><button type="submit">登入</button></div>
      </form>
    </div>
  )

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>歡迎 {user}</h2>

      <section>
        <h3>菜單</h3>
        <ul>
          {menu.map(item => (
            <li key={item.id} style={{ marginBottom: 6 }}>
              {item.name} - ${item.price}
              <button style={{ marginLeft: 8 }} onClick={() => addToCart(item)}>加入</button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>目前餐點 (購物車)</h3>
        {cart.length === 0 ? <div>購物車為空</div> : (
          <ul>
            {cart.map((it, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{it.name} - ${it.price}
                <button style={{ marginLeft: 8 }} onClick={() => removeFromCart(i)}>移除</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 12 }}>
          <div>小計: ${subtotal}</div>

          <div style={{ marginTop: 6 }}>折扣 (數字): <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" /></div>

          <div style={{ marginTop: 6 }}>
            折扣碼: <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="輸入折扣碼如 SAVE10" />
            <button onClick={applyPromoCode} style={{ marginLeft: 8 }}>套用折扣碼</button>
            {promoMessage && <div style={{ marginTop: 6 }}>{promoMessage}</div>}
          </div>

          <div style={{ marginTop: 6 }}>支付方式: 
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">現金</option>
              <option value="card">信用卡</option>
              <option value="mobile">行動支付</option>
            </select>
          </div>

          <div style={{ marginTop: 6 }}>總計: <strong>${total}</strong></div>

          <div style={{ marginTop: 12 }}><button onClick={submitOrder}>送出訂單</button></div>
        </div>
      </section>
    </div>
  )
}