/* בדיקת שפיות — לוודא שהיום-ביום, השלבים, התקציב והמפה לא סותרים זה את זה.
   להריץ לפני כל push:  node check.js   */
global.window = {};
require('./data.js');
const T = window.TRIP;
let bad = 0;
const fail = m => { console.log('  ❌ ' + m); bad++; };
const ok   = m => console.log('  ✓ ' + m);

// כמה לילות בכל בלוק, לפי טווח התאריכים שבשם שלו
const D = t => { const m = t.match(/(\d{1,2})\.(\d{1,2})/); return m ? new Date(2026, +m[2] - 1, +m[1]) : null; };
const blocks = [...new Set(T.days.map(d => d.st))];

console.log('=== בלוקים: ימים מול לילות ===');
blocks.forEach(b => {
  const days = T.days.filter(d => d.st === b);
  const r = b.match(/(\d{1,2}[–-]\d{1,2}\.\d{1,2}|\d{1,2}\.\d{1,2}[–-]\d{1,2}\.\d{1,2})/);
  if (!r) return;
  const [a, z] = b.match(/\d{1,2}\.\d{1,2}|\d{1,2}(?=[–-])/g).slice(0, 2);
  const mo = b.match(/\.(\d{1,2})/g);
  const s = a.includes('.') ? D(a) : new Date(2026, +mo[0].slice(1) - 1, +a);
  const e = D(z.includes('.') ? z : z + mo[mo.length - 1]);
  if (!s || !e) return;
  const nights = Math.round((e - s) / 864e5);
  const need = nights;                     // יום לכל לילה; יום היציאה נספר בבלוק הבא
  if (days.length < need) fail(`${b}: ${nights} לילות אבל רק ${days.length} ימים — חסרים ${need - days.length}`);
  else ok(`${b}: ${nights} לילות · ${days.length} ימים`);
});

console.log('=== שיוך לשלב ===');
blocks.forEach(b => T.dayPhase[b] === undefined ? fail(`אין dayPhase ל-"${b}"`) : null);
if (!bad) ok('כל הבלוקים משויכים');

console.log('=== סיכות מפה ===');
T.phases.forEach((p, i) => {
  const pins = T.mapPoints.filter(x => x.ph === i).length;
  if (p.parked) return;
  pins === 0 ? fail(`שלב ${i} (${p.h}) בלי אף סיכה`) : ok(`שלב ${i}: ${pins} סיכות`);
});

console.log('=== תקציב מול לילות ===');
const fx = T.budget.fx, ils = x => x.ils || (x.jpy ? x.jpy * fx.jpy : x.usd ? x.usd * fx.usd : 0);
const bn = T.budget.booked.reduce((s, x) => s + x.nights, 0);
const fn = T.budget.forecast.filter(x => x.nights).reduce((s, x) => s + x.nights, 0);
bn + fn !== T.budget.nights
  ? fail(`מוזמן ${bn} + תחזית ${fn} = ${bn + fn}, אבל budget.nights = ${T.budget.nights}`)
  : ok(`${bn} מוזמנים + ${fn} בתחזית = ${T.budget.nights}`);
const tot = T.budget.booked.concat(T.budget.forecast).reduce((s, x) => s + ils(x), 0);
ok(`סה"כ ₪${Math.round(tot).toLocaleString()} מול יעד ₪${T.budget.target.toLocaleString()}`);

console.log('=== שערי המרה — טריות ===');
if (!fx.asOf) fail('אין שדה asOf ב-budget.fx — אי אפשר לדעת מתי השער נבדק');
else {
  const age = Math.round((Date.now() - new Date(fx.asOf)) / 864e5);
  age > 45
    ? fail(`השער נבדק לפני ${age} ימים (${fx.asOf}) — לרענן, אחרת כל התקציב מוטה`)
    : ok(`השער נבדק לפני ${age} ימים · ¥100=₪${(fx.jpy * 100).toFixed(2)} · $1=₪${fx.usd.toFixed(2)}`);
}

console.log('=== לינה לכל בלוק ===');
const multi = ['טוקיו · פתיחה', 'דרום טוהוקו', 'האלפים היפנים'];  // בלוקים עם כמה מלונות — נבדקים ביום-ביום עצמו
blocks.forEach(b => {
  if (/❓/.test(b) || multi.includes(b)) return;
  const d = T.days.filter(x => x.st === b)[0];
  if (!d.flag || !/🏨/.test(d.flag)) fail(`"${b}": היום הראשון לא אומר איפה ישנים`);
  else ok(`${b}: ${d.flag.match(/🏨 ([^·—.]+)/)[1].trim()}`);
});

console.log('=== שלבים: תאריך פתיחה + סכום לילות ===');
const live = T.phases.filter(p => !p.parked);
live.forEach((p, i) => {
  if (!p.start || !/^\d{4}-\d{2}-\d{2}$/.test(p.start)) fail(`"${p.h}": אין שדה start תקין (index.html נשען עליו)`);
  if (i && live[i - 1].start >= p.start) fail(`"${p.h}": מתחיל לפני השלב שלפניו`);
});
const phNights = live.reduce((s, p) => s + (parseInt(p.nights, 10) || 0), 0);
phNights !== T.budget.nights
  ? fail(`סכום הלילות בשלבים = ${phNights}, אבל budget.nights = ${T.budget.nights}`)
  : ok(`סכום הלילות בשלבים = ${phNights}`);
live.forEach((p, i) => /^שלב \d+ /.test(p.h) && +p.h.match(/\d+/)[0] === i + 1
  ? null : fail(`"${p.h}": מספור השלב לא תואם את מקומו ברשימה (${i + 1})`));
if (!bad) ok('מספור השלבים רציף');

console.log('=== מחרוזת מטמון (?v=) זהה בכל ה-HTML ===');
const fs = require('fs');
const vers = new Set();
fs.readdirSync('.').filter(f => f.endsWith('.html')).forEach(f => {
  (fs.readFileSync(f, 'utf8').match(/\.(?:js|css)\?v=([0-9a-z]+)/g) || [])
    .forEach(m => vers.add(m.split('=')[1]));
});
vers.size > 1
  ? fail(`יש יותר ממחרוזת מטמון אחת: ${[...vers].join(', ')} — יובל יראה גרסה ישנה`)
  : ok(`מחרוזת מטמון אחידה: ${[...vers][0] || 'אין'}`);

console.log(bad ? `\n*** ${bad} בעיות — לא לדחוף ***` : '\n✅ הכל עקבי');
process.exit(bad ? 1 : 0);
