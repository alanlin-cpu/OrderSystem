const SPREADSHEET_ID = '1m2TkzWJb1U-jTm6JKDAnmM-WsHY1NbMlxQwVa_q-jx8';
const ORDERS_SHEET = 'Orders';
const LOGS_SHEET = 'Logs';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const payload = raw ? JSON.parse(raw) : {};

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 若是刪除操作，使用 orderID 尋找對應行，更新 deletedBy / deletedAt
    if (payload.action === 'delete') {
      const sheet = ss.getSheetByName(ORDERS_SHEET);
      if (sheet) {
        const range = sheet.getDataRange();
        const values = range.getValues();

        // orderID 放在第 2 欄（1-based），索引 1
        for (let i = 1; i < values.length; i++) {
          const rowOrderID = String(values[i][1] || '').trim();
          if (rowOrderID && rowOrderID === String(payload.orderID || '').trim()) {
            sheet.getRange(i + 1, 10).setValue(payload.deletedBy || '');
            sheet.getRange(i + 1, 11).setValue(payload.deletedAt || '');
            break;
          }
        }
      }

      const logsSheet = ss.getSheetByName(LOGS_SHEET) || ss.insertSheet(LOGS_SHEET);
      logsSheet.appendRow([ new Date(), 'doPost_delete', raw, JSON.stringify({ status: 'ok' }) ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 正常新增訂單的邏輯
    const sheet = ss.getSheetByName(ORDERS_SHEET) || ss.insertSheet(ORDERS_SHEET);
    const itemsJson = JSON.stringify(payload.items || []);
    const row = [
      new Date(),                          // 時間
      payload.orderID || '',               // 訂單編號
      payload.user || '',                  // 員工
      itemsJson,                           // 品項
      Number(payload.subtotal || 0),       // 小計
      Number(payload.discountAmount || 0), // 折扣
      Number(payload.total || 0),          // 總計
      payload.paymentMethod || '',         // 付款
      payload.promoCode || '',             // 折扣代碼
      payload.deletedBy || '',             // 刪除者
      payload.deletedAt || ''              // 刪除時間
    ];
    sheet.appendRow(row);

    const logsSheet = ss.getSheetByName(LOGS_SHEET) || ss.insertSheet(LOGS_SHEET);
    const responseObj = { status: 'ok' };
    logsSheet.appendRow([ new Date(), 'doPost', raw, JSON.stringify(responseObj) ]);

    Logger.log('doPost payload: %s', raw);
    Logger.log('doPost response: %s', JSON.stringify(responseObj));

    return ContentService
      .createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const errObj = { status: 'error', message: String(err) };
    Logger.log('doPost error: %s', errObj.message);
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const logsSheet = ss.getSheetByName(LOGS_SHEET) || ss.insertSheet(LOGS_SHEET);
      logsSheet.appendRow([ new Date(), 'doPost_error', (e && e.postData && e.postData.contents) || '', JSON.stringify(errObj) ]);
    } catch (e2) { Logger.log('log-to-sheet failed: %s', e2.message) }

    return ContentService
      .createTextOutput(JSON.stringify(errObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 預檢請求（仍不設 header，保持簡單可執行）
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// 讀取訂單（JSON），供前端 `loadOrdersFromApi()` 使用
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(ORDERS_SHEET);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ orders: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const values = sheet.getDataRange().getValues();
    const orders = [];
    // 假設第一列是表頭，從第 2 列開始
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const ts = row[0];           // 時間
      const orderID = row[1];      // 訂單編號
      const user = row[2];
      const itemsJson = row[3];
      const subtotal = Number(row[4] || 0);
      const discountAmount = Number(row[5] || 0);
      const total = Number(row[6] || 0);
      const paymentMethod = row[7] || 'cash';
      const promoCode = row[8] || '';
      const deletedBy = row[9] || '';
      const deletedAt = row[10] || '';

      let items = [];
      try { items = JSON.parse(itemsJson || '[]'); } catch (_) {}

      orders.push({
        orderID: String(orderID || ''),
        timestamp: (ts && ts.toISOString) ? ts.toISOString() : String(ts || ''),
        user: String(user || ''),
        items: items,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
        paymentMethod: String(paymentMethod || 'cash'),
        promoCode: String(promoCode || ''),
        deletedBy: String(deletedBy || ''),
        deletedAt: String(deletedAt || '')
      });
    }

    // 可選：支援查詢參數過濾，例如只回未刪除
    // if (e && e.parameter && e.parameter.onlyActive === 'true') {
    //   orders = orders.filter(o => !o.deletedAt);
    // }

    return ContentService
      .createTextOutput(JSON.stringify({ orders }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const errObj = { status: 'error', message: String(err) };
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const logsSheet = ss.getSheetByName(LOGS_SHEET) || ss.insertSheet(LOGS_SHEET);
      logsSheet.appendRow([ new Date(), 'doGet_error', JSON.stringify(e && e.parameter || {}), JSON.stringify(errObj) ]);
    } catch (e2) { /* ignore logging errors */ }

    return ContentService
      .createTextOutput(JSON.stringify({ orders: [], error: errObj.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}