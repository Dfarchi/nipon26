/* NIPON26 — מעקב הוצאות בגיליון משותף.
 *
 * מה זה: קצה קטן שיושב על גיליון Google Sheets ומקבל הוצאות משני
 * הטלפונים. האפליקציה שולחת שורה, הסקריפט מוסיף אותה לגיליון ומחזיר
 * את כל השורות — כך ששני המכשירים רואים את אותו דבר.
 *
 * ההתקנה כתובה ב-SHEETS.md. בקצרה:
 *   גיליון חדש → תוספים → Apps Script → להדביק את הקובץ הזה →
 *   פריסה → אפליקציית אינטרנט → "מי שיש לו הקישור" → להעתיק כתובת.
 *
 * הכתובת הזו לא נכנסת לריפו — מדביקים אותה פעם אחת בכל טלפון,
 * במסך "ארנק". הריפו ציבורי, וכתובת בקוד פירושה שכל אחד יכול לכתוב.
 */

var SHEET = 'expenses';
var HEAD = ['id', 'נשלח', 'תאריך', 'מי שילם', 'סכום', 'מטבע', 'שער', '₪', 'קטגוריה', 'הערה'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEAD);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return [];
  var v = sh.getRange(2, 1, n - 1, HEAD.length).getValues();
  return v.filter(function (r) { return r[0]; }).map(function (r) {
    return { id: String(r[0]), date: fmt_(r[2]), who: r[3], amount: Number(r[4]),
             currency: r[5], rate: Number(r[6]), ils: Number(r[7]),
             category: r[8], note: r[9] };
  });
}

function fmt_(d) {
  if (d instanceof Date) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  return String(d || '');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, rows: rows_(sheet_()) });
}

/* האפליקציה שולחת ‎text/plain בכוונה: Apps Script לא עונה ל-OPTIONS,
 * ובקשה עם ‎application/json הייתה מפעילה preflight ונופלת. */
function doPost(e) {
  var sh = sheet_();
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  var incoming = body.rows || [];

  // id שכבר קיים לא נכתב שוב. הטלפון שולח מחדש כל מה שבתור עד שהוא
  // מקבל אישור, ובלי זה חזרה מאזור בלי קליטה הייתה מכפילה כל הוצאה.
  var seen = {};
  rows_(sh).forEach(function (r) { seen[r.id] = true; });

  var add = [];
  incoming.forEach(function (r) {
    if (!r || !r.id || seen[r.id]) return;
    seen[r.id] = true;
    var amount = Number(r.amount) || 0;
    var rate = Number(r.rate) || 0;
    add.push([String(r.id), new Date(), String(r.date || ''), String(r.who || ''),
              amount, String(r.currency || ''), rate,
              Math.round(amount * rate * 100) / 100,
              String(r.category || ''), String(r.note || '')]);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, HEAD.length).setValues(add);

  return json_({ ok: true, added: add.length, rows: rows_(sh) });
}
