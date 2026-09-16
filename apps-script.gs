/* NIPON26 — טבלת ההוצאות המשותפת של יובל ושיר.
 *
 * הסקריפט הזה הוא גם הקצה שהאפליקציה מדברת איתו וגם מי שבונה את
 * הגיליון: בהרצה הראשונה הוא יוצר שתי לשוניות מעוצבות — "הוצאות"
 * עם כל השורות, ו"סיכום" שמחשב לבד מי שילם כמה ומי חייב למי.
 *
 * ההתקנה ב-SHEETS.md. בקצרה: הגיליון → תוספים → Apps Script →
 * להדביק את הקובץ הזה → פריסה → אפליקציית אינטרנט → "כל מי שיש לו
 * הקישור" → להעתיק את הכתובת שמסתיימת ב-/exec.
 *
 * הכתובת לא נכנסת לריפו — הוא ציבורי. מדביקים אותה פעם אחת בכל טלפון.
 */

var TAB = 'הוצאות', SUM = 'סיכום';
var HEAD = ['id', 'נרשם', 'תאריך', 'מי שילם', 'סכום', 'מטבע', 'שער', '₪',
            'על מה', 'איך', 'הערה'];

// חייב להתאים ל-WHO ול-CAT ב-wallet.js, אחרת הסינון בסיכום מפספס שורות.
var WHO = ['יובל', 'שיר', 'על שנינו'];
var CAT = ['🍜 ארוחות', '🍡 נשנושים', '🚃 נסיעות', '⛩️ כניסות', '🎁 מתנות',
           '🏪 קומביני', '♨️ אונסן', '🛏️ לינה', '🪭 שטויות יפניות'];
// ביפן זה לא פרט טכני: מזומן הוא מה שנגמר בארנק, ואשראי מוסיף כ-2%.
var PAY = ['💴 מזומן', '💳 אשראי'];

var INK = '#3a2f26', PAPER = '#faf3e6', LINE = '#e0d4bd', HOT = '#b4551f';

/* ---------- הלשונית הראשית ---------- */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    // גיליון חדש נפתח עם "Sheet1" ריקה. עדיף לשנות לה שם מאשר להשאיר
    // לשונית מיותרת שאיש לא יודע למה היא שם.
    var first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0) {
      sh = first.setName(TAB);
    } else {
      sh = ss.insertSheet(TAB, 0);
    }
  }
  if (sh.getLastRow() === 0) dress_(sh);
  return sh;
}

function dress_(sh) {
  sh.appendRow(HEAD);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEAD.length)
    .setFontWeight('bold').setFontColor(PAPER).setBackground(INK)
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);

  var w = [0, 150, 130, 95, 90, 85, 70, 70, 95, 130, 95, 240];
  for (var i = 1; i <= HEAD.length; i++) sh.setColumnWidth(i, w[i]);

  sh.getRange('B:B').setNumberFormat('dd/MM HH:mm');
  sh.getRange('C:C').setNumberFormat('dd/MM/yyyy');
  sh.getRange('E:E').setNumberFormat('#,##0.##');
  sh.getRange('G:G').setNumberFormat('0.0000');
  sh.getRange('H:H').setNumberFormat('₪#,##0.00');

  // id הוא תחזוקה פנימית ולא משהו שקוראים. מוסתר, לא מחוק — בלעדיו
  // שליחה חוזרת אחרי אופליין הייתה מכפילה כל הוצאה.
  sh.hideColumns(1);

  sh.getRange(2, 4, sh.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(WHO, true).setAllowInvalid(true).build());
  sh.getRange(2, 9, sh.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CAT, true).setAllowInvalid(true).build());
  sh.getRange(2, 10, sh.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(PAY, true).setAllowInvalid(true).build());

  try {
    sh.getRange(1, 1, sh.getMaxRows(), HEAD.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  } catch (e) {}
  summary_(sh.getParent());
}

/* ---------- לשונית הסיכום ---------- */

