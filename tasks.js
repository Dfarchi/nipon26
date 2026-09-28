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
  // "בוצע" של משימה חי בגיליון (task:<n>), כמו הצ׳קליסט. store נשאר
  // מראה מקומית, כי דף ההחלטות המלא קורא ממנו. סימונים מקומיים ישנים
  // עולים לגיליון פעם אחת.
  const MIG = 'nipon26_tasks_migrated';
  try { if (!localStorage.getItem(MIG)) {
    openTask.forEach(i => { if (store[i.n] === true && !A.spend.marks('task')[i.n]) A.spend.markToggle('task', i.n, A.txt(i.q).slice(0, 80)); });
    localStorage.setItem(MIG, '1'); } } catch (e) {}
  let tdone = A.spend.marks('task');
  const mirror = () => { openTask.forEach(i => { if (tdone[i.n]) store[i.n] = true; else if (store[i.n] === true) delete store[i.n]; }); save(); };
  mirror();
  const done = n => !!tdone[n];

  // שורה שנפתחת. קודם כל השורה הייתה פקד "בוצע" והטקסט נחתך ב-95 תווים —
  // כלומר את המשימה עצמה אי אפשר היה לקרוא. עכשיו העיגול מסמן, והשורה
  // פותחת במקום את הטקסט המלא, התאריכים והלינקים (אותו .peek של המסלול).
  // הסימונים של "לפני הטיסה" חיים בגיליון ההוצאות (A.spend.markToggle),
  // לא ב-localStorage נפרד — כך יובל ושיר רואים אותו דבר.
  const PREP_KEY = 'nipon26_prep_v1';
  try { // סימונים מהגרסה הקודמת, שנשמרו רק בטלפון — עוברים לתור פעם אחת
    const old = JSON.parse(localStorage.getItem(PREP_KEY) || '{}');
    Object.keys(old).forEach(id => { if (!A.spend.marks('prep')[id]) A.spend.markToggle('prep', id, id); });
    localStorage.removeItem(PREP_KEY);
  } catch (e) {}
  let prep = A.spend.marks('prep');
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
  // משימה נפתחת בפאנל נגלל: הטקסט המלא, התאריכים, הלינקים והערה.
  // ההערה נשמרת באותו מפתח שדף ההחלטות הישן השתמש בו, כך שכלום לא אבד.
  const NKEY = 'nipon26_notes_v1';
  const notes = () => { try { return JSON.parse(localStorage.getItem(NKEY) || '{}'); } catch (e) { return {}; } };
  const taskRow = i => `
    <div class="trow${done(i.n) ? ' is-done' : ''}" data-todo="${A.esc(i.n)}">
      <button class="tick" type="button" data-tick="${A.esc(i.n)}" aria-label="בוצע" aria-pressed="${done(i.n)}"><i class="pip box"></i></button>
      <button class="step day sh" type="button" data-sheet="${A.esc(i.n)}">
        <b>${i.n}</b><span>${clip(A.txt(i.q), 95)}</span>${i.dl ? `<span class="chip ${i.dl.days <= 7 ? 'hot' : ''}">${i.dl.d}</span>` : ''}</button>
    </div>`;
  function showTask(n) {
    const i = items.find(x => x.n === n); if (!i) return;
    const ds = (i.due || []).map(x => Object.assign({}, x, A.dl(x.d) || {})).sort((a, b) => (a.days ?? 9e9) - (b.days ?? 9e9));
    const isDec = !i.todo, picked = chosen(n);
    const body = A.sheet(`<div style="display:flex;gap:8px;align-items:center;padding-inline-start:44px">
        <b style="color:var(--hot);font-size:var(--fs-meta)">${A.esc(i.n)}</b><span class="kicker" style="margin:0;padding:0">${A.txt(String(i.g || '').replace(/^[A-Z]+\s*·\s*/, ''))}</span></div>
      <div class="tfull" style="color:var(--ink);margin-top:6px">${A.rich(i.q)}</div>` +
      (ds.length ? `<div class="lbl q" style="margin-top:14px">תאריכים<i></i></div><div class="tdue">` +
        ds.map(x => `<div class="pk"><b>${x.d}</b><span>${A.txt(x.t)}</span>${x.days >= 0 ? `<i>${days(x.days)}</i>` : ''}</div>`).join('') + `</div>` : '') +
      links(i.l) +
      (isDec ? `<div class="lbl q" style="margin-top:14px">האפשרויות<i></i></div>` + (i.o || []).map((o, k) =>
        `<div class="topt${picked.includes(k) ? ' on' : ''}"><div class="t">${picked.includes(k) ? '✓ ' : ''}${A.txt(o.t)}${i.rec === k ? ' <span class="chip hot">מומלץ</span>' : ''}</div>
          ${o.d ? `<div class="d">${A.rich(o.d)}</div>` : ''}
          ${o.see && o.see !== '—' ? `<div class="d"><b>לראות/לעשות:</b> ${A.rich(o.see)}</div>` : ''}
          ${o.tp ? `<div class="d"><b>שיקול:</b> ${A.rich(o.tp)}</div>` : ''}${links(o.l)}</div>`).join('') : '') +
      `<div class="lbl q" style="margin-top:14px">הערה<i></i></div>
      <textarea class="bs-note" id="bsNote" rows="3" placeholder="למשל: מספר אישור, שם המקום שנבחר, שאלה לקלוד">${A.esc(notes()[n] || '')}</textarea>` +
      (i.todo ? `<button class="go" type="button" id="bsDone">${done(n) ? 'לבטל סימון בוצע' : 'סימון בוצע'}</button>` : ''));
    const ta = body.querySelector('#bsNote');
    ta.oninput = () => { const all = notes(); if (ta.value.trim()) all[n] = ta.value; else delete all[n];
      try { localStorage.setItem(NKEY, JSON.stringify(all)); } catch (e) {} };
    const bd = body.querySelector('#bsDone');
    if (bd) bd.onclick = () => { toggleTask(n); bd.textContent = done(n) ? 'לבטל סימון בוצע' : 'סימון בוצע'; };
  }
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
        (it.ref ? `<div class="d" style="margin-top:8px">קשור למשימה ${A.esc(it.ref)} ברשימת המשימות</div>` : '')
    });
  };
  const chosen = n => Array.isArray(store[n]) ? store[n] : (store[n] !== undefined ? [store[n]] : []);

  function render() {
    // הכותרת ספרה 26 משימות גם אחרי שסומנו — כלומר המספר לא זז לעולם,
    // וזה בדיוק המספר שמסתכלים עליו כדי לדעת אם מתקדמים.
    const doneN = openTask.filter(i => done(i.n)).length;
    let h = `<div class="head"><div class="kicker">${openDec.length} החלטות · ${
      openTask.length - doneN} משימות${doneN ? ' · ' + doneN + ' סומנו' : ''}</div>
      <div class="h1">מה פתוח</div></div>
      <div class="card sheetc" id="sheetC"></div>`;

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
        `</div>${links(lead.l)}<button class="go" type="button" data-sheet="${A.esc(lead.n)}">הערה ופירוט</button></div>`;
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
          `</div>
          <button class="go" type="button" data-sheet="${A.esc(i.n)}">הסבר לכל אפשרות</button></div>`;
      });
    }

    // לפני הטיסה — הצ׳קליסט מ-TRIP.prep. כל חלק נפתח במקום, כמו שלב במסלול.
    // פריט עם ref הוא משימה שכבר קיימת למטה; כאן הוא בניסוח של "מה לעשות".
    if ((T.prep || []).length) {
      const all = T.prep.flatMap(g => g.items), left = all.filter(it => !prep[it.id]).length;
      h += `<div class="lbl" style="margin-top:22px">לפני הטיסה<i></i><span class="d" id="prepLeft">${left}</span></div>
`;
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

    document.getElementById('main').innerHTML = h;
    A.reveal(document.getElementById('main'));
  A.jumpBar();
  }

  render();

  // החיבור לגיליון — אותו גיליון ואותה כתובת של ההוצאות בארנק. מחברים
  // פעם אחת בכל טלפון, כאן או בארנק, וזה משרת את שניהם.
  function paintSheet(msg) {
    const c = document.getElementById('sheetC'); if (!c) return;
    const on = !!A.spend.url();
    c.innerHTML = `<div style="display:flex;gap:10px;align-items:center">
        <i class="pip" style="background:${on ? 'var(--ok)' : 'var(--hot)'}"></i>
        <div style="flex:1"><div class="t" style="font-size:var(--fs-body)">${on ? 'מסונכרן עם הגיליון' : 'הסימונים נשמרים רק בטלפון הזה'}</div>
          <div class="d">${msg || (on ? 'מה שאחד מסמן כאן, השני רואה — דרך גיליון ההוצאות'
            : 'כדי שתראו אותו דבר, מחברים את גיליון ההוצאות (אותה כתובת בשני הטלפונים)')}</div></div>
        <button class="chip${on ? '' : ' hot'}" id="shBtn" type="button">${on ? 'שינוי' : 'לחבר'}</button></div>
      <div id="shForm" hidden style="margin-top:10px">
        <div class="d">כתובת ה-Apps Script של גיליון ההוצאות — אותה אחת שבארנק. מסתיימת ב-/exec.</div>
        <input id="shUrl" type="url" inputmode="url" placeholder="https://script.google.com/…/exec" value="${A.esc(A.spend.url())}"
          style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--well);color:var(--ink);font:inherit;font-size:var(--fs-meta)">
        <div style="display:flex;gap:8px;margin-top:9px"><button class="chip" id="shSave" type="button">שמירה</button>
          ${on ? '<button class="chip" id="shClr" type="button">ניתוק</button>' : ''}</div></div>`;
    document.getElementById('shBtn').onclick = () => { const f = document.getElementById('shForm'); f.hidden = !f.hidden; };
    document.getElementById('shSave').onclick = () => {
      A.spend.setUrl(document.getElementById('shUrl').value);
      paintSheet('מתחבר…'); pull(true);
    };
    const clr = document.getElementById('shClr');
    if (clr) clr.onclick = () => { A.spend.setUrl(''); paintSheet(); };
  }
  paintSheet();

  // משיכה מהגיליון: מה שהטלפון השני סימן מגיע כאן. צובעים רק את מה שהשתנה.
  let pullT = 0;
  function pull(now) {
    if (!A.spend.url()) return;
    clearTimeout(pullT);
    pullT = setTimeout(() => A.spend.sync(ok => {
      paintSheet(ok ? 'עודכן עכשיו' : 'הגיליון לא ענה — הסימונים מחכים בטלפון וישלחו כשתחזור קליטה');
      const before = prep; prep = A.spend.marks('prep');
      new Set(Object.keys(before).concat(Object.keys(prep))).forEach(id => { if (!!before[id] !== !!prep[id]) paintPrep(id); });
      const tb = tdone; tdone = A.spend.marks('task'); mirror();
      new Set(Object.keys(tb).concat(Object.keys(tdone))).forEach(n => { if (!!tb[n] !== !!tdone[n]) paintTodo(n); });
    }), now ? 0 : 600);
  }
  A.onLeave(() => clearTimeout(pullT));
  pull();

  // טיק לא בונה את המסך מחדש. בדקתי את התלות: urgent ו-rest נגזרים אך ורק
  // מ-due, ו-store לא משפיע על שום מיון או חלוקה — כלומר סימון משנה תצוגה
  // בלבד. innerHTML מלא כאן היה הורס 151 אלמנטים, מקפיץ את הגלילה, והורג
  // את האלמנט שהאצבע עליו באמצע הלחיצה.
  const sel = v => `[data-todo="${CSS.escape(v)}"]`;
  function toggleTask(n) {
    const it = openTask.find(i => i.n === n);
    A.spend.markToggle('task', n, it ? A.txt(it.q).slice(0, 80) : n);
    tdone = A.spend.marks('task'); mirror(); paintTodo(n);
    pull();
  }
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
    if (tick) { toggleTask(tick.dataset.tick); return; }
    const sh = e.target.closest('[data-sheet]');
    if (sh) { showTask(sh.dataset.sheet); return; }
    const pt = e.target.closest('[data-ptick]');
    if (pt) {
      const id = pt.dataset.ptick;
      A.spend.markToggle('prep', id, titleOf(id));
      prep = A.spend.marks('prep'); paintPrep(id);
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
