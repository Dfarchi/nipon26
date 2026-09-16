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
          ${b.cur ? '<span class="chip hot">כאן הלילה</span>' : ''}</div>
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


})();
