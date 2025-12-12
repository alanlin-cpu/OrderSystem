import React, { useState } from 'react'

export default function OrderHistory({ orders, onBack, onUpdateOrder, onDeleteOrder }) {
  const [searchUser, setSearchUser] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editedOrder, setEditedOrder] = useState(null)

  // 篩選訂單
  const filtered = orders.filter(order => {
    const userMatch = !searchUser || order.user.toLowerCase().includes(searchUser.toLowerCase())
    const paymentMatch = !filterPayment || order.paymentMethod === filterPayment
    return userMatch && paymentMatch
  })

  // 開始編輯
  const startEdit = (index) => {
    const actualIndex = orders.findIndex((o, i) => filtered[index] === o)
    setEditingIndex(actualIndex)
    setEditedOrder(JSON.parse(JSON.stringify(orders[actualIndex])))
  }

  // 保存編輯
  const saveEdit = () => {
    if (editingIndex !== null && editedOrder) {
      onUpdateOrder(editingIndex, editedOrder)
      setEditingIndex(null)
      setEditedOrder(null)
    }
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingIndex(null)
    setEditedOrder(null)
  }

  // 刪除訂單
  const deleteOrder = (index) => {
    if (confirm('確定要刪除此訂單？')) {
      const actualIndex = orders.findIndex((o, i) => filtered[index] === o)
      onDeleteOrder(actualIndex)
    }
  }

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
          共 {filtered.length} 筆訂單
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
              {filtered.map((order, idx) => {
                const isEditing = editingIndex === orders.indexOf(order)
                const displayOrder = isEditing ? editedOrder : order
                return (
                  <tr key={idx} className={`order-row ${isEditing ? 'editing' : ''}`}>
                    <td className="time">{new Date(displayOrder.timestamp).toLocaleString('zh-TW')}</td>
                    <td className="user">{displayOrder.user}</td>
                    <td className="items">
                      <details>
                        <summary>{displayOrder.items.length} 項</summary>
                        <ul className="item-details">
                          {displayOrder.items.map((item, i) => (
                            <li key={i}>
                              {item.name} × {item.quantity} (${item.price * item.quantity})
                              {item.sweetness && <span className="option"> • {item.sweetness}</span>}
                              {item.ice && <span className="option"> • {item.ice}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td className="subtotal">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editedOrder.subtotal} 
                          onChange={(e) => setEditedOrder({...editedOrder, subtotal: Number(e.target.value)})}
                          className="edit-input"
                        />
                      ) : (
                        `$${displayOrder.subtotal}`
                      )}
                    </td>
                    <td className="discount">
                      {isEditing ? (
                        <div className="edit-discount">
                          <input 
                            type="number" 
                            value={editedOrder.discountAmount} 
                            onChange={(e) => setEditedOrder({...editedOrder, discountAmount: Number(e.target.value)})}
                            className="edit-input"
                            placeholder="折扣金額"
                          />
                          <select 
                            value={editedOrder.promoCode || ''} 
                            onChange={(e) => setEditedOrder({...editedOrder, promoCode: e.target.value})}
                            className="edit-input"
                          >
                            <option value="">無</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      ) : (
                        (displayOrder.discountAmount > 0 ? (
                          <span className="discount-badge">
                            -${displayOrder.discountAmount}
                            {displayOrder.promoCode && ` (${displayOrder.promoCode})`}
                          </span>
                        ) : (
                          '-'
                        ))
                      )}
                    </td>
                    <td className="total">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editedOrder.total} 
                          onChange={(e) => setEditedOrder({...editedOrder, total: Number(e.target.value)})}
                          className="edit-input"
                        />
                      ) : (
                        `$${displayOrder.total}`
                      )}
                    </td>
                    <td className="payment">
                      {isEditing ? (
                        <select 
                          value={editedOrder.paymentMethod} 
                          onChange={(e) => setEditedOrder({...editedOrder, paymentMethod: e.target.value})}
                          className="edit-input"
                        >
                          <option value="cash">現金</option>
                          <option value="card">信用卡</option>
                          <option value="linepay">Line Pay</option>
                        </select>
                      ) : (
                        (displayOrder.paymentMethod === 'cash' ? '現金' : displayOrder.paymentMethod === 'card' ? '信用卡' : 'Line Pay')
                      )}
                    </td>
                    <td className="actions">
                      {isEditing ? (
                        <>
                          <button className="btn-save" onClick={saveEdit}>✓ 保存</button>
                          <button className="btn-cancel" onClick={cancelEdit}>✗ 取消</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-edit" onClick={() => startEdit(idx)}>✎ 編輯</button>
                          <button className="btn-delete" onClick={() => deleteOrder(idx)}>🗑 刪除</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 統計 */}
      {filtered.length > 0 && (
        <div className="order-stats">
          <div className="stat-item">
            <span className="stat-label">總收入</span>
            <span className="stat-value">${filtered.reduce((sum, o) => sum + o.total, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">總折扣</span>
            <span className="stat-value">-${filtered.reduce((sum, o) => sum + o.discountAmount, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">訂單數</span>
            <span className="stat-value">{filtered.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
