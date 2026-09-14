(function () {
  const MON = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];
  const A = App, T = A.T;
  A.boot('today.html');
  const idx = A.dayIndex(), cur = T.days[idx], dd = A.dated[idx].date;

  const head = String(cur.t).split('—');
  const rest = head.slice(1).join('—').trim();
  let city = rest.split('(')[0].replace(/\s*·.*$/, '').trim();
  if (city.includes('→')) city = city.split('→').pop().trim();
  const jp = (rest.match(/·\s*([^)]*[　-鿿][^)]*)\)/) || [])[1] || '';
  const latin = (rest.match(/\(([A-Za-z][^·)]*)/) || [])[1] || '';

  const acts = (cur.acts || []).filter(a => a && a.t);
  const crowd = c => c === '🔴' ? 'var(--warn)' : c === '🟡' ? 'var(--hot)' : 'var(--ok)';
  const time = s => (String(s).match(/\b([0-2]?\d:[0-5]\d)\b/) || [])[1] || '';

  const stay = (T.budget.booked || []).find(b => {
    const p = String(b.d).split(/[–-]/);
    const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
    if (!s || !e) return false;
    const sd = new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]), ed = new Date(2026, +e[2] - 1, +e[1]);
    return dd >= sd && dd < ed;
  });

  let h = '';
  // סופרים עד ההמראה עצמה, לא עד היום הראשון בטיול — הם לא אותו תאריך.
  const fl = T.flight || {};
  const dep = fl.dep ? new Date(fl.dep) : null;
  const dep0 = dep ? new Date(dep.getFullYear(), dep.getMonth(), dep.getDate()) : A.firstDay;
  const toGo = Math.round((dep0 - A.today0) / 864e5);
  if (A.beforeTrip) {
    const hhmm = dep ? String(dep.getHours()).padStart(2, '0') + ':' + String(dep.getMinutes()).padStart(2, '0') : '';
    const when = dep ? `${dep.getDate()} ${MON[dep.getMonth()]}׳ ${hhmm}` : '';
    h += `<div class="countdown"><div class="kicker">${toGo === 0 ? 'היום' : 'עד ההמראה'}</div>
      <div class="n">${toGo}</div>
      <div class="d">ימים${fl.airline ? ' · ' + fl.airline : ''}${fl.code ? ' ' + fl.code : ''}${when ? ' · ' + when : ''}</div></div>`;
  }
  h += `<div class="head"${A.beforeTrip ? ' style="padding-top:clamp(30px,8vh,70px)"' : ''}>
    <div class="kicker">יום ${idx + 1} · מתוך ${T.days.length}${cur.st ? ' · ' + cur.st : ''}</div>
    <div class="row"><div class="dnum">${head[0].trim()}</div>
      <div class="d" style="padding-bottom:6px">${A.DOW[dd.getDay()]}</div><div style="flex:1"></div>
      <div style="display:flex;align-items:baseline;gap:7px;padding-bottom:5px">
        <div class="city">${city || latin}</div>${jp ? `<div class="jp">${jp}</div>` : ''}</div></div></div>`;

  // הברכה נכתבת לפני ה-head, כדי שהיא תהיה השורה הראשונה שקוראים
  {
    const tail = A.beforeTrip
      ? `${toGo} ימים לטיסה`
      : `יום ${idx + 1} · ${city || latin || ''}`.trim().replace(/ ·\s*$/, '');
    const slot = document.getElementById('hello');
    if (slot) { slot.outerHTML = A.hello(tail); A.wireWho(document.querySelector('.ping.ask'), tail); }
  }

  if (cur.flag) h += `<div class="flagnote">${A.rich(cur.flag)}</div>`;

  if (acts.length) {
    const a = acts[0], tm = time(a.d) || time(a.t);
    h += `<div class="card now"><div class="lbl">עכשיו<i></i>${tm ? `<span class="big">${tm}</span>` : ''}</div>
      <div class="t">${a.ic || ''} ${A.esc(a.t)}</div>
      ${a.d ? `<div class="d">${A.esc(a.d).slice(0, 160)}</div>` : ''}</div>`;
  }
  if (acts.length > 1) {
    h += `<div style="margin-top:16px"><div class="lbl q">אחר כך<i></i></div><div class="steps">` +
      acts.slice(1, 6).map(a => `<div class="step"><b>${time(a.d) || time(a.t) || (a.ic || '·')}</b>
        <span>${A.esc(a.t)}</span><i class="pip" style="background:${crowd(a.cr)}"></i></div>`).join('') + `</div></div>`;
  }
  if (stay) {
    const f = A.factsFor(stay.n);
    h += `<div class="card"><div class="lbl q">הלילה<i></i></div><div class="t">${A.esc(stay.n)}</div>
      <div class="d">${stay.d} · ${stay.nights} לילות${stay.meals ? ' · ' + stay.meals : ''}</div>
      ${f.addr ? `<div class="jp" style="margin-top:5px">${f.addr}</div>` : ''}</div>`;
  }

  // יעד הניווט, מהמדויק לכללי. אין יעד מדויק — אין כפתור: עדיף בלי, מאשר
  // לשלוח את שניכם לחיפוש "טוקיו" כללי כשאתם עומדים ברחוב.
  const a0 = acts[0];
  const navLink = (acts.map(a => (a.l || []).find(x => /🧭|מסלול/.test(x.t || ''))).find(Boolean))
    || (a0 && (a0.l || []).find(x => /🗺️/.test(x.t || '')));
  const stayAddr = stay && ((T.stayAddr || {})[stay.n] || A.factsFor(stay.n).addr || '');
  const cityQ = latin || jp || '';
  const navHref = navLink ? navLink.u
    : stayAddr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(stayAddr)
    : cityQ ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(cityQ + ' Japan')
    : '';
  h += `<div class="acts">
    ${navHref ? `<button class="cloud" onclick="location.href='${navHref}'">
      ${A.cloudSVG('var(--hi)', 'var(--key)')}<span>ניווט</span></button>` : ''}
    <button class="cloud g" id="fullDayBtn">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>היום המלא</span></button></div>`;

  // מחשבון ין→שקל. הרעיון של שירשה, והוא נכון: זה החישוב שעושים עשרים
  // פעם ביום מול תפריט, והוא לא דורש רשת — השער כבר בנתונים.
  {
    const fx = (T.budget && T.budget.fx) || {};
    if (fx.jpy) {
      h += `<div class="lbl q" style="margin-top:20px">כמה זה בשקלים<i></i>
        <span class="d">¥100 = ₪${(fx.jpy * 100).toFixed(2)}</span></div>
        <div class="card fxc">
          <div class="fxrow">
            <label><span>¥</span><input id="fxJpy" type="text" inputmode="numeric" placeholder="1,000"></label>
            <b>=</b>
            <label><span>₪</span><input id="fxIls" type="text" inputmode="decimal" placeholder="19.20"></label>
          </div>
          <div class="fxq">` +
            [500, 1000, 3000, 10000].map(v => `<button class="chip fxp" data-v="${v}">¥${v.toLocaleString()}</button>`).join('') +
          `</div></div>`;
    }
  }

  h += `<div id="fullDayWrap" hidden style="margin-top:16px">
    <div class="lbl q">כל הפעילויות היום<i></i></div>
    <div class="steps" style="margin-top:8px">` +
    (acts.length ? acts.map(a => `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="t" style="flex:1">${a.ic || ''} ${A.esc(a.t)}</div>
          <i class="pip" style="background:${crowd(a.cr)}"></i>
        </div>
        ${a.d ? `<div class="d" style="margin-top:5px;line-height:1.5">${A.esc(a.d)}</div>` : ''}
        ${(a.l || []).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">` +
          a.l.map(x => `<a class="chip" href="${x.u}" target="_blank" rel="noopener" style="text-decoration:none">${A.esc(x.t)}</a>`).join('') +
          `</div>` : ''}
      </div>`).join('') : `<div class="empty">${(window.ART && ART.onigiri) ? ART.onigiri({ w: 58 }) : ''}
        <div class="d">יום פנוי — בלי פעילויות מתוכננות</div></div>`) +
    `</div></div>`;

  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));

  // שני שדות שמזינים זה את זה. עיצוב מכוון: אין כפתור "חשב" — מקלידים ורואים.
  {
    const fx = (T.budget && T.budget.fx) || {}, j = document.getElementById('fxJpy'), s = document.getElementById('fxIls');
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
  }

  document.getElementById('fullDayBtn').onclick = () => {
    const w = document.getElementById('fullDayWrap');
    w.hidden = !w.hidden;
    if (!w.hidden) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pick = document.getElementById('pick');
  pick.innerHTML = T.days.map((d, i) => `<option value="${i}"${i === idx ? ' selected' : ''}>${i + 1}. ${String(d.t).slice(0, 20)}</option>`).join('');
  pick.onchange = () => { A.q.set('d', pick.value); location.search = A.q.toString(); };
})();
