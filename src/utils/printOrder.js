/**
 * 訂單列印工具 - Windows 11 專用
 */

/**
 * 列印 JSON 格式訂單
 */
export function printOrderJSON(orderData) {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    alert('請允許彈出視窗以便列印')
    return
  }

  const jsonString = JSON.stringify(orderData, null, 2)
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>訂單 JSON - ${orderData.orderID || '未知'}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .json-container {
          background: #f5f5f5;
          padding: 15px;
          border: 1px solid #ddd;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 12px;
          line-height: 1.5;
        }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>訂單資料 (JSON)</h1>
        <div>訂單編號: ${orderData.orderID || 'N/A'}</div>
        <div>列印時間: ${new Date().toLocaleString('zh-TW')}</div>
      </div>
      <div class="json-container">${escapeHtml(jsonString)}</div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `
  
  printWindow.document.write(printContent)
  printWindow.document.close()
}

/**
 * 列印可讀格式訂單 - 針對 XP-80C 80mm 熱感印表機優化
 * 使用隱藏 iframe 實現靜默列印，不彈出視窗
 */
export function printOrderReadable(orderData) {
  // 簡化的商品列表，適合 80mm 收據
  const itemsHTML = orderData.items.map((item, index) => {
    const itemTotal = (item.price || 0) * (item.quantity || 0)
    return `
      <div class="item">
        <div class="item-name">${escapeHtml(item.name || '')}</div>
        <div class="item-detail">
          <span>${item.quantity || 0} x $${(item.price || 0).toFixed(0)}</span>
          <span class="item-total">$${itemTotal.toFixed(0)}</span>
        </div>
        ${item.customOptions ? `<div class="item-options">${escapeHtml(item.customOptions)}</div>` : ''}
      </div>
    `
  }).join('')

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>訂單 - ${orderData.orderID || '未知'}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Microsoft JhengHei', 'SimHei', Arial, sans-serif;
          width: 80mm;
          padding: 5mm;
          font-size: 12px;
          line-height: 1.4;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #000;
        }
        .receipt-header h1 {
          font-size: 20px;
          margin-bottom: 5px;
        }
        .order-info {
          font-size: 10px;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .divider {
          border-bottom: 1px dashed #000;
          margin: 8px 0;
        }
        .item {
          margin: 8px 0;
        }
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        .item-detail {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .item-total {
          font-weight: bold;
        }
        .item-options {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
          padding-left: 10px;
        }
        .totals {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #000;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-size: 12px;
        }
        .total-row.discount {
          color: #666;
        }
        .total-row.final {
          font-size: 16px;
          font-weight: bold;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #000;
        }
        .payment-info {
          margin-top: 10px;
          padding: 8px 0;
          border-top: 1px dashed #000;
          font-size: 11px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .footer {
          margin-top: 15px;
          padding-top: 8px;
          text-align: center;
          font-size: 10px;
          border-top: 1px dashed #000;
        }
        @media print {
          body {
            padding: 2mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <h1>訂單明細</h1>
        <div style="font-size: 11px; margin-top: 3px;">🍽️ OrderSystem</div>
      </div>
      
      <div class="order-info">
        <div class="info-row">
          <span>單號: ${orderData.orderID || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span>操作: ${escapeHtml(orderData.user || '')}</span>
          <span>${formatShortTimestamp(orderData.timestamp)}</span>
        </div>
      </div>

      <div class="divider"></div>

      ${itemsHTML}

      <div class="totals">
        <div class="total-row">
          <span>小計</span>
          <span>$${(orderData.subtotal || 0).toFixed(0)}</span>
        </div>
        ${orderData.discountAmount > 0 ? `
          <div class="total-row discount">
            <span>折扣 ${orderData.promoCode ? '(' + escapeHtml(orderData.promoCode) + ')' : ''}</span>
            <span>-$${(orderData.discountAmount || 0).toFixed(0)}</span>
          </div>
        ` : ''}
        <div class="total-row final">
          <span>合計</span>
          <span>$${(orderData.total || 0).toFixed(0)}</span>
        </div>
      </div>

      ${orderData.paymentAmounts ? `
        <div class="payment-info">
          ${formatPaymentMethodsSimple(orderData.paymentAmounts)}
          ${orderData.receivedAmount ? `
            <div class="payment-row">
              <span>實收</span>
              <span>$${(orderData.receivedAmount || 0).toFixed(0)}</span>
            </div>
            ${orderData.changeAmount > 0 ? `
              <div class="payment-row">
                <span>找零</span>
                <span>$${(orderData.changeAmount || 0).toFixed(0)}</span>
              </div>
            ` : ''}
          ` : ''}
        </div>
      ` : ''}

      <div class="footer">
        感謝惠顧<br>
        ${new Date().toLocaleString('zh-TW')}
      </div>
    </body>
    </html>
  `
  
  // 使用隱藏的 iframe 進行靜默列印
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.visibility = 'hidden'
  
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentWindow.document
  iframeDoc.open()
  iframeDoc.write(printContent)
  iframeDoc.close()
  
  // 等待內容載入後列印
  iframe.contentWindow.onload = function() {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        
        // 列印完成後移除 iframe
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      } catch (err) {
        console.error('列印失敗:', err)
        document.body.removeChild(iframe)
      }
    }, 250)
  }
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 格式化時間戳記
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  try {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

/**
 * 格式化付款方式
 */
function formatPaymentMethods(paymentAmounts) {
  if (!paymentAmounts || typeof paymentAmounts !== 'object') return 'N/A'
  
  return Object.entries(paymentAmounts)
    .filter(([_, amount]) => amount > 0)
    .map(([method, amount]) => `<div>${escapeHtml(method)}: $${Number(amount).toFixed(0)}</div>`)
    .join('') || 'N/A'
}

/**
 * 格式化付款方式（簡化版，適合收據）
 */
function formatPaymentMethodsSimple(paymentAmounts) {
  if (!paymentAmounts || typeof paymentAmounts !== 'object') return ''
  
  return Object.entries(paymentAmounts)
    .filter(([_, amount]) => amount > 0)
    .map(([method, amount]) => `
      <div class="payment-row">
        <span>${escapeHtml(method)}</span>
        <span>$${Number(amount).toFixed(0)}</span>
      </div>
    `)
    .join('')
}

/**
 * 格式化時間戳記（簡短版）
 */
function formatShortTimestamp(timestamp) {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * 下載 JSON 檔案（備用）
 */
export function downloadOrderJSON(orderData) {
  const jsonString = JSON.stringify(orderData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `order_${orderData.orderID || Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}
