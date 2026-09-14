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
  if (cur && (cur.f.addr || cur.f.phone || (T.stayAddr || {})[cur.n])) {
    h += `<div class="lbl" style="margin-top:16px">להראות לנהג<i></i><span class="jp" style="color:var(--soft)">タクシー</span></div>
      <div class="tcard">
        <div class="ask jp">ここまでお願いします</div>
        <div class="nm jp">${A.esc(cur.n).replace(/^[^—·]*[—·]\s*/, '')}</div>
        ${(T.stayAddr || {})[cur.n] || cur.f.addr ? `<div class="ad jp">${A.esc((T.stayAddr || {})[cur.n] || cur.f.addr)}</div>` : ''}
        ${cur.f.phone ? `<div class="ph">${cur.f.phone}</div>` : ''}
      </div>
      <div class="d" style="margin-top:6px;text-align:center">בהיר בכוונה — זה המסך היחיד שזר קורא</div>`;
  }

  // ---- דדליינים קרובים ----
  const allDeadlines = booked.map(b => ({ b, d: A.dl(b.f.free) })).filter(x => x.d && x.d.days >= 0)
    .sort((a, b) => a.d.days - b.d.days);
  const deadlines = allDeadlines.slice(0, 3);
  if (deadlines.length) {
    h += `<div class="lbl" style="margin-top:20px">ביטול חינם — מה שנסגר קרוב<i></i></div>
      <div class="well">`;
    deadlines.forEach(({ b, d }) => {
      const cls = d.days <= 2 ? 'warn' : d.days <= 7 ? 'hot' : '';
      h += `<div class="step" style="margin-top:7px"><b>${b.f.free}</b>
        <span>${A.esc(b.n)}</span>
        <span class="chip ${cls}">${d.days === 0 ? 'היום' : d.days === 1 ? 'מחר' : 'בעוד ' + d.days + ' ימים'}</span></div>`;
    });
    h += `</div>`;
    if (allDeadlines.length) {
      h += `<div class="acts" style="margin-top:10px"><button class="cloud g" id="icsBtn">
        ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>הוסיפו ליומן (.ics)</span></button></div>`;
    }
  }

  // ---- כל הלינות ----
  h += `<div class="lbl q" style="margin-top:22px">לינות<i></i><span class="d">${booked.length} מוזמנות</span></div>`;
  booked.forEach(b => {
    h += `<div class="card" style="margin-top:8px;padding:12px 14px${b.cur ? ';border-color:color-mix(in srgb,var(--hot) 45%,transparent)' : ''}">
      <div style="display:flex;align-items:baseline;gap:9px">
        <div class="t" style="flex:1">${A.esc(b.n)}</div>
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
        <b class="ic">${d.ic || '📄'}</b>
        <span><div class="t">${A.esc(d.t)}</div><div class="d" style="margin:0">${A.esc(d.d)}</div></span></a>`;
    });
  }
  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));

  const icsBtn = document.getElementById('icsBtn');
  if (icsBtn) icsBtn.onclick = () => downloadICS(allDeadlines);

  function pad(n) { return String(n).padStart(2, '0'); }
  function icsDate(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function icsEsc(s) { return String(s).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n'); }

  function downloadICS(list) {
    const stamp = icsDate(new Date()) + 'T000000Z';
    const events = list.map(({ b, d }) => {
      const next = new Date(d.date); next.setDate(next.getDate() + 1);
      return ['BEGIN:VEVENT',
        `UID:${b.n.replace(/\s+/g, '')}-${icsDate(d.date)}@nipon26`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(d.date)}`,
        `DTEND;VALUE=DATE:${icsDate(next)}`,
        `SUMMARY:${icsEsc('ביטול חינם עד — ' + b.n)}`,
        `DESCRIPTION:${icsEsc(b.n + ' · ' + b.d)}`,
        'END:VEVENT'].join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NIPON26//Trip//HE', 'CALSCALE:GREGORIAN']
      .concat(events).concat('END:VCALENDAR').join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nipon26-deadlines.ics';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
})();
