App.screen('tasks.html', function () {
  const A = App, T = A.T;
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

  // שורה שנפתחת. קודם כל השורה הייתה פקד "בוצע" והטקסט נחתך ב-95 תווים —
  // כלומר את המשימה עצמה אי אפשר היה לקרוא. עכשיו העיגול מסמן, והשורה
  // פותחת במקום את הטקסט המלא, התאריכים והלינקים (אותו .peek של המסלול).
  // הסימונים של "לפני הטיסה" חיים בגיליון ההוצאות (A.spend.prepToggle),
  // לא ב-localStorage נפרד — כך יובל ושיר רואים אותו דבר.
  const PREP_KEY = 'nipon26_prep_v1';
  try { // סימונים מהגרסה הקודמת, שנשמרו רק בטלפון — עוברים לתור פעם אחת
    const old = JSON.parse(localStorage.getItem(PREP_KEY) || '{}');
    Object.keys(old).forEach(id => { if (!A.spend.prepDone()[id]) A.spend.prepToggle(id, id); });
    localStorage.removeItem(PREP_KEY);
  } catch (e) {}
  let prep = A.spend.prepDone();
  const titleOf = id => ((T.prep || []).flatMap(g => g.items).find(it => it.id === id) || {}).t || id;
  const links = l => (l || []).length ? `<div class="tlinks">` + l.map(x =>
    `<a class="chip" href="${A.esc(x.u)}" target="_blank" rel="noopener">${A.txt(x.t)}</a>`).join('') + `</div>` : '';
  const row = (o) => `
    <div class="trow${o.done ? ' is-done' : ''}" ${o.attr}>
      <button class="tick" type="button" ${o.tick} aria-label="בוצע" aria-pressed="${o.done}"><i class="pip box"></i></button>
      <button class="step day" type="button" data-open="${A.esc(o.key)}" aria-expanded="false">
        ${o.b ? `<b>${o.b}</b>` : ''}<span>${o.short}</span>${o.chip || ''}</button>
    </div>
    <div class="peek" data-peek="${A.esc(o.key)}"><div class="peek-in">${o.body}</div></div>`;
  const taskRow = i => row({
    key: 't:' + i.n, done: done(i.n), attr: `data-todo="${A.esc(i.n)}"`, tick: `data-tick="${A.esc(i.n)}"`,
    b: i.n, short: clip(A.txt(i.q), 95),
    chip: i.dl ? `<span class="chip ${i.dl.days <= 7 ? 'hot' : ''}">${i.dl.d}</span>` : '',
    body: `<div class="tfull">${A.rich(i.q)}</div>` +
      ((i.ds || []).length ? `<div class="tdue">` + i.ds.map(x => `<div class="pk"><b>${x.d}</b><span>${A.txt(x.t)}</span></div>`).join('') + `</div>` : '') +
      links(i.l) + `<a class="go" href="decisions.html#d-${encodeURIComponent(i.n)}">פירוט מלא והערות</a>`
  });
  const pdays = iso => { const [y, m, d] = iso.split('-').map(Number);
    return Math.round((new Date(y, m - 1, d) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5); };
  const prepRow = it => {
    const n = it.due ? pdays(it.due) : null, dd = it.due ? it.due.slice(8).replace(/^0/, '') + '.' + it.due.slice(5, 7).replace(/^0/, '') : '';
    const cls = n === null || prep[it.id] ? '' : n < 0 ? 'warn' : n <= 3 ? 'hot' : '';
    return row({
      key: 'p:' + it.id, done: !!prep[it.id], attr: `data-prep="${A.esc(it.id)}"`, tick: `data-ptick="${A.esc(it.id)}"`,
      b: '', short: A.txt(it.t), chip: it.due ? `<span class="chip ${cls}">${n < 0 && !prep[it.id] ? 'עבר · ' : ''}${dd}</span>` : '',
      body: (it.d ? `<div class="tfull">${A.rich(it.d)}</div>` : '') +
        links(it.u ? [{ t: '🔗 לינק', u: it.u }] : []) +
        (it.ref ? `<a class="go" href="decisions.html#d-${encodeURIComponent(it.ref)}">משימה ${A.esc(it.ref)} — פירוט מלא</a>` : '')
    });
  };
  const chosen = n => Array.isArray(store[n]) ? store[n] : (store[n] !== undefined ? [store[n]] : []);

  function render() {
    // הכותרת ספרה 26 משימות גם אחרי שסומנו — כלומר המספר לא זז לעולם,
    // וזה בדיוק המספר שמסתכלים עליו כדי לדעת אם מתקדמים.
    const doneN = openTask.filter(i => done(i.n)).length;
    let h = `<div class="head"><div class="kicker">${openDec.length} החלטות · ${
      openTask.length - doneN} משימות${doneN ? ' · ' + doneN + ' סומנו' : ''}</div>
      <div class="h1">מה פתוח</div></div>`;

    if (urgent.length) {
      h += `<div class="lbl" style="margin-top:16px">דדליין קרוב<i></i></div>`;
      // רק הקרוב ביותר הוא כרטיס. שלושה כרטיסי התראה זהים פירושם ששום אחד
      // מהם הוא לא התשובה ל"מה לעשות עכשיו" — עוצמה קיימת רק מול שקט.
      const lead = urgent[0], near = urgent.slice(1);
      const cls = lead.dl.days <= 2 ? 'warn' : lead.dl.days <= 7 ? 'hot' : '';
      // הכרטיס המוביל מציג את כל הטקסט — זו המשימה שעונה על "מה עכשיו".
      h += `<div class="card alert${done(lead.n) ? ' is-done' : ''}" style="margin-top:8px;padding:13px 15px" data-todo="${A.esc(lead.n)}">
        <div style="display:flex;gap:9px;align-items:center">
          <span class="chip ${cls} lead">${days(lead.dl.days)}</span>
          <div class="d" style="margin:0;flex:1">${lead.n}</div>
          <button class="tick" type="button" data-tick="${A.esc(lead.n)}" aria-label="בוצע" aria-pressed="${done(lead.n)}"><i class="pip box"></i></button></div>
        <div class="tfull" style="margin-top:6px">${A.rich(lead.q)}</div>
        <div class="steps well">` +
        lead.ds.map(x => `<div class="step"><b>${x.d}</b><span>${A.txt(x.t)}</span></div>`).join('') +
        `</div>${links(lead.l)}<a class="go" href="decisions.html#d-${encodeURIComponent(lead.n)}">פירוט מלא והערות</a></div>`;
      if (near.length) h += `<div class="tlist">` + near.map(taskRow).join('') + `</div>`;
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
          `</div><a class="go" href="decisions.html#d-${encodeURIComponent(i.n)}">הסבר לכל אפשרות</a></div>`;
      });
    }

    // לפני הטיסה — הצ׳קליסט מ-TRIP.prep. כל חלק נפתח במקום, כמו שלב במסלול.
    // פריט עם ref הוא משימה שכבר קיימת למטה; כאן הוא בניסוח של "מה לעשות".
    if ((T.prep || []).length) {
      const all = T.prep.flatMap(g => g.items), left = all.filter(it => !prep[it.id]).length;
      h += `<div class="lbl" style="margin-top:22px">לפני הטיסה<i></i><span class="d" id="prepLeft">${left}</span></div>
        <div class="d" id="prepSync" style="margin-top:2px">${A.spend.url()
          ? 'משותף דרך גיליון ההוצאות — מה שאחד מסמן, השני רואה'
          : 'נשמר בטלפון עד שמחברים את גיליון ההוצאות (ארנק ← לחבר גיליון) — ואז משותף לשניכם'}</div>`;
      T.prep.forEach((g, gi) => {
        const n = g.items.filter(it => !prep[it.id]).length;
        h += `<button class="step day psec" type="button" data-open="s:${gi}" aria-expanded="false" style="margin-top:7px">
            <span>${A.txt(g.h)}</span><span class="chip${n ? '' : ' ok'}" data-pcount="${gi}">${n ? n + ' פתוחים' : 'הכל בוצע'}</span></button>
          <div class="peek" data-peek="s:${gi}"><div class="peek-in">
            ${g.s ? `<div class="d" style="margin-bottom:6px">${A.txt(g.s)}</div>` : ''}
            <div class="tlist">${g.items.map(prepRow).join('')}</div></div></div>`;
      });
    }

    // מה שסומן יורד לתחתית. הוא עדיין שם — אפשר לבטל סימון — אבל הוא
    // לא עומד בין שתי משימות פתוחות.
    const ordered = rest.filter(i => !done(i.n)).concat(rest.filter(i => done(i.n)));
    h += `<div class="lbl q" style="margin-top:22px">משימות<i></i><span class="d">${
      rest.length - rest.filter(i => done(i.n)).length}</span></div>`;
    h += `<div class="tlist">` + ordered.map(taskRow).join('') + `</div>`;

    h += `<div class="acts"><button class="cloud g" onclick="location.href='decisions.html'">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>הערות ופירוט מלא</span></button></div>`;
    document.getElementById('main').innerHTML = h;
    A.reveal(document.getElementById('main'));
  A.jumpBar();
  }

  render();

  // משיכה מהגיליון: מה שהטלפון השני סימן מגיע כאן. צובעים רק את מה שהשתנה.
  let pullT = 0;
  function pull() {
    if (!A.spend.url()) return;
    clearTimeout(pullT);
    pullT = setTimeout(() => A.spend.sync(ok => {
      const before = prep; prep = A.spend.prepDone();
      new Set(Object.keys(before).concat(Object.keys(prep))).forEach(id => { if (!!before[id] !== !!prep[id]) paintPrep(id); });
      const st = document.getElementById('prepSync');
      if (st && !ok) st.textContent = 'הגיליון לא ענה — הסימונים מחכים בטלפון וישלחו כשתחזור קליטה';
    }), 600);
  }
  A.onLeave(() => clearTimeout(pullT));
  pull();

  // טיק לא בונה את המסך מחדש. בדקתי את התלות: urgent ו-rest נגזרים אך ורק
  // מ-due, ו-store לא משפיע על שום מיון או חלוקה — כלומר סימון משנה תצוגה
  // בלבד. innerHTML מלא כאן היה הורס 151 אלמנטים, מקפיץ את הגלילה, והורג
  // את האלמנט שהאצבע עליו באמצע הלחיצה.
  const sel = v => `[data-todo="${CSS.escape(v)}"]`;
  const paintTodo = n => {
    document.querySelectorAll(sel(n)).forEach(el => el.classList.toggle('is-done', done(n)));
    document.querySelectorAll(`[data-tick="${CSS.escape(n)}"]`).forEach(b => b.setAttribute('aria-pressed', done(n)));
  };
  const paintPrep = id => {
    document.querySelectorAll(`[data-prep="${CSS.escape(id)}"]`).forEach(el => el.classList.toggle('is-done', !!prep[id]));
    document.querySelectorAll(`[data-ptick="${CSS.escape(id)}"]`).forEach(b => b.setAttribute('aria-pressed', !!prep[id]));
    (T.prep || []).forEach((g, gi) => {
      const c = document.querySelector(`[data-pcount="${gi}"]`); if (!c) return;
      const n = g.items.filter(it => !prep[it.id]).length;
      c.textContent = n ? n + ' פתוחים' : 'הכל בוצע'; c.classList.toggle('ok', !n);
    });
    const pl = document.getElementById('prepLeft');
    if (pl) pl.textContent = T.prep.flatMap(g => g.items).filter(it => !prep[it.id]).length;
  };
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
    const tick = e.target.closest('[data-tick]');
    if (tick) {
      const n = tick.dataset.tick;
      if (done(n)) delete store[n]; else store[n] = true;
      save(); paintTodo(n);
      return;
    }
    const pt = e.target.closest('[data-ptick]');
    if (pt) {
      const id = pt.dataset.ptick;
      A.spend.prepToggle(id, titleOf(id));
      prep = A.spend.prepDone(); paintPrep(id);
      pull();
      return;
    }
    const op = e.target.closest('[data-open]');
    if (op) {
      const pk = document.querySelector(`[data-peek="${CSS.escape(op.dataset.open)}"]`);
      if (!pk) return;
      const on = pk.classList.toggle('on');
      op.setAttribute('aria-expanded', on);
    }
  });
});
