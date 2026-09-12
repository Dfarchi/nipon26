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
  const save = () => localStorage.setItem(KEY, JSON.stringify(store));
  const done = n => store[n] === true;
  const chosen = n => Array.isArray(store[n]) ? store[n] : (store[n] !== undefined ? [store[n]] : []);

  function render() {
    let h = `<div class="head"><div class="kicker">${openDec.length} החלטות · ${openTask.length} משימות</div>
      <div class="h1">מה פתוח</div></div>`;

    if (urgent.length) {
      h += `<div class="lbl" style="margin-top:16px">דדליין קרוב<i></i></div>`;
      urgent.forEach(i => {
        const cls = i.dl.days <= 2 ? 'warn' : 'hot';
        h += `<div class="card alert" style="margin-top:8px;padding:13px 15px" data-todo="${A.esc(i.n)}">
          <div style="display:flex;gap:9px;align-items:baseline">
            <span class="chip ${cls}">${i.dl.days === 0 ? 'היום' : i.dl.days === 1 ? 'מחר' : 'בעוד ' + i.dl.days + ' ימים'}</span>
            <div class="d" style="margin:0;flex:1">${i.n}</div>
            ${done(i.n) ? '<span class="chip ok">בוצע</span>' : ''}</div>
          <div class="t" style="margin-top:6px;font-size:.95rem">${A.esc(i.q).slice(0, 190)}</div></div>`;
      });
    }

    if (openDec.length) {
      h += `<div class="lbl" style="margin-top:22px;color:var(--ok)">החלטה פתוחה<i></i></div>`;
      openDec.forEach(i => {
        const picked = chosen(i.n);
        h += `<div class="card" style="margin-top:8px">
          <div style="display:flex;gap:10px;align-items:baseline">
            <span class="chip">${i.n}</span><div class="t" style="flex:1">${A.esc(i.q)}</div></div>
          <div class="steps" style="margin-top:10px">` +
          (i.o || []).map((o, k) => {
            const isPicked = picked.includes(k);
            return `<a class="step" data-dec="${A.esc(i.n)}" data-i="${k}" data-multi="${i.multi || 0}"
              style="cursor:pointer;text-decoration:none;color:inherit${isPicked ? ';border-color:color-mix(in srgb,var(--ok) 45%,transparent)' : ''}">
              <i class="pip" style="border:2px solid ${isPicked ? 'var(--ok)' : 'var(--dim)'};background:${isPicked ? 'var(--ok)' : 'none'};width:14px;height:14px"></i>
              <span>${A.esc(o.t)}</span>${i.rec === k ? '<span class="chip hot">מומלץ</span>' : ''}</a>`;
          }).join('') +
          `</div></div>`;
      });
    }

    h += `<div class="lbl q" style="margin-top:22px">משימות<i></i><span class="d">${rest.length}</span></div>`;
    rest.forEach(i => {
      h += `<a class="step" data-todo="${A.esc(i.n)}" style="margin-top:7px;align-items:flex-start;cursor:pointer;text-decoration:none;color:inherit${done(i.n) ? ';opacity:.5' : ''}">
        <b style="min-width:34px;font-size:.72rem">${i.n}</b>
        <span style="font-size:.88rem">${A.esc(i.q).slice(0, 160)}</span>
        ${done(i.n) ? '<span class="chip ok">בוצע</span>' : ''}</a>`;
    });

    h += `<div class="acts"><button class="cloud g" onclick="location.href='decisions.html'">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>הערות ופירוט מלא</span></button></div>`;
    document.getElementById('main').innerHTML = h;
  }

  render();

  document.getElementById('main').addEventListener('click', e => {
    const dec = e.target.closest('[data-dec]');
    if (dec) {
      const n = dec.dataset.dec, i = +dec.dataset.i, multi = +dec.dataset.multi;
      if (multi) {
        let arr = Array.isArray(store[n]) ? store[n] : [];
        if (arr.includes(i)) arr = arr.filter(x => x !== i);
        else { arr.push(i); if (arr.length > multi) arr.shift(); }
        store[n] = arr;
      } else {
        store[n] = (store[n] === i) ? undefined : i;
        if (store[n] === undefined) delete store[n];
      }
      save(); render();
      return;
    }
    const todo = e.target.closest('[data-todo]');
    if (todo) {
      const n = todo.dataset.todo;
      if (done(n)) delete store[n]; else store[n] = true;
      save(); render();
    }
  });
})();
