(function () {
  const A = App, T = A.T;
  A.boot('tools.html');

  const fx = (T.budget && T.budget.fx) || {};
  let h = `<div class="head"><div class="kicker">בשליפה, בלי רשת</div><div class="h1">כלים</div></div>`;

  // ---- שעון: ההפרש הוא מה שמפיל הזמנות שנפתחות ב-09:00 שעון יפן ----
  h += `<div class="lbl">מה השעה ביפן<i></i></div>
    <div class="card">
      <div class="clk">
        <div><b id="cJp">--:--</b><span id="dJp">🇯🇵 יפן</span></div>
        <i></i>
        <div><b id="cIl">--:--</b><span>כאן</span></div>
      </div>
      <div class="well" style="margin-top:12px">
        <div class="pk"><b>⏰</b><span id="gap"></span></div>
        <div class="pk"><b>🚌</b><span id="open9"></span></div>
      </div>
    </div>`;

  // ---- ין → שקל ----
  if (fx.jpy) {
    h += `<div class="lbl" style="margin-top:20px">כמה זה בשקלים<i></i>
      <span class="d">¥100 = ₪${(fx.jpy * 100).toFixed(2)}</span></div>
      <div class="card fxc">
        <div class="fxrow">
          <label><span>¥</span><input id="fxJpy" type="text" inputmode="numeric" placeholder="1,000"></label>
          <b>=</b>
          <label><span>₪</span><input id="fxIls" type="text" inputmode="decimal" placeholder="19.20"></label>
        </div>
        <div class="fxq">` +
          [500, 1000, 3000, 10000].map(v => `<button class="chip fxp" data-v="${v}">¥${v.toLocaleString()}</button>`).join('') +
        `</div>
        <div class="d" style="margin-top:9px">השער נבדק ${fx.asOf || '—'}. כרטיס אשראי מוסיף כ-2%.</div>
      </div>`;
  }

  // ---- חירום ----
  // 110 ו-119 הם המספרים היפניים, והם עובדים גם מטלפון נעול ובלי סים מקומי.
  // מה שמבקשים ראשון בשיחה הוא המיקום — ולכן כתובת הלילה יושבת כאן ביפנית,
  // מוכנה להקראה או להצגה, ולא במסך אחר.
  {
    const idx = A.dayIndex(), d = (T.days || [])[idx] || {};
    const m = String(d.t).match(/^(\d{1,2})\.(\d{1,2})/);
    const dt = m ? new Date(2026, +m[2] - 1, +m[1]) : null;
    const stay = dt && (T.budget.booked || []).find(b => {
      const p = String(b.d).split(/[–-]/);
      const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
      if (!s || !e) return false;
      return dt >= new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]) && dt < new Date(2026, +e[2] - 1, +e[1]);
    });
    const addr = stay ? ((T.stayAddr || {})[stay.n] || '') : '';

    h += `<div class="lbl" style="margin-top:20px">חירום<i></i></div>
      <div class="card">
        <div class="sos">
          <a href="tel:110"><b>110</b><span>משטרה</span></a>
          <a href="tel:119"><b>119</b><span>אמבולנס · כיבוי אש</span></a>
        </div>
        ${addr ? `<div class="well" style="margin-top:12px">
          <div class="pk"><b>📍</b><span>איפה אתם הלילה — להקריא או להראות</span></div>
          <div class="pk"><b></b><span class="jp" style="color:var(--ink);font-weight:700">${A.txt(addr)}</span></div>
        </div>` : ''}
        <div class="d" style="margin-top:9px">עובדים מכל טלפון ביפן, גם נעול וגם בלי סים מקומי.</div>
      </div>`;
  }

  // ---- שמות מקומיים ----
  // לא כפתור תרגום: אין כאן מה לתרגם, הכל עברית חוץ משמות פרטיים.
  // המתג מחליט אם השמות בסוגריים מוצגים. ביפן כן — צריך את 松島海岸駅
  // מול השילוט. בתכנון מהבית זה רעש.
  h += `<div class="lbl" style="margin-top:22px">שמות מקומיים<i></i></div>
    <div class="card">
      <button class="row-tog" id="namesTog" aria-pressed="${A.namesOn()}">
        <span><b>יפנית ולטינית בסוגריים</b>
          <span class="d">טוקיו (Tokyo · 東京) — להציג או להשקיט</span></span>
        <i class="sw"></i>
      </button>
    </div>`;

  // ---- ספר החותמות ----
  // 朱印 — חותמת אדומה שאוספים במקדשים. כאן חותמת לכל אזור שישנתם בו,
  // והזכייה נגזרת מהתאריך ולא נשמרת בשום מקום: מה שעבר עבר. אין מה
  // לאבד כשמוחקים את נתוני הדפדפן, ואין מה לזייף.
  const FRAME = ['circle', 'square', 'octagon', 'flower', 'mountain', 'wave'];
  const regions = [];
  T.days.forEach((d, i) => {
    const r = String(d.st || '').replace(/\s*·.*$/, '').trim();
    if (r && !regions.some(x => x.r === r)) regions.push({ r, first: i });
  });
  if (regions.length) {
    const now = A.dayIndex(), before = A.beforeTrip;   // ערך, לא פונקציה
    const got = regions.filter(x => !before && now >= x.first).length;
    h += `<div class="lbl" style="margin-top:22px">ספר החותמות<i></i>
      <span class="d">${got} מתוך ${regions.length}</span></div>
      <div class="card"><div class="shuin">` +
      regions.map((x, i) => {
        const on = !before && now >= x.first;
        const f = FRAME[i % FRAME.length];
        return `<div class="stamp${on ? ' on' : ''}" data-f="${f}">
          <img src="assets/shuin/shuin-${f}.webp" alt="" decoding="async" loading="lazy">
          <span>${A.txt(x.r)}</span></div>`;
      }).join('') +
      `</div><div class="d" style="margin-top:10px">חותמת לכל אזור שכבר ישנתם בו</div></div>`;
  }

  document.getElementById('main').innerHTML = h;

  const nt = document.getElementById('namesTog');
  if (nt) nt.onclick = () => {
    const on = nt.getAttribute('aria-pressed') !== 'true';
    nt.setAttribute('aria-pressed', on);
    A.setNames(on);
  };
  A.reveal(document.getElementById('main'));

  // ---- שעונים ----
  const JP = 'Asia/Tokyo';
  const hhmm = tz => new Intl.DateTimeFormat('he-IL',
    { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const dayIn = tz => new Intl.DateTimeFormat('he-IL',
    { timeZone: tz, weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date());
  // ההפרש נמדד ולא מוקשח: ישראל עוברת שעון קיץ ויפן לא, אז הוא זז פעמיים בשנה
  const offs = tz => {
    const d = new Date();
    return (new Date(d.toLocaleString('en-US', { timeZone: tz })) -
            new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 36e5;
  };
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function tick() {
    const cj = document.getElementById('cJp'), ci = document.getElementById('cIl');
    if (!cj) return;
    cj.textContent = hhmm(JP);
    ci.textContent = hhmm(here);
    document.getElementById('dJp').textContent = '🇯🇵 ' + dayIn(JP);
    const gap = Math.round(offs(JP) - offs(here));
    document.getElementById('gap').textContent =
      gap === 0 ? 'אותה שעה' : `יפן ${Math.abs(gap)} שעות ${gap > 0 ? 'לפנינו' : 'אחרינו'}`;
    // 09:00 ביפן — השעה שבה נפתחות הזמנות האוטובוס (I31)
    const loc = (9 - gap + 24) % 24;
    document.getElementById('open9').textContent =
      `09:00 ביפן = ${String(loc).padStart(2, '0')}:00 כאן — זו השעה שבה נפתחות הזמנות האוטובוס`;
  }
  tick();
  setInterval(tick, 20000);

  // ---- המרה: שני שדות שמזינים זה את זה, בלי כפתור "חשב" ----
  const j = document.getElementById('fxJpy'), s = document.getElementById('fxIls');
  if (j && s && fx.jpy) {
    const num = v => { const n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isFinite(n) ? n : null; };
    const fmt = n => n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
    j.addEventListener('input', () => { const n = num(j.value); s.value = n === null ? '' : fmt(n * fx.jpy); });
    s.addEventListener('input', () => { const n = num(s.value); j.value = n === null ? '' : fmt(Math.round(n / fx.jpy)); });
    document.querySelectorAll('.fxp').forEach(b => b.addEventListener('click', () => {
      j.value = (+b.dataset.v).toLocaleString('he-IL');
      s.value = fmt(+b.dataset.v * fx.jpy);
    }));
  }
})();
