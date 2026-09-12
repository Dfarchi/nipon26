(function () {
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
  if (A.beforeTrip) {
    const n = Math.round((A.firstDay - A.today0) / 864e5);
    h += `<div style="text-align:center;padding:18px 0 2px"><div class="kicker">עד ההמראה</div>
      <div style="font-size:2.6rem;font-weight:800;color:var(--hot);line-height:1">${n}</div>
      <div class="d">ימים · אל על LY91 · 13 אוק׳ 19:45</div></div>`;
  }
  h += `<div class="head"${A.beforeTrip ? ' style="padding-top:clamp(30px,8vh,70px)"' : ''}>
    <div class="kicker">יום ${idx + 1} · מתוך ${T.days.length}${cur.st ? ' · ' + cur.st : ''}</div>
    <div class="row"><div class="dnum">${head[0].trim()}</div>
      <div class="d" style="padding-bottom:6px">${A.DOW[dd.getDay()]}</div><div style="flex:1"></div>
      <div style="display:flex;align-items:baseline;gap:7px;padding-bottom:5px">
        <div class="city">${city || latin}</div>${jp ? `<div class="jp">${jp}</div>` : ''}</div></div></div>`;

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
      ${f.addr ? `<div class="jp" style="margin-top:5px;font-size:.92rem">${f.addr}</div>` : ''}</div>`;
  }

  const dest = encodeURIComponent((latin || city || '') + ' Japan');
  const a0 = acts[0];
  const navLink = a0 && (a0.l || []).find(x => /🧭|מסלול/.test(x.t || ''));
  const navHref = navLink ? navLink.u : `https://www.google.com/maps/search/?api=1&query=${dest}`;
  h += `<div class="acts">
    <button class="cloud" onclick="location.href='${navHref}'">
      ${A.cloudSVG('var(--hi)')}<span>ניווט</span></button>
    <button class="cloud g" id="fullDayBtn">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>היום המלא</span></button></div>`;

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
      </div>`).join('') : `<div class="d" style="text-align:center;padding:10px 0">יום פנוי — בלי פעילויות מתוכננות</div>`) +
    `</div></div>`;

  document.getElementById('main').innerHTML = h;

  document.getElementById('fullDayBtn').onclick = () => {
    const w = document.getElementById('fullDayWrap');
    w.hidden = !w.hidden;
    if (!w.hidden) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pick = document.getElementById('pick');
  pick.innerHTML = T.days.map((d, i) => `<option value="${i}"${i === idx ? ' selected' : ''}>${i + 1}. ${String(d.t).slice(0, 20)}</option>`).join('');
  pick.onchange = () => { A.q.set('d', pick.value); location.search = A.q.toString(); };
})();
