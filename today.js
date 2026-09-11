/* מסך "היום" — נגזר כולו מ-TRIP, בלי שום דבר קשיח.
   ?d=N כופה יום מסוים · ?theme=day|night כופה ערכה. */
(function () {
  const T = window.TRIP;
  if (!T || !T.days) return;
  const q = new URLSearchParams(location.search);
  const YEAR = 2026;

  // ---- תאריך לכל יום, מתוך הכותרת ("30.10 — ...") ----
  const dated = T.days.map((d, i) => {
    const m = String(d.t).match(/^(\d{1,2})\.(\d{1,2})/);
    return { i, d, date: m ? new Date(YEAR, +m[2] - 1, +m[1]) : null };
  });
  const first = dated.find(x => x.date).date;
  const last = [...dated].reverse().find(x => x.date).date;

  // ---- איזה יום מציגים ----
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let idx = null, before = false;
  if (q.has('d')) idx = Math.max(0, Math.min(T.days.length - 1, +q.get('d')));
  else {
    const hit = dated.find(x => x.date && x.date.getTime() === today0.getTime());
    if (hit) idx = hit.i;
    else if (today0 < first) { before = true; idx = 0; }
    else idx = T.days.length - 1;
  }
  const cur = T.days[idx];

  // ---- ערכה: יום או לילה ----
  const h = now.getHours();
  const theme = q.get('theme') || (h >= 6 && h < 17 ? 'day' : 'night');
  document.body.classList.toggle('is-day', theme === 'day');
  document.documentElement.style.setProperty('--ridge', theme === 'day' ? '#7f9bb0' : '#4a6478');
  document.documentElement.style.setProperty('--ridge2', theme === 'day' ? '#5d7f95' : '#26394a');
  document.querySelector('meta[name=theme-color]').content = theme === 'day' ? '#f3ece0' : '#0b0e14';
  drawVillage(theme);

  // ---- כותרת היום ----
  const dd = dated[idx].date;
  const DOW = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const head = String(cur.t).split('—');
  const dateTxt = (head[0] || '').trim();
  const rest = head.slice(1).join('—').trim();
  // "נקאנויו → נאראי → נגיסו (Nagiso · 南木曽) · 🟡 ..." → היעד בלבד
  let city = rest.split('(')[0].replace(/\s*·.*$/, '').trim();
  if (city.includes('→')) city = city.split('→').pop().trim();
  const jp = (rest.match(/·\s*([^)]*[　-鿿][^)]*)\)/) || [])[1] || '';
  const latin = (rest.match(/\(([A-Za-z][^·)]*)/) || [])[1] || '';

  // ---- לינה מהתקציב, לפי טווח התאריכים ----
  const stay = (T.budget && T.budget.booked || []).find(b => {
    const m = String(b.d).match(/^(\d{1,2})[.–-]/); if (!m) return false;
    const parts = String(b.d).split(/[–-]/);
    const s = parts[0].match(/(\d{1,2})\.?(\d{1,2})?/), e = (parts[1]||'').match(/(\d{1,2})\.(\d{1,2})/);
    if (!s || !e) return false;
    const sm = s[2] ? +s[2] : +e[2];
    const sd = new Date(YEAR, sm - 1, +s[1]), ed = new Date(YEAR, +e[2] - 1, +e[1]);
    return dd >= sd && dd < ed;
  });

  const acts = (cur.acts || []).filter(a => a && a.t);
  const crowd = c => c === '🔴' ? 'var(--warn)' : c === '🟡' ? 'var(--hot)' : 'var(--ok)';
  const strip = s => String(s || '').replace(/<[^>]+>/g, '');
  const firstTime = s => (String(s).match(/\b([0-2]?\d:[0-5]\d)\b/) || [])[1] || '';

  let html = '';

  if (before) {
    const days = Math.round((first - today0) / 864e5);
    html += `<div class="pre"><div class="kicker">עד ההמראה</div>
      <div class="n">${days}</div><div class="d">ימים · אל על LY91 · 13 אוק׳ 19:45</div></div>`;
  }

  html += `<div class="lede"${before ? ' style="padding-top:clamp(40px,12vh,90px)"' : ''}>
    <div class="kicker">יום ${idx + 1} · מתוך ${T.days.length}${cur.st ? ' · ' + cur.st : ''}</div>
    <div class="row">
      <div class="dnum">${dateTxt}</div>
      <div class="d" style="padding-bottom:6px">${DOW[dd.getDay()]}</div>
      <div style="flex:1"></div>
      <div style="display:flex;align-items:baseline;gap:7px;padding-bottom:5px">
        <div class="city">${city || latin}</div>${jp ? `<div class="jp">${jp}</div>` : ''}
      </div>
    </div>
  </div>`;

  if (acts.length) {
    const a = acts[0], tm = firstTime(a.d) || firstTime(a.t);
    html += `<div class="card now">
      <div class="lbl">עכשיו<i></i>${tm ? `<span class="big" style="color:var(--ink)">${tm}</span>` : ''}</div>
      <div class="t">${a.ic || ''} ${strip(a.t)}</div>
      ${a.d ? `<div class="d">${strip(a.d).slice(0, 150)}</div>` : ''}
      ${/⚠️|לא מובטח|לבדוק/.test(strip(a.d) + a.t) ? `<div class="note w">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-top:3px;flex:none"><path d="M12 7v6M12 16.5v.5"/><circle cx="12" cy="12" r="9.4" stroke-width="1.5"/></svg>
        <span>יש כאן משהו לא סגור — פתחו את היום המלא</span></div>` : ''}
    </div>`;
  }

  if (acts.length > 1) {
    html += `<div style="margin-top:16px"><div class="lbl" style="color:var(--soft)">אחר כך<i></i></div><div class="steps">`;
    acts.slice(1, 5).forEach(a => {
      const tm = firstTime(a.d) || firstTime(a.t);
      html += `<div class="step"><b>${tm || (a.ic || '·')}</b>
        <span>${strip(a.t)}</span><i class="pip" style="background:${crowd(a.cr)}"></i></div>`;
    });
    html += `</div></div>`;
  }

  if (stay) {
    html += `<div class="card"><div class="lbl" style="color:var(--soft)">הלילה<i></i></div>
      <div class="t">${strip(stay.n)}</div>
      <div class="d">${stay.d} · ${stay.nights} לילות${stay.meals ? ' · ' + stay.meals : ''}</div>
      ${stay.note ? `<div class="d" style="color:var(--hot)">${strip(stay.note).slice(0, 110)}</div>` : ''}</div>`;
  }

  const dest = encodeURIComponent((latin || city || '') + ' Japan');
  html += `<div class="acts">
    <button class="cloud" onclick="location.href='https://www.google.com/maps/search/?api=1&query=${dest}'">
      ${cloudSVG('#c1303f')}<span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff6e8" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8z"/></svg>ניווט</span>
    </button>
    <button class="cloud g" onclick="location.href='stage.html?s=${T.dayPhase[cur.st] ?? 0}'">
      ${cloudSVG(theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>היום המלא</span>
    </button>
  </div>`;

  document.getElementById('main').innerHTML = html;

  // ---- בורר יום לפיתוח ----
  const pick = document.getElementById('pick');
  pick.innerHTML = T.days.map((d, i) =>
    `<option value="${i}"${i === idx ? ' selected' : ''}>${i + 1}. ${String(d.t).slice(0, 22)}</option>`).join('');
  pick.onchange = () => { q.set('d', pick.value); location.search = q.toString(); };

  // ---- חיווי רשת ----
  const sync = () => {
    document.getElementById('netTxt').textContent = navigator.onLine ? 'מסונכרן' : 'אין רשת · מהזיכרון';
    document.getElementById('netDot').style.background = navigator.onLine ? 'var(--ok)' : 'var(--dim)';
  };
  addEventListener('online', sync); addEventListener('offline', sync); sync();

  function cloudSVG(fill) {
    return `<svg viewBox="0 0 160 58" preserveAspectRatio="none">
      <g fill="${fill}" opacity=".28"><circle cx="34" cy="32" r="19"/><circle cx="66" cy="24" r="23"/><circle cx="100" cy="27" r="21"/><circle cx="128" cy="33" r="17"/><rect x="34" y="32" width="94" height="19" rx="9.5"/></g>
      <g fill="${fill}"><circle cx="34" cy="32" r="16"/><circle cx="66" cy="24" r="20"/><circle cx="100" cy="27" r="18"/><circle cx="128" cy="33" r="14"/><rect x="34" y="32" width="94" height="16" rx="8"/></g></svg>`;
  }

  function drawVillage(mode) {
    const roof = mode === 'day' ? '#6b5a48' : '#18232e';
    const lit  = mode === 'day' ? '#a8906e' : '#f0a94e';
    const tree = mode === 'day' ? '#5c7a4a' : '#1d2b28';
    document.getElementById('village').innerHTML = `
      <g fill="${roof}">
        <path d="M18,76 L18,42 L24,42 L24,76 Z"/><path d="M4,46 L38,46 L32,40 L10,40 Z"/>
        <path d="M2,56 L40,56 L33,49 L9,49 Z"/><path d="M0,68 L42,68 L34,59 L8,59 Z"/>
        <path d="M62,76 L62,52 L86,40 L110,52 L110,76 Z"/>
        <path d="M112,76 L112,58 L134,47 L156,58 L156,76 Z"/>
        <path d="M232,76 L232,50 L258,37 L284,50 L284,76 Z"/>
        <path d="M286,76 L286,60 L306,50 L326,60 L326,76 Z"/>
        <path d="M328,76 L328,54 L356,40 L384,54 L384,76 Z"/>
      </g>
      <g fill="${tree}">
        <path d="M178,76 L178,62 L182,62 L182,76 Z M164,62 Q180,30 196,62 Z"/>
        <path d="M206,76 L206,66 L209,66 L209,76 Z M196,66 Q207,42 218,66 Z"/>
      </g>
      <g fill="${lit}" opacity=".92">
        <rect x="70" y="62" width="8" height="11" rx="1.5"/><rect x="92" y="62" width="8" height="11" rx="1.5"/>
        <rect x="244" y="60" width="9" height="13" rx="1.5"/><rect x="264" y="60" width="9" height="13" rx="1.5"/>
        <rect x="340" y="62" width="8" height="11" rx="1.5"/><rect x="362" y="62" width="8" height="11" rx="1.5"/>
        <rect x="124" y="66" width="7" height="9" rx="1.5"/><rect x="300" y="66" width="7" height="9" rx="1.5"/>
      </g>`;
  }
})();
