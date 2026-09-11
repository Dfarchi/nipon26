(function () {
  const A = App, T = A.T;
  A.boot('tasks.html');
  const items = (T.decisions || []).flatMap(g => (g.items || []).map(i => Object.assign({ g: g.g }, i)))
    .filter(i => !i.cut);
  const openDec  = items.filter(i => i.open === true && i.todo !== true);
  const openTask = items.filter(i => i.open === true && i.todo === true);

  // דדליין מתוך טקסט המשימה
  const withDl = openTask.map(i => {
    const m = A.esc(i.q).match(/(?:עד|דדליין[^0-9]{0,12})\s*(\d{1,2}\.\d{1,2})/);
    return Object.assign({ dl: m ? A.dl(m[1]) : null }, i);
  });
  const urgent = withDl.filter(i => i.dl && i.dl.days >= 0 && i.dl.days <= 14).sort((a, b) => a.dl.days - b.dl.days);
  const rest   = withDl.filter(i => !urgent.includes(i));

  const KEY = 'nipon26_choices_v1';
  let store = {}; try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const done = n => store[n] === true;

  let h = `<div class="head"><div class="kicker">${openDec.length} החלטות · ${openTask.length} משימות</div>
    <div class="h1">מה פתוח</div></div>`;

  if (urgent.length) {
    h += `<div class="lbl" style="margin-top:16px">דדליין קרוב<i></i></div>`;
    urgent.forEach(i => {
      const cls = i.dl.days <= 2 ? 'warn' : 'hot';
      h += `<div class="card alert" style="margin-top:8px;padding:13px 15px">
        <div style="display:flex;gap:9px;align-items:baseline">
          <span class="chip ${cls}">${i.dl.days === 0 ? 'היום' : i.dl.days === 1 ? 'מחר' : 'בעוד ' + i.dl.days + ' ימים'}</span>
          <div class="d" style="margin:0;flex:1">${i.n}</div></div>
        <div class="t" style="margin-top:6px;font-size:.95rem">${A.esc(i.q).slice(0, 190)}</div></div>`;
    });
  }

  if (openDec.length) {
    h += `<div class="lbl" style="margin-top:22px;color:var(--ok)">החלטה פתוחה<i></i></div>`;
    openDec.forEach(i => {
      h += `<div class="card" style="margin-top:8px">
        <div style="display:flex;gap:10px;align-items:baseline">
          <span class="chip">${i.n}</span><div class="t" style="flex:1">${A.esc(i.q)}</div></div>
        <div class="steps" style="margin-top:10px">` +
        (i.o || []).map((o, k) => `<div class="step"><i class="pip" style="border:2px solid var(--dim);background:none;width:14px;height:14px"></i>
          <span>${A.esc(o.t)}</span>${i.rec === k ? '<span class="chip hot">מומלץ</span>' : ''}</div>`).join('') +
        `</div></div>`;
    });
  }

  h += `<div class="lbl q" style="margin-top:22px">משימות<i></i><span class="d">${rest.length}</span></div>`;
  rest.forEach(i => {
    h += `<div class="step" style="margin-top:7px;align-items:flex-start${done(i.n) ? ';opacity:.5' : ''}">
      <b style="min-width:34px;font-size:.72rem">${i.n}</b>
      <span style="font-size:.88rem">${A.esc(i.q).slice(0, 160)}</span>
      ${done(i.n) ? '<span class="chip ok">בוצע</span>' : ''}</div>`;
  });

  h += `<div class="acts"><button class="cloud g" onclick="location.href='decisions.html'">
    ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>לסמן ולערוך</span></button></div>`;
  document.getElementById('main').innerHTML = h;
})();
