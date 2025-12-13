const SPREADSHEET_ID = '1m2TkzWJb1U-jTm6JKDAnmM-WsHY1NbMlxQwVa_q-jx8';
const ORDERS_SHEET = 'Orders';
const LOGS_SHEET = 'Logs';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const payload = raw ? JSON.parse(raw) : {};

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const sheet = ss.getSheetByName(ORDERS_SHEET) || ss.insertSheet(ORDERS_SHEET);
    const itemsJson = JSON.stringify(payload.items || []);
    const row = [
      new Date(),                          // 時間
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