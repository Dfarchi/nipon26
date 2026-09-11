(function () {
  const A = App, T = A.T;
  A.boot('wallet.html');
  const idx = A.dayIndex(), dd = A.dated[idx].date;
  const money = b => b.jpy ? '¥' + b.jpy.toLocaleString() : b.usd ? '$' + b.usd : b.ils ? '₪' + b.ils : '';

  const booked = (T.budget.booked || []).map(b => {
    const p = String(b.d).split(/[–-]/);
    const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
    const sd = s && e ? new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]) : null;
    const ed = e ? new Date(2026, +e[2] - 1, +e[1]) : null;
    return Object.assign({}, b, { sd, ed, cur: sd && ed && dd >= sd && dd < ed, f: A.factsFor(b.n) });
  }).sort((a, b) => (a.sd || 0) - (b.sd || 0));

  const cur = booked.find(b => b.cur) || booked.find(b => b.sd && b.sd >= A.today0) || booked[0];

  let h = `<div class="head"><div class="kicker">הכל שמור במכשיר</div><div class="h1">הארנק</div></div>`;

  // ---- כרטיס להראות לנהג ----
  if (cur && (cur.f.addr || cur.f.phone)) {
    h += `<div class="lbl" style="margin-top:16px">להראות לנהג<i></i><span class="jp" style="color:var(--soft)">タクシー</span></div>
      <div class="tcard">
        <div class="ask jp">ここまでお願いします</div>
        <div class="nm jp">${A.esc(cur.n).replace(/^[^—·]*[—·]\s*/, '')}</div>
        ${cur.f.addr ? `<div class="ad jp">${cur.f.addr}</div>` : ''}
        ${cur.f.phone ? `<div class="ph">${cur.f.phone}</div>` : ''}
      </div>
      <div class="d" style="margin-top:6px;text-align:center">בהיר בכוונה — זה המסך היחיד שזר קורא</div>`;
  }

  // ---- דדליינים קרובים ----
  const deadlines = booked.map(b => ({ b, d: A.dl(b.f.free) })).filter(x => x.d && x.d.days >= 0)
    .sort((a, b) => a.d.days - b.d.days).slice(0, 3);
  if (deadlines.length) {
    h += `<div class="lbl" style="margin-top:20px">ביטול חינם — מה שנסגר קרוב<i></i></div>`;
    deadlines.forEach(({ b, d }) => {
      const cls = d.days <= 2 ? 'warn' : d.days <= 7 ? 'hot' : '';
      h += `<div class="step" style="margin-top:7px"><b>${b.f.free}</b>
        <span>${A.esc(b.n)}</span>
        <span class="chip ${cls}">${d.days === 0 ? 'היום' : d.days === 1 ? 'מחר' : 'בעוד ' + d.days + ' ימים'}</span></div>`;
    });
  }

  // ---- כל הלינות ----
  h += `<div class="lbl q" style="margin-top:22px">לינות<i></i><span class="d">${booked.length} מוזמנות</span></div>`;
  booked.forEach(b => {
    h += `<div class="card" style="margin-top:8px;padding:12px 14px${b.cur ? ';border-color:color-mix(in srgb,var(--hot) 45%,transparent)' : ''}">
      <div style="display:flex;align-items:baseline;gap:9px">
        <div class="t" style="flex:1;font-size:.95rem">${A.esc(b.n)}</div>
        <div class="d" style="margin:0">${money(b)}</div></div>
      <div class="d">${b.d} · ${b.nights} לילות${b.meals ? ' · ' + b.meals : ''}${b.est ? ' · הערכה' : ''}</div>
      ${b.f.addr ? `<div class="jp" style="margin-top:4px">${b.f.addr}</div>` : ''}
      ${b.cur ? '<span class="chip hot" style="margin-top:7px">כאן הלילה</span>' : ''}
      ${b.note ? `<div class="d" style="color:var(--hot);margin-top:5px">${A.esc(b.note).slice(0, 110)}</div>` : ''}
    </div>`;
  });

  // ---- מסמכים ----
  if ((T.docs || []).length) {
    h += `<div class="lbl q" style="margin-top:22px">מסמכים<i></i></div>`;
    T.docs.forEach(d => {
      h += `<a href="${d.url}" target="_blank" rel="noopener" class="step" style="margin-top:7px;text-decoration:none;color:inherit">
        <b style="font-size:1.1rem">${d.ic || '📄'}</b>
        <span><div class="t" style="font-size:.92rem">${A.esc(d.t)}</div><div class="d" style="margin:0">${A.esc(d.d)}</div></span></a>`;
    });
  }
  document.getElementById('main').innerHTML = h;
})();
