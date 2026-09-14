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

  document.getElementById('main').innerHTML = h;
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
