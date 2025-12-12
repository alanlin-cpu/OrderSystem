import React, { useState } from 'react'

export default function OrderHistory({ orders, onBack, onDeleteOrder }) {
  const [searchUser, setSearchUser] = useState('')
  const [filterPayment, setFilterPayment] = useState('')

  // 篩選訂單（只顯示未刪除的訂單搜尋結果，但表格顯示所有訂單）
  const filtered = orders.filter(order => {
    const userMatch = !searchUser || order.user.toLowerCase().includes(searchUser.toLowerCase())
    const paymentMatch = !filterPayment || order.paymentMethod === filterPayment
    return userMatch && paymentMatch
  })

  // 刪除訂單（軟刪除，標記為已刪除）
  const deleteOrder = (index) => {
    if (confirm('確定要刪除此訂單？此訂單記錄將保留但顯示為已刪除')) {
      onDeleteOrder(index)
    }
  }

  // 統計：只計算未刪除的訂單
  const activeOrders = filtered.filter(o => !o.deleted)

  return (
    <div className="order-history-container">
      <div className="order-history-header">
        <h2>訂單記錄</h2>
        <button className="btn-back" onClick={onBack}>← 返回</button>
      </div>

      {/* 搜尋與篩選 */}
      <div className="order-filters">
        <div className="filter-row">
          <label>員工名稱</label>
          <input
            type="text"
            placeholder="搜尋員工..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <label>付款方式</label>
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
            <option value="">-- 全部 --</option>
            <option value="cash">現金</option>
            <option value="card">信用卡</option>
            <option value="linepay">Line Pay</option>
          </select>
        </div>
        <div className="filter-result">
          共 {filtered.length} 筆記錄 ({activeOrders.length} 筆有效訂單)
        </div>
      </div>

      {/* 訂單表格 */}
      {filtered.length === 0 ? (
        <div className="empty-orders">查無訂單</div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>員工</th>
                <th>品項</th>
                <th>小計</th>
                <th>折扣</th>
                <th>總計</th>
                <th>付款</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => (
                <tr key={idx} className={`order-row ${order.deleted ? 'deleted' : ''}`}>
                  <td className="time">{new Date(order.timestamp).toLocaleString('zh-TW')}</td>
                  <td className="user">{order.user} {order.deleted && <span className="deleted-badge">【已刪除】</span>}</td>
                  <td className="items">
                    <details>
                      <summary>{order.items.length} 項</summary>
                      <ul className="item-details">
                        {order.items.map((item, i) => (
                          <li key={i}>
                            {item.name} × {item.quantity} (${item.price * item.quantity})
                            {item.sweetness && <span className="option"> • {item.sweetness}</span>}
                            {item.ice && <span className="option"> • {item.ice}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="subtotal">${order.subtotal}</td>
                  <td className="discount">
                    {order.discountAmount > 0 ? (
                      <span className="discount-badge">
                        -${order.discountAmount}
                        {order.promoCode && ` (${order.promoCode})`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="total">${order.total}</td>
                  <td className="payment">{order.paymentMethod === 'cash' ? '現金' : order.paymentMethod === 'card' ? '信用卡' : 'Line Pay'}</td>
                  <td className="actions">
                    {!order.deleted && (
                      <button className="btn-delete" onClick={() => deleteOrder(idx)}>🗑 刪除</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 統計 */}
      {activeOrders.length > 0 && (
        <div className="order-stats">
          <div className="stat-item">
            <span className="stat-label">總收入</span>
            <span className="stat-value">${activeOrders.reduce((sum, o) => sum + o.total, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">總折扣</span>
            <span className="stat-value">-${activeOrders.reduce((sum, o) => sum + o.discountAmount, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">訂單數</span>
            <span className="stat-value">{activeOrders.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
