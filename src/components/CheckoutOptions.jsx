import React from 'react'

// 折扣選項配置
export const promoOptions = {
  A: { type: 'percent', value: 10 }, // 10% off
  B: { type: 'percent', value: 20 }, // 20% off
  C: { type: 'fixed', value: 20 },   // minus $20
  D: { type: 'fixed', value: 30 }    // minus $30
}

// 付款方式選項配置
export const paymentOptions = [
  { value: 'cash', label: '現金', icon: '💵' },
  { value: 'card', label: '信用卡', icon: '💳' },
  { value: 'linepay', label: 'Line Pay', icon: '💲' }
]

// 折扣選擇器組件
export function PromoSelector({ selectedPromo, onPromoChange, message }) {
  const handleSelect = (code) => {
    if (code === '') {
      onPromoChange({ code: '', discount: null, message: '' })
    } else {
      const opt = promoOptions[code]
      const msg = opt.type === 'percent' 
        ? `已套用折扣 ${code}：${opt.value}% off` 
        : `已套用折扣 ${code}：減 $${opt.value}`
      onPromoChange({ code, discount: opt, message: msg })
    }
  }

  return (
    <div className="selection-group">
      <label className="selection-label">折扣代碼</label>
      <div className="selection-buttons">
        <button
          className={`selection-btn ${!selectedPromo ? 'selected' : ''}`}
          onClick={() => handleSelect('')}
        >
          無折扣
        </button>
        {Object.keys(promoOptions).map(code => {
          const opt = promoOptions[code]
          const desc = opt.type === 'percent' ? `${opt.value}% off` : `減 $${opt.value}`
          return (
            <button
              key={code}
              className={`selection-btn ${selectedPromo === code ? 'selected' : ''}`}
              onClick={() => handleSelect(code)}
            >
              {code}<br/><small>{desc}</small>
            </button>
          )
        })}
      </div>
      {message && (
        <div className={`message ${selectedPromo ? 'success' : 'error'}`}>{message}</div>
      )}
    </div>
  )
}

// 付款方式選擇器組件
export function PaymentSelector({ selectedPayment, onPaymentChange }) {
  return (
    <div className="selection-group">
      <label className="selection-label">付款方式</label>
      <div className="selection-buttons">
        {paymentOptions.map(option => (
          <button
            key={option.value}
            className={`selection-btn ${selectedPayment === option.value ? 'selected' : ''}`}
            onClick={() => onPaymentChange(option.value)}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
