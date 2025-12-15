import React, { useState } from 'react'

export const menuItems = [
  { id: 1, name: 'Coffee', price: 50 },
  { id: 2, name: 'Tea', price: 40 },
  { id: 3, name: 'Sandwich', price: 80 },
  { id: 4, name: 'Latte', price: 70 },
  { id: 5, name: 'Cake', price: 60 },
  { id: 6, name: 'Juice', price: 55 }
]

// 客製化選項配置，集中管理
export const sweetnessOptions = ['無糖', '少糖', '半糖', '正常糖']
export const iceOptions = ['去冰', '少冰', '正常冰']

export default function Menu({ menu = menuItems, onAddItem }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [sweetness, setSweetness] = useState(sweetnessOptions[sweetnessOptions.length - 1])
  const [ice, setIce] = useState(iceOptions[iceOptions.length - 1])

  const openCustomization = (item) => {
    setSelectedItem(item)
    setSweetness(sweetnessOptions[sweetnessOptions.length - 1])
    setIce(iceOptions[iceOptions.length - 1])
  }

  const addToCartWithOptions = () => {
    if (!selectedItem || !onAddItem) return
    onAddItem({ item: selectedItem, sweetness, ice })
    setSelectedItem(null)
  }

  return (
    <>
      <div className="column">
        <h3 className="section-title">菜單</h3>
        <div className="menu-grid">
          {menu.map(item => (
            <div
              key={item.id}
              className="menu-card"
              onClick={() => openCustomization(item)}
            >
              <div className="menu-card-name">{item.name}</div>
              <div className="menu-card-price">${item.price}</div>
            </div>
          ))}
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
                {sweetnessOptions.map(opt => (
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
                {iceOptions.map(opt => (
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
    </>
  )
}
