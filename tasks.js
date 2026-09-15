(function () {
  const A = App, T = A.T;
  A.boot('tasks.html');
  const items = (T.decisions || []).flatMap(g => (g.items || []).map(i => Object.assign({ g: g.g }, i)))
    .filter(i => !i.cut);
  const openDec  = items.filter(i => i.open === true && i.todo !== true);
  const openTask = items.filter(i => i.open === true && i.todo === true);

  // הדדליינים מגיעים משדה due, לא מפרסור הטקסט. תאריך בפרוזה יכול להיות דדליין
  // ביטול, תאריך שבו נפתחת הזמנה, או סתם יום נסיעה — ובאותה משימה מופיעים כמה
  // סוגים יחד (I31: 27.9 פתיחה מול 27.10 נסיעה). שום רג׳קס לא מבדיל ביניהם,
  // והישן תפס אחת מתוך 17 המשימות שנושאות תאריך.
  const days = n => n === 0 ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים';
  const withDl = openTask.map(i => {
    const ds = (i.due || []).map(x => Object.assign({}, x, A.dl(x.d) || {}))
      .filter(x => x.date && x.days >= 0).sort((a, b) => a.days - b.days);
    return Object.assign({ ds, dl: ds[0] || null }, i);
  });
  // תמיד שלוש הקרובות, ולא "עד 14 יום" — סף קבוע מציג מסך ריק רוב השנה
  const urgent = withDl.filter(i => i.dl).sort((a, b) => a.dl.days - b.dl.days).slice(0, 3);
  const rest   = withDl.filter(i => !urgent.includes(i))
    .sort((a, b) => (a.dl ? a.dl.days : 9e9) - (b.dl ? b.dl.days : 9e9));

  const KEY = 'nipon26_choices_v1';
  let store = {}; try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const save = () => localStorage.setItem(KEY, JSON.stringify(store));
  // קיצוץ על גבול מילה — חיתוך באמצע סוגריים נראה כמו תקלה
  const clip = (s, n) => { s = String(s); if (s.length <= n) return s;
    const c = s.slice(0, n); const i = c.lastIndexOf(' ');
    return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s(\[·—-]+$/, '') + '…'; };
  const done = n => store[n] === true;
  const chosen = n => Array.isArray(store[n]) ? store[n] : (store[n] !== undefined ? [store[n]] : []);

  function render() {
    let h = `<div class="head"><div class="kicker">${openDec.length} החלטות · ${openTask.length} משימות</div>
      <div class="h1">מה פתוח</div></div>`;

    if (urgent.length) {
      h += `<div class="lbl" style="margin-top:16px">דדליין קרוב<i></i></div>`;
      // רק הקרוב ביותר הוא כרטיס. שלושה כרטיסי התראה זהים פירושם ששום אחד
      // מהם הוא לא התשובה ל"מה לעשות עכשיו" — עוצמה קיימת רק מול שקט.
      const lead = urgent[0], near = urgent.slice(1);
      const cls = lead.dl.days <= 2 ? 'warn' : lead.dl.days <= 7 ? 'hot' : '';
      h += `<div class="card alert${done(lead.n) ? ' is-done' : ''}" style="margin-top:8px;padding:13px 15px" data-todo="${A.esc(lead.n)}">
        <div style="display:flex;gap:9px;align-items:baseline">
          <span class="chip ${cls} lead">${days(lead.dl.days)}</span>
          <div class="d" style="margin:0;flex:1">${lead.n}</div>
          <span class="chip ok flag">בוצע</span></div>
        <div class="t" style="margin-top:6px">${clip(A.txt(lead.q), 150)}</div>
        <div class="steps well">` +
        lead.ds.map(x => `<div class="step"><b>${x.d}</b><span>${A.txt(x.t)}</span></div>`).join('') +
        `</div></div>`;
      if (near.length) {
        h += `<div class="well" style="margin-top:8px">` + near.map(i => `
          <a class="step${done(i.n) ? ' is-done' : ''}" data-todo="${A.esc(i.n)}" style="cursor:pointer;text-decoration:none;color:inherit">
            <b>${i.dl.d}</b><span>${clip(A.txt(i.q), 80)}</span>
            <span class="chip">${days(i.dl.days)}</span>
            <span class="chip ok flag">בוצע</span></a>`).join('') + `</div>`;
      }
    }

    if (openDec.length) {
      h += `<div class="lbl" style="margin-top:22px;color:var(--ok)">החלטה פתוחה<i></i></div>`;
      openDec.forEach(i => {
        const picked = chosen(i.n);
        h += `<div class="card" style="margin-top:8px">
          <div style="display:flex;gap:10px;align-items:baseline">
            <span class="chip">${i.n}</span><div class="t" style="flex:1">${A.txt(i.q)}</div></div>
          <div class="steps well">` +
          (i.o || []).map((o, k) => {
            const isPicked = picked.includes(k);
            return `<a class="step opt${isPicked ? ' is-picked' : ''}" data-dec="${A.esc(i.n)}" data-i="${k}" data-multi="${i.multi || 0}"
              style="cursor:pointer;text-decoration:none;color:inherit">
              <i class="pip box"></i>
              <span>${A.txt(o.t)}</span>${i.rec === k ? '<span class="chip hot">מומלץ</span>' : ''}</a>`;
          }).join('') +
          `</div></div>`;
      });
    }

    h += `<div class="lbl q" style="margin-top:22px">משימות<i></i><span class="d">${rest.length}</span></div>`;
    rest.forEach(i => {
      h += `<a class="step${done(i.n) ? ' is-done' : ''}" data-todo="${A.esc(i.n)}" style="margin-top:7px;align-items:flex-start;cursor:pointer;text-decoration:none;color:inherit">
        <b style="min-width:34px">${i.n}</b>
        <span>${clip(A.txt(i.q), 150)}</span>
        ${i.dl ? `<span class="chip ${i.dl.days <= 7 ? 'hot' : ''}">${i.dl.d}</span>` : ''}
        <span class="chip ok flag">בוצע</span></a>`;
    });

    h += `<div class="acts"><button class="cloud g" onclick="location.href='decisions.html'">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>הערות ופירוט מלא</span></button></div>`;
    document.getElementById('main').innerHTML = h;
    A.reveal(document.getElementById('main'));
  }

  render();

  // טיק לא בונה את המסך מחדש. בדקתי את התלות: urgent ו-rest נגזרים אך ורק
  // מ-due, ו-store לא משפיע על שום מיון או חלוקה — כלומר סימון משנה תצוגה
  // בלבד. innerHTML מלא כאן היה הורס 151 אלמנטים, מקפיץ את הגלילה, והורג
  // את האלמנט שהאצבע עליו באמצע הלחיצה.
  const sel = v => `[data-todo="${CSS.escape(v)}"]`;
  const paintTodo = n => document.querySelectorAll(sel(n))
    .forEach(el => el.classList.toggle('is-done', done(n)));
  const paintDec = n => {
    const picked = chosen(n);
    document.querySelectorAll(`[data-dec="${CSS.escape(n)}"]`)
      .forEach(el => el.classList.toggle('is-picked', picked.includes(+el.dataset.i)));
  };

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
      save(); paintDec(n);
      return;
    }
    const todo = e.target.closest('[data-todo]');
    if (todo) {
      const n = todo.dataset.todo;
      if (done(n)) delete store[n]; else store[n] = true;
      save(); paintTodo(n);
    }
  });
})();