function summary_(ss) {
  var sh = ss.getSheetByName(SUM) || ss.insertSheet(SUM);
  sh.clear();
  var q = "'" + TAB + "'!";
  var rows = [
    ['כמה יצא לנו עד עכשיו', '=IFERROR(SUM(' + q + 'H2:H),0)'],
    ['כמה רישומים', '=COUNTA(' + q + 'C2:C)'],
    ['ימים שבהם הוצאנו', '=IFERROR(COUNTUNIQUE(' + q + 'C2:C),0)'],
    ['ממוצע ליום פעיל', '=IFERROR(B1/B3,0)'],
    ['', ''],
    ['מי שילם', 'סכום']
  ];
  WHO.forEach(function (w) {
    rows.push([w, '=IFERROR(SUMIF(' + q + 'D:D,A' + (rows.length + 1) + ',' + q + 'H:H),0)']);
  });
  rows.push(['', '']);
  // מי חייב למי: חצי מהסכום המשותף על כל אחד, ומה שמעבר לזה הוא
  // בעצם הלוואה. הנוסחה מניחה ש"על שנינו" מתחלק שווה בשווה.
  var iY = 7, iS = 8, iB = 9;
  rows.push(['ההפרש ביניכם',
    '=IFERROR(ABS((B' + iY + '+B' + iB + '/2)-(B' + iS + '+B' + iB + '/2)),0)']);
  rows.push(['מי שילם יותר',
    '=IF(B' + iY + '>B' + iS + ',"' + WHO[0] + '",IF(B' + iS + '>B' + iY + ',"' + WHO[1] + '","תיקו"))']);
  rows.push(['', '']);
  rows.push(['איך שילמנו', 'סכום']);
  PAY.forEach(function (w) {
    rows.push([w, '=IFERROR(SUMIF(' + q + 'J:J,A' + (rows.length + 1) + ',' + q + 'H:H),0)']);
  });
  // הערכה ולא עובדה: האחוז תלוי בכרטיס. מסומן ככזה בשם השורה.
  var iCard = rows.length;   // השורה של "💳 אשראי"
  rows.push(['תוספת משוערת על האשראי (2%)', '=IFERROR(B' + iCard + '*0.02,0)']);
  rows.push(['', '']);
  rows.push(['על מה', 'סכום']);
  CAT.forEach(function (c) {
    rows.push([c, '=IFERROR(SUMIF(' + q + 'I:I,A' + (rows.length + 1) + ',' + q + 'H:H),0)']);
  });

  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 130);
  sh.getRange('B:B').setNumberFormat('₪#,##0.00');
  sh.getRange('B2:B3').setNumberFormat('#,##0');
  // מפת השורות: 7-9 מי שילם · 11 ההפרש · 12 מי שילם יותר · 14 כותרת "על מה"
  sh.getRange('B' + (iB + 3)).setNumberFormat('@');       // "מי שילם יותר" הוא טקסט
  sh.getRange('A1:B1').setFontWeight('bold').setFontSize(13).setFontColor(HOT);
  [6, iB + 5, iB + 10].forEach(function (r) {
    sh.getRange(r, 1, 1, 2).setFontWeight('bold').setBackground(PAPER).setFontColor(INK);
  });
  sh.setFrozenRows(1);
}

/* ---------- קריאה וכתיבה ---------- */

function rows_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, HEAD.length).getValues()
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return { id: String(r[0]), date: fmt_(r[2]), who: r[3], amount: Number(r[4]),
               currency: r[5], rate: Number(r[6]), ils: Number(r[7]),
               category: r[8], pay: r[9], note: r[10] };
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

/* האפליקציה שולחת text/plain בכוונה: Apps Script לא עונה ל-OPTIONS,
 * ובקשה עם application/json הייתה מפעילה preflight ונופלת. */
function doPost(e) {
  var sh = sheet_();
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }

  // id שכבר קיים לא נכתב שוב. הטלפון שולח מחדש את כל התור עד שהוא
  // מקבל אישור, ובלי זה חזרה מאזור בלי קליטה הייתה מכפילה כל הוצאה.
  var seen = {};
  rows_(sh).forEach(function (r) { seen[r.id] = true; });

  var add = [];
  (body.rows || []).forEach(function (r) {
    if (!r || !r.id || seen[r.id]) return;
    seen[r.id] = true;
    var amount = Number(r.amount) || 0, rate = Number(r.rate) || 0;
    add.push([String(r.id), new Date(), parseDate_(r.date), String(r.who || ''),
              amount, String(r.currency || ''), rate,
              Math.round(amount * rate * 100) / 100,
              String(r.category || ''), String(r.pay || ''), String(r.note || '')]);
  });
  if (add.length) {
    sh.getRange(sh.getLastRow() + 1, 1, add.length, HEAD.length).setValues(add);
    summary_(sh.getParent());
  }
  return json_({ ok: true, added: add.length, rows: rows_(sh) });
}

// "2026-10-30" → Date, כדי שהעמודה תהיה תאריך אמיתי ואפשר יהיה למיין
// ולסנן לפיה בגיליון עצמו.
function parseDate_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : String(s || '');
}
