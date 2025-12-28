import { useState } from 'react'
import { promoOptions } from '../components/CheckoutOptions'

/**
 * 購物車管理的自定義 Hook
 * 管理購物車商品、數量、折扣和付款方式
 */
export function useCart() {
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [paymentAmounts, setPaymentAmounts] = useState({})

  // 加入購物車
  const handleAddItem = ({ item, customOptions }) => {
    if (!item) return
    
    setCart((prev) => {
      const existing = prev.find(
        entry => entry.item.id === item.id &&
                 entry.item.price === item.price &&
                 entry.customOptions === customOptions
      )
      
      if (existing) {
        return prev.map(entry =>
          entry.item.id === item.id && 
          entry.item.price === item.price && 
          entry.customOptions === customOptions
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      }
      
      return [...prev, { item, quantity: 1, customOptions }]
    })
  }

  // 更新商品數量
  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      return prev
        .map((entry, i) => 
          i === index 
            ? { ...entry, quantity: entry.quantity + delta } 
            : entry
        )
        .filter(entry => entry.quantity > 0)
    })
  }

  // 套用折扣代碼
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
      if (opt.type === 'percent') {
        setPromoMessage(`已套用折扣 ${code}：${opt.value}% off`)
      } else {
        setPromoMessage(`已套用折扣 ${code}：減 $${opt.value}`)
      }
    } else {
      setDiscount(null)
      setPromoMessage('折扣代碼無效')
    }
  }

  // 計算小計
  const subtotal = cart.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity, 
    0
  )

  // 計算折扣金額
  const discountAmount = (() => {
    if (!discount) return 0
    if (discount.type === 'percent') {
      return Math.round(subtotal * (discount.value / 100))
    }
    return Number(discount.value) || 0
  })()

  // 計算總計
  const total = Math.max(0, subtotal - discountAmount)

  // 清空購物車
  const clearCart = () => {
    setCart([])
    setDiscount(null)
    setPromoCode('')
    setPromoMessage('')
    setPaymentAmounts({})
  }

  return {
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
    applyPromoCode,
    clearCart
  }
}
