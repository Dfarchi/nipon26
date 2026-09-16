(function () {
  const A = App, T = A.T;
  A.boot('wallet.html');
  const idx = A.dayIndex(), dd = A.dated[idx].date;
  const money = b => b.jpy ? '¥' + b.jpy.toLocaleString() : b.usd ? '$' + b.usd : b.ils ? '₪' + b.ils : '';

  // כרטיס לנהג: הכל ביפנית. stayAddr נשמר כ"שם, כתובת", ואם החלק לפני
  // הפסיק הוא יפני הוא השם — ואז אין טעם בשורת שם בעברית שנהג לא קורא.
  const driver = (addr, fallback) => {
    const i = String(addr).indexOf(',');
    const head = i > 0 ? addr.slice(0, i).trim() : '';
    // גם שם לטיני עדיף על שם בעברית: נהג יפני יכול לקרוא את האחד ולא את השני
    return head ? { nm: head, ad: addr.slice(i + 1).trim() } : { nm: fallback, ad: addr };
  };

  const booked = (T.budget.booked || []).map(b => {
    const p = String(b.d).split(/[–-]/);
    const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
    const sd = s && e ? new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]) : null;
    const ed = e ? new Date(2026, +e[2] - 1, +e[1]) : null;
    return Object.assign({}, b, { sd, ed, cur: sd && ed && dd >= sd && dd < ed, f: A.factsFor(b.n) });
  }).sort((a, b) => (a.sd || 0) - (b.sd || 0));

  // ‎|| booked[0] היה נפילה אחורה ללינה הראשונה בטיול — ובשישה הלילות
  // האחרונים, שעדיין לא הוזמנו, הכרטיס הראה מלון מ-14.10 בלי שום סימן.
  // כתובת שגויה מול נהג מונית גרועה מ"אין כתובת".
  const cur = booked.find(b => b.cur) || booked.find(b => b.sd && b.sd >= A.today0) || null;

  let h = `<div class="head"><div class="kicker">הכל שמור במכשיר</div><div class="h1">הארנק</div></div>`;

  // ---- כרטיס להראות לנהג ----
  if (cur && (cur.f.addr || cur.f.phone || (T.stayAddr || {})[cur.n])) {
    h += `<div class="lbl" style="margin-top:16px">להראות לנהג<i></i><span class="jp" style="color:var(--soft)">タクシー</span></div>
      <div class="tcard">
        <div class="ask jp">ここまでお願いします</div>
        ${(() => { const dv = driver((T.stayAddr || {})[cur.n] || cur.f.addr || '',
              A.txt(cur.n).replace(/^[^—·]*[—·]\s*/, ''));
          return `<div class="nm jp">${A.txt(dv.nm)}</div>
            ${dv.ad ? `<div class="ad jp">${A.txt(dv.ad)}</div>` : ''}`; })()}
        ${cur.f.phone ? `<div class="ph">${cur.f.phone}</div>` : ''}
      </div>
      <div class="d" style="margin-top:6px;text-align:center">בהיר בכוונה — זה המסך היחיד שזר קורא</div>`;
  } else if (!cur) {
    // שתיקה כאן נקראת כמו "אין מה להראות". עדיף לומר למה.
    h += `<div class="lbl" style="margin-top:16px">להראות לנהג<i></i></div>
      <div class="card"><div class="d">אין לינה מוזמנת ללילה הזה — אין כתובת להראות.</div></div>`;
  }

  // דדליינים לביטול חינם ויצוא ל-‎.ics היו כאן. ירדו לבקשת יובל: אין
  // כוונה לבטל הזמנה, ולכן ספירה לאחור לביטול היא מידע שתופס מקום בלי
  // שמישהו יפעל לפיו. הנתון עצמו נשאר ב-‎data.js וב-‎A.dl — "משימות"
  // עדיין משתמש בו לתאריכי יעד אמיתיים.

  // ---- כל הלינות ----
  h += `<div class="lbl q" style="margin-top:22px">לינות<i></i><span class="d">${booked.length} מוזמנות</span></div>`;
  // כל הזמנה היא כרטיסייה שנפתחת, ובתוכה גם כרטיס הנהג של אותו מלון —
  // כדי שיהיה בשליפה לכל לינה ולא רק לזו של הלילה. מספרי אישור וקודי PIN
  // לא נמצאים כאן בכוונה: הריפו ציבורי, ומספר אישור פותח את ההזמנה עצמה.
  booked.forEach((b, k) => {
    const addr = (T.stayAddr || {})[b.n] || b.f.addr || '';
    const short = A.txt(b.n).replace(/^[^—·]*[—·]\s*/, '');
    const nav = addr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr) : '';
    h += `<div class="card bk${b.cur ? ' now' : ''}" style="margin-top:8px;padding:0">
      <button class="exp bkh" data-k="${k}" aria-expanded="false">
        <div style="display:flex;align-items:baseline;gap:9px">
          <div class="t" style="flex:1">${A.txt(b.n)}</div>
          <div class="d" style="margin:0">${money(b)}</div></div>
        <div class="d">${b.d} · ${b.nights} לילות${b.meals ? ' · ' + b.meals : ''}${b.est ? ' · הערכה' : ''}
          ${b.cur && !A.beforeTrip && !A.afterTrip ? '<span class="chip hot">כאן הלילה</span>' : ''}</div>
      </button>
      <div class="ph-body"><div class="bkd">
        <div class="well" style="margin-top:0">
          ${addr ? `<div class="pk"><b>📍</b><span class="jp">${A.txt(addr)}</span></div>` : ''}
          ${b.f.phone ? `<div class="pk"><b>☎</b><span><a class="tel" href="tel:${b.f.phone.replace(/-/g, '')}">${b.f.phone}</a></span></div>` : ''}
          ${b.f.free ? `<div class="pk"><b>⏳</b><span>ביטול חינם עד ${b.f.free}</span></div>` : ''}
          ${b.meals ? `<div class="pk"><b>🍽</b><span>${A.txt(b.meals)}</span></div>` : ''}
          ${b.note ? `<div class="pk more"><b>ℹ️</b><span>${A.txt(b.note)}</span></div>` : ''}
        </div>
        ${addr ? `<div class="tcard" style="margin-top:10px">
          <div class="ask jp">ここまでお願いします</div>
          <div class="nm jp">${A.txt(driver(addr, short).nm)}</div>
          ${driver(addr, short).ad ? `<div class="ad jp">${A.txt(driver(addr, short).ad)}</div>` : ''}
          ${b.f.phone ? `<div class="ph">${b.f.phone}</div>` : ''}
        </div>
        <div class="d" style="text-align:center;margin-top:5px">להראות לנהג</div>` : ''}
        ${nav ? `<a class="go" href="${nav}" target="_blank" rel="noopener">לנווט לשם</a>` : ''}
      </div></div>
    </div>`;
  });

  // ---- כמה זה עולה ----
  // אותו חישוב בדיוק כמו ב-budget.html ובבדיקת check.js: לינה סגורה
  // ועוד תחזית, בלי טיסות. שני מקומות שמחשבים אחרת היו נותנים שני
  // מספרים שונים לאותה שאלה.
  {
    const B = T.budget || {}, fx = B.fx || {};
    const nisOf = x => x.ils || (x.jpy ? x.jpy * fx.jpy : x.usd ? x.usd * fx.usd : 0);
    const bk = (B.booked || []).reduce((a, r) => a + nisOf(r), 0);
    const bkN = (B.booked || []).reduce((a, r) => a + (r.nights || 0), 0);
    const ahead = (B.forecast || []).reduce((a, r) => a + nisOf(r), 0);
    const total = bk + ahead, gap = total - (B.target || 0);
    const pct = B.target ? Math.min(100, Math.round(total / B.target * 100)) : 0;
    const nis = n => '₪' + Math.round(n).toLocaleString('he-IL');
    h += `<div class="lbl q" style="margin-top:22px">כמה זה עולה<i></i>
        <span class="d">לזוג · ${B.nights || 42} לילות · בלי טיסות</span></div>
      <div class="card" style="padding:14px 15px">
        <div style="display:flex;align-items:baseline;gap:10px">
          <div class="h1" style="font-size:var(--fs-title);margin:0">${nis(total)}</div>
          <div class="d" style="margin:0;flex:1">סה״כ צפוי</div>
        </div>
        <div class="bbar"><i style="width:${pct}%"></i></div>
        <div class="d" style="margin-top:7px">לינה סגורה ${nis(bk)} · ${bkN} מתוך ${
          B.nights || 42} לילות · לפנינו ${nis(ahead)}</div>
        <div class="d" style="margin-top:3px;color:${gap > 0 ? 'var(--warn)' : 'var(--ok)'}">יעד ${
          nis(B.target || 0)} — ${gap > 0 ? 'חריגה של ' + nis(gap) : 'מרווח של ' + nis(-gap)}</div>
      </div>`;
  }

  // ---- הוצאות ----
  // הסכום עצמו נבנה כאן פעם אחת; אחרי כל הוספה מרעננים רק את הבלוק
  // הזה, כדי שלא לבנות מחדש 13 כרטיסי לינה בכל לחיצה.
  h += `<div class="lbl q" style="margin-top:22px">הוצאות<i></i>
      <span class="d" id="spSt"></span></div>
    <div id="spend"></div>`;

  // ---- מסמכים ----
  if ((T.docs || []).length) {
    h += `<div class="lbl q" style="margin-top:22px">מסמכים<i></i></div>`;
    T.docs.forEach(d => {
      h += `<a href="${d.url}" target="_blank" rel="noopener" class="step" style="margin-top:7px;text-decoration:none;color:inherit">
        <b class="ic">${d.ic || '📄'}</b>
        <span><div class="t">${A.txt(d.t)}</div><div class="d" style="margin:0">${A.txt(d.d)}</div></span></a>`;
    });
  }
  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));
  A.jumpBar();

  // פתיחה במקום, בלי בנייה מחדש — אותו מנגנון כמו שלב במסלול
  document.getElementById('main').addEventListener('click', e => {
    const btn = e.target.closest('.bkh');
    if (!btn) return;
    const card = btn.closest('.card'), open = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.bkh[aria-expanded="true"]').forEach(o => {
      o.setAttribute('aria-expanded', 'false');
      o.closest('.card').classList.remove('open');
    });
    if (open) return;
    btn.setAttribute('aria-expanded', 'true');
    card.classList.add('open');
  });

  // ===== הוצאות =====
  // מה שנכנס כאן הולך לגיליון המשותף, כדי ששני הטלפונים יראו אותו סכום.
  // בלי כתובת גיליון זה עדיין עובד — רק מקומית, ועם שורה שאומרת את זה.
  // חייב להיות זהה ל-WHO ול-CAT ב-apps-script.gs, אחרת ה-SUMIF בלשונית
  // "סיכום" מחפש מחרוזת שלא קיימת ומחזיר אפס בלי להתלונן.
  const WHO = ['יובל', 'שיר', 'על שנינו'];
  const CAT = ['🍜 ארוחות',
               '🍡 נשנושים',
               '🚃 נסיעות',
               '⛩️ כניסות',
               '🎁 מתנות',
               '🏪 קומביני',
               '♨️ אונסן',
               '🛏️ לינה',
               '🪭 שטויות יפניות'];
  const PAY = ['💴 מזומן', '💳 אשראי'];

  function jpyRate() {
    const f = (T.budget || {}).fx || {};
    return LIVE_JPY || f.jpy || 0;
  }
  let LIVE_JPY = 0;

  const ils = r => Number(r.amount) * (Number(r.rate) || 0);
  const shek = n => '₪' + Math.round(n).toLocaleString('he-IL');

  function paintSpend() {
    const box = document.getElementById('spend');
    if (!box) return;
    const rows = A.spend.all();
    const total = rows.reduce((a, r) => a + ils(r), 0);
    const per = WHO.map(w => [w, rows.filter(r => r.who === w).reduce((a, r) => a + ils(r), 0)])
      .filter(x => x[1] > 0);

    const st = document.getElementById('spSt');
    if (st) {
      const q = A.spend.queue().length;
      st.textContent = !A.spend.url() ? 'מקומי בלבד'
        : q ? q + ' ממתינות לשליחה' : 'מסונכרן';
    }

    box.innerHTML = `<div class="card" style="padding:14px 15px">
      <div style="display:flex;align-items:baseline;gap:10px">
        <div class="h1" style="font-size:var(--fs-title);margin:0">${shek(total)}</div>
        <div class="d" style="margin:0;flex:1">${rows.length ? rows.length + ' רישומים' : 'עוד לא נרשם כלום'}</div>
      </div>
      ${per.length ? `<div class="d" style="margin-top:6px">${
        per.map(([w, v]) => `${w} ${shek(v)}`).join(' · ')}</div>` : ''}
      ${rows.length ? `<div class="d" style="margin-top:3px">${
        PAY.map(c => [c, rows.filter(r => r.pay === c).reduce((a, r) => a + ils(r), 0)])
           .filter(x => x[1] > 0).map(([c, v]) => `${c} ${shek(v)}`).join(' · ') || ''}</div>` : ''}
      <div class="sprow">
        <button class="chip" id="spAdd">+ הוספה</button>
        ${A.spend.url() ? `<button class="chip" id="spSync">סנכרון</button>` : ''}
        <button class="chip" id="spCfg">${A.spend.url() ? 'גיליון' : 'לחבר גיליון'}</button>
      </div>
      <div id="spForm"></div>
    </div>
    ${rows.length ? `<div class="well" style="margin-top:8px">${rows.slice(0, 6).map(r =>
      `<div class="step" style="margin-top:6px"><b style="min-width:62px">${shek(ils(r))}</b>
        <span style="flex:1">${A.txt(String(r.category || ''))}${r.note ? ' · ' + A.txt(String(r.note)) : ''}</span>
        <span class="chip">${A.txt(String(r.who || ''))}</span></div>`).join('')}</div>` : ''}`;

    const add = document.getElementById('spAdd');
    if (add) add.onclick = () => openForm();
    const sy = document.getElementById('spSync');
    if (sy) sy.onclick = () => { sy.textContent = 'שולח…';
      A.spend.sync(ok => { paintSpend(); if (!ok) { const s2 = document.getElementById('spSt');
        if (s2) s2.textContent = 'לא הצליח להתחבר'; } }); };
    const cfg = document.getElementById('spCfg');
    if (cfg) cfg.onclick = () => openCfg();
  }

  function openCfg() {
    const f = document.getElementById('spForm');
    if (!f) return;
    if (f.dataset.mode === 'cfg') { f.innerHTML = ''; f.dataset.mode = ''; return; }
    f.dataset.mode = 'cfg';
    f.innerHTML = `<div style="margin-top:12px">
      <div class="d">כתובת ה-Apps Script של הגיליון. מדביקים פעם אחת בכל טלפון —
        היא נשמרת כאן בלבד ולא בריפו. ההוראות ב-SHEETS.md.</div>
      <input id="spUrl" type="url" inputmode="url" placeholder="https://script.google.com/…/exec"
        value="${A.esc(A.spend.url())}"
        style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid var(--line);
               background:var(--well);color:var(--ink);font:inherit;font-size:var(--fs-meta)">
      <div style="display:flex;gap:8px;margin-top:9px">
        <button class="chip" id="spSave">שמירה</button>
        <button class="chip" id="spClr">ניתוק</button>
      </div></div>`;
    document.getElementById('spSave').onclick = () => {
      A.spend.setUrl(document.getElementById('spUrl').value);
      f.innerHTML = ''; f.dataset.mode = '';
      A.spend.sync(() => paintSpend());
    };
    document.getElementById('spClr').onclick = () => {
      A.spend.setUrl(''); f.innerHTML = ''; f.dataset.mode = ''; paintSpend();
    };
  }

  function openForm() {
    const f = document.getElementById('spForm');
    if (!f) return;
    if (f.dataset.mode === 'add') { f.innerHTML = ''; f.dataset.mode = ''; return; }
    f.dataset.mode = 'add';
    f.innerHTML = `<div style="margin-top:12px">
      <div class="fxrow">
        <label><span id="spCur">¥</span>
          <input id="spAmt" type="text" inputmode="numeric" placeholder="1,200"></label>
        <button class="chip" id="spSwap">להחליף ל-₪</button>
      </div>
      <div class="fxq" style="margin-top:9px">${WHO.map((w, i) =>
        `<button class="chip spw${i === 0 ? ' on' : ''}" data-w="${A.esc(w)}">${w}</button>`).join('')}</div>
      <div class="fxq" style="margin-top:7px">${CAT.map((c, i) =>
        `<button class="chip spc${i === 0 ? ' on' : ''}" data-c="${A.esc(c)}">${c}</button>`).join('')}</div>
      <div class="fxq" style="margin-top:7px">${PAY.map((c, i) =>
        `<button class="chip spp${i === 0 ? ' on' : ''}" data-p="${A.esc(c)}">${c}</button>`).join('')}</div>
      <input id="spNote" type="text" placeholder="הערה (לא חובה)"
        style="width:100%;margin-top:9px;padding:10px;border-radius:10px;border:1px solid var(--line);
               background:var(--well);color:var(--ink);font:inherit;font-size:var(--fs-meta)">
      <button class="spsave" id="spOk">לשמור</button>
    </div>`;

    let cur = 'JPY';
    const pick = (sel, attr) => f.querySelectorAll(sel).forEach(b => b.onclick = () => {
      f.querySelectorAll(sel).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    });
    pick('.spw'); pick('.spc'); pick('.spp');
    document.getElementById('spSwap').onclick = () => {
      cur = cur === 'JPY' ? 'ILS' : 'JPY';
      document.getElementById('spCur').textContent = cur === 'JPY' ? '¥' : '₪';
      document.getElementById('spSwap').textContent = cur === 'JPY' ? 'להחליף ל-₪' : 'להחליף ל-¥';
    };
    document.getElementById('spOk').onclick = () => {
      const n = parseFloat(String(document.getElementById('spAmt').value).replace(/[^\d.]/g, ''));
      if (!isFinite(n) || n <= 0) { document.getElementById('spAmt').focus(); return; }
      const d = A.dated[A.dayIndex()] && A.dated[A.dayIndex()].date;
      const iso = (d || new Date());
      A.spend.add({
        date: iso.getFullYear() + '-' + ('0' + (iso.getMonth() + 1)).slice(-2) + '-' + ('0' + iso.getDate()).slice(-2),
        who: (f.querySelector('.spw.on') || {}).dataset ? f.querySelector('.spw.on').dataset.w : WHO[0],
        amount: n, currency: cur,
        // השער נשמר עם השורה ולא מחושב בדיעבד: ‎¥1,000 באוקטובר ו-¥1,000
        // בנובמבר אינם אותו סכום בשקלים, ובסוף הטיול רוצים את האמת.
        rate: cur === 'JPY' ? jpyRate() : 1,
        category: (f.querySelector('.spc.on') || {}).dataset ? f.querySelector('.spc.on').dataset.c : CAT[0],
        pay: (f.querySelector('.spp.on') || {}).dataset ? f.querySelector('.spp.on').dataset.p : PAY[0],
        note: document.getElementById('spNote').value.trim()
      });
      f.innerHTML = ''; f.dataset.mode = '';
      paintSpend();
      A.spend.sync(() => paintSpend());
    };
  }

  // כל ההפעלות כאן ולא למעלה: ‎WHO, CAT, shek ו-ils הם const באותו סקופ,
  // וכל קריאה מוקדמת יותר נופלת ב-TDZ. ‎A.fxRate נראה אסינכרוני אבל הוא
  // חוזר מיד כשאין רשת — וזה נתפס רק בבדיקת אופליין, לא במסך רגיל.
  paintSpend();
  A.fxRate(r => { if (r && r.jpy) { LIVE_JPY = r.jpy; paintSpend(); } });
  if (A.spend.url()) A.spend.sync(() => paintSpend());
  addEventListener('online', () => { if (A.spend.url()) A.spend.sync(() => paintSpend()); });
})();
