(function () {
  const A = App, T = A.T;
  A.boot('itinerary.html');
  const idx = A.dayIndex();
  const clip = (s, n) => s.length > n ? s.slice(0, n).trim() + '…' : s;

  const phases = (T.phases || []).map((p, i) => ({ p, i }));
  const active = phases.filter(x => !x.p.parked);
  const parked = phases.filter(x => x.p.parked);

  const byPhase = {};
  (T.days || []).forEach((d, i) => {
    const ph = T.dayPhase[d.st];
    if (ph == null) return;
    (byPhase[ph] = byPhase[ph] || []).push({ d, i });
  });
  const curPhase = T.dayPhase[T.days[idx].st];
  const title = h => h.replace(/^\s*שלב\s*[\d.]+\s*·?\s*/, '').trim();

  // מצב הפתיחה נשמר במכשיר: אם פתחת שלב, הלכת ליום וחזרת — הוא עדיין פתוח.
  const KEY = 'nipon26_phases_v1';
  let open = null;
  // ריק שנשמר בכוונה הוא לא "מעולם לא נשמר" — אחרת קיפול של הכל היה נפתח ברענון
  try { const raw = localStorage.getItem(KEY); if (raw) open = new Set(JSON.parse(raw)); } catch (e) {}
  if (!open) open = new Set([curPhase]);                 // ברירת מחדל: רק הנוכחי
  const saveOpen = () => { try { localStorage.setItem(KEY, JSON.stringify([...open])); } catch (e) {} };

  function draw() {
    let h = `<div class="head"><div class="kicker">${active.length} שלבים · ${T.days.length} ימים</div>
      <div class="h1">המסלול</div></div>`;

    h += `<div style="position:relative;margin-top:18px;padding-right:20px">
      <div style="position:absolute;right:6px;top:6px;bottom:6px;width:2px;border-radius:2px;
        background:linear-gradient(var(--hi),var(--hot),var(--ok))"></div>`;

    active.forEach(({ p, i }) => {
      const isCur = i === curPhase;
      const isOpen = open.has(i);
      const days = byPhase[i] || [];
      h += `<div style="position:relative;padding-bottom:14px">
        <div style="position:absolute;right:-17px;top:5px;width:${isCur ? 14 : 10}px;height:${isCur ? 14 : 10}px;
          border-radius:50%;background:var(--hot);border:2px solid var(--skyEnd)${isCur ? ';box-shadow:0 0 0 3px color-mix(in srgb,var(--hot) 30%,transparent)' : ''}"></div>
        <div class="card"${isCur ? ' style="border-color:color-mix(in srgb,var(--hot) 45%,transparent)"' : ''}>
          <button class="exp" data-ph="${i}" aria-expanded="${isOpen}">
            <div style="display:flex;align-items:baseline;gap:8px">
              <div class="t" style="flex:1">${A.esc(title(p.h))}</div>
              ${isCur ? '<span class="chip hot">כאן עכשיו</span>' : `<div class="d" style="margin:0">${A.esc(p.when)}</div>`}
            </div>
            <div class="d" style="margin-top:4px">${A.esc(p.nights)}</div>
          </button>`;

      if (isOpen) {
        h += `<div class="ph-body">
          <div class="d" style="margin-top:8px;line-height:1.6">${A.esc(p.p)}</div>`;
        if (days.length) {
          h += `<div class="steps" style="margin-top:10px">` + days.map(({ d, i: di }) => {
            const m = String(d.t).match(/^(\d{1,2}\.\d{1,2})\s*—\s*(.*)$/);
            const isToday = di === idx;
            const style = 'text-decoration:none;color:inherit' + (isToday ? ';border-color:color-mix(in srgb,var(--hot) 45%,transparent)' : '');
            return `<a class="step" href="today.html?d=${di}" style="${style}">
              <b>${m ? m[1] : ''}</b><span>${A.esc(clip(m ? m[2] : String(d.t), 46))}</span>
              ${isToday ? '<i class="pip" style="background:var(--hot)"></i>' : ''}</a>`;
          }).join('') + `</div>`;
        }
        h += `</div>`;
      }
      h += `</div></div>`;
    });
    h += `</div>`;

    if (parked.length) {
      h += `<div class="lbl q" style="margin-top:22px">בסימן שאלה<i></i></div>`;
      parked.forEach(({ p }) => {
        h += `<div class="card" style="margin-top:8px;opacity:.7">
          <div class="t">${A.esc(p.h.replace(/^אופציה\s*·\s*/, ''))}</div>
          <div class="d" style="margin-top:4px">${A.esc(clip(p.p, 160))}</div></div>`;
      });
    }

    document.getElementById('main').innerHTML = h;
    // בטעינה הכל נכנס לפי גלילה. בפתיחת שלב רק הימים שנחשפו קופצים —
    // draw() בונה מחדש את כל המסך, והנפשה של הכל בכל לחיצה היא רעש.
    if (just == null) A.reveal(document.getElementById('main'));
    else A.reveal(document.querySelector(`.exp[data-ph="${just}"]`)
      ?.closest('.card')?.querySelector('.ph-body'), { now: true });
  }

  let just = null;
  draw();

  document.getElementById('main').addEventListener('click', e => {
    const b = e.target.closest('.exp');
    if (!b) return;
    const i = +b.dataset.ph;
    const opening = !open.has(i);
    if (opening) open.add(i); else open.delete(i);
    saveOpen();
    just = opening ? i : -1;      // -1 = קיפול, אין מה להנפיש
    draw();
  });
})();
