import React, { useState } from 'react'
import ToastContainer from './components/Toast'
import './App.css'
import OrderHistory from './OrderHistory'
import Menu from './Menu(dam).jsx'
import { PromoSelector, PaymentSelector } from './components/CheckoutOptions'
import { useToast } from './hooks/useToast'
import { useAuth } from './hooks/useAuth'
import { useCart } from './hooks/useCart'
import { useOrders } from './hooks/useOrders'

export default function App() {
  const [currentPage, setCurrentPage] = useState('menu') // 'menu' or 'history'

  // 使用自定義 Hooks
  const { toasts, pushToast } = useToast()
  const { user, handleLogin: login, handleLogout } = useAuth(pushToast)
  const {
    cart,
    discount,
    promoCode,
    promoMessage,
    paymentAmounts,
    subtotal,
    discountAmount,
    total,
    handleAddItem,
    updateQuantity,
    setPromoCode,
    setDiscount,
    setPromoMessage,
    setPaymentAmounts,
    clearCart
  } = useCart()
  
  const {
    orders,
    syncFailedOrders,
    submitOrder: submitOrderToService,
    deleteOrder,
    settleOrders,
    settleAllOrders,
    retryUpload
  } = useOrders(user, pushToast)

  // 登入處理
  const handleLogin = async (e) => {
    e.preventDefault()
    const username = e.target.username.value.trim()
    const password = e.target.password.value.trim()
    await login(username, password)
  }

  // 提交訂單
  const submitOrder = async () => {
    if (cart.length === 0) { 
      alert('購物車為空')
      return 
    }

    // 驗證實收金額
    const totalReceived = Object.values(paymentAmounts)
      .reduce((sum, amt) => sum + Number(amt || 0), 0)
    
    if (totalReceived < total) {
      pushToast(
        `實收金額不足！應收 $${total}，實收 $${totalReceived}，差額 $${total - totalReceived}`, 
        'error', 
        5000
      )
      return
    }

    const itemsForPayload = cart
      .map(entry => ({
        ...entry.item,
        quantity: entry.quantity,
        customOptions: entry.customOptions
      }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

    const changeAmount = totalReceived > 0 
      ? Math.max(0, totalReceived - total) 
      : 0
    
    const paymentBreakdown = Object.entries(paymentAmounts)
      .map(([method, amt]) => `${method}:${Number(amt || 0)}`)
      .join('; ')

    const orderData = {
      items: itemsForPayload,
      subtotal,
      discountAmount,
      total,
      paymentMethod: paymentBreakdown || Object.keys(paymentAmounts).join(', '),
      paymentAmounts,
      receivedAmount: totalReceived,
      changeAmount,
      promoCode: discount ? promoCode.trim().toUpperCase() : ''
    }

    await submitOrderToService(orderData)
    clearCart()
  }

  // 登入頁面
  if (!user) {
    return (
      <>
        <div className="login-container">
          <h2>員工登入</h2>
          <form onSubmit={handleLogin}>
            <input name="username" placeholder="帳號" required />
            <input name="password" type="password" placeholder="密碼" required />
            <button type="submit">登入</button>
          </form>
        </div>
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  // 訂單記錄頁面
  if (currentPage === 'history') {
    return (
      <>
        <OrderHistory
          orders={orders}
          user={user}
          onBack={() => setCurrentPage('menu')}
          onDeleteOrder={deleteOrder}
          onSettleOrders={settleOrders}
          onSettleAllOrders={settleAllOrders}
          onRetryUpload={retryUpload}
          syncFailedOrders={syncFailedOrders}
          pushToast={pushToast}
        />
        <ToastContainer toasts={toasts} />
      </>
    )
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
        <Menu onAddItem={handleAddItem} />

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
                    {entry.item.name} x{entry.quantity} • ${entry.item.price}<br />
                    {entry.customOptions && <small>{entry.customOptions}</small>}
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

            <PromoSelector
              selectedPromo={promoCode}
              onPromoChange={({ code, discount, message }) => {
                setPromoCode(code)
                setDiscount(discount)
                setPromoMessage(message)
              }}
              message={promoMessage}
            />

            <PaymentSelector
              paymentAmounts={paymentAmounts}
              onPaymentAmountsChange={setPaymentAmounts}
              total={total}
            />

            <div className="total">總計: ${total}</div>
            <button className="btn-submit" onClick={submitOrder}>送出訂單</button>
          </div>
        </div>
      </div>

    </div>
  )
}