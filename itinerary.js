App.screen('itinerary.html', function () {
  const A = App, T = A.T;
  const idx = A.dayIndex();
  // קיצוץ על גבול מילה. חיתוך באמצע מילה ("היום הכי…") נראה כמו תקלה.
  const clip = (s, n) => { s = String(s); if (s.length <= n) return s;
    const c = s.slice(0, n), i = c.lastIndexOf(' ');
    return (i > n * 0.55 ? c.slice(0, i) : c).replace(/[\s·—-]+$/, '') + '…'; };

  const phases = (T.phases || []).map((p, i) => ({ p, i }));
  // parked נשאר כמסנן: אם יחזור שלב מוחנה הוא לא ייכנס למסלול
  // בטעות. הבלוק שהציג אותם ירד — פוג'י ירד מהנתונים לגמרי.
  const active = phases.filter(x => !x.p.parked);

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

  // הציורים המלאים שיובל אהב. הם לא מתאימים לשורת הבניינים — הם מביאים
  // רקע משלהם — אבל ראש כרטיס שלב הוא בדיוק המקום לתמונה שעומדת בפני
  // עצמה. דהויה ונגזרת בפינה, כך שהיא רקע ולא מתחרה בטקסט.
  const VIG = ['vig-tokyo-tower-night', 'vig-moon', 'vig-chimney-smoke', 'vig-birds'];

  function draw() {
    let h = `<div class="head"><div class="kicker">${active.length} שלבים · ${T.days.length} ימים</div>
      <div class="h1">המסלול</div></div>`;

    h += `<div style="position:relative;margin-top:18px;padding-right:20px">
      <div style="position:absolute;right:6px;top:6px;bottom:6px;width:2px;border-radius:2px;
        background:linear-gradient(var(--soft),var(--hot),var(--ok))"></div>`;

    // מיקום ברשימה הפעילה ולא האינדקס המקורי: שלב פוג׳י מסונן החוצה,
    // ולכן i רץ 0,1,2,4 ושני שלבים קיבלו את אותו ציור.
    active.forEach(({ p, i }, vi) => {
      const isCur = i === curPhase;
      const isOpen = open.has(i);
      const days = byPhase[i] || [];
      h += `<div style="position:relative;padding-bottom:14px">
        <div style="position:absolute;right:-17px;top:5px;width:${isCur ? 14 : 10}px;height:${isCur ? 14 : 10}px;
          border-radius:50%;background:var(--hot);border:2px solid var(--skyEnd)${isCur ? ';box-shadow:0 0 0 3px color-mix(in srgb,var(--hot) 30%,transparent)' : ''}"></div>
        <div class="card ph${isOpen ? ' open' : ''}"${isCur ? ' style="border-color:color-mix(in srgb,var(--hot) 45%,transparent)"' : ''}>
          <img class="vig" src="assets/vignettes/${VIG[vi % VIG.length]}.webp" alt="" decoding="async"
            loading="lazy" onload="this.classList.add('on')">
          <button class="exp" data-ph="${i}" aria-expanded="${isOpen}">
            <div style="display:flex;align-items:baseline;gap:8px">
              <div class="t" style="flex:1">${A.txt(title(p.h))}</div>
              ${isCur ? '<span class="chip hot">כאן עכשיו</span>' : `<div class="d" style="margin:0">${A.txt(p.when)}</div>`}
            </div>
            <div class="d" style="margin-top:4px">${A.txt(p.nights)}</div>
          </button>`;

      {
        h += `<div class="ph-body"><div>
          <div class="d" style="margin-top:8px;line-height:1.6">${A.txt(p.p)}</div>`;
        if (days.length) {
          h += `<div class="steps well">` + days.map(({ d, i: di }, k) => {
            const m = String(d.t).match(/^(\d{1,2}\.\d{1,2})\s*—\s*(.*)$/);
            const isToday = di === idx;
            const style = 'text-decoration:none;color:inherit' + (isToday ? ';border-color:color-mix(in srgb,var(--hot) 45%,transparent)' : '');
            // הלחיצה כבר לא מנווטת אלא פותחת הצצה. השברון יורד ולא לצד,
            // כי זה מה שמבדיל "ייפתח כאן" מ"ייקח אותך למקום אחר".
            return `<button class="step day" data-d="${di}" aria-expanded="false" style="--i:${k};${style}">
              <b>${m ? m[1] : ''}</b><span>${A.txt(clip(m ? m[2] : String(d.t), 46))}</span>
              ${isToday ? '<i class="pip" style="background:var(--hot)"></i>' : ''}</button>`;
          }).join('') + `</div>`;
        }
        h += `</div></div>`;
      }
      h += `</div></div>`;
    });
    h += `</div>`;

    // בלוק "בסימן שאלה" ירד: פוג'י הוא מה שהיה בו, והוא כבר לא בנתונים.
    // אם יחזור שלב מוחנה — צריך להחזיר גם את התצוגה, בכוונה.

    document.getElementById('main').innerHTML = h;
    A.reveal(document.getElementById('main'));
  }

  draw();   // פעם אחת. 45 שורות הן זולות; בנייה מחדש בכל לחיצה היא לא.


  // ---- הצצה ליום: מה יש בו, ואז כפתור שלוקח אליו ----
  const stayOn = dayTitle => {
    const m = String(dayTitle).match(/^(\d{1,2})\.(\d{1,2})/);
    if (!m) return null;
    const dt = new Date(2026, +m[2] - 1, +m[1]);
    return (T.budget.booked || []).find(b => {
      const p = String(b.d).split(/[–-]/);
      const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
      if (!s || !e) return false;
      return dt >= new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]) && dt < new Date(2026, +e[2] - 1, +e[1]);
    });
  };

  function peekFor(di) {
    const d = T.days[di], acts = d.acts || [], stay = stayOn(d.t);
    let h = '<div class="peek-in">';
    if (d.flag) h += `<div class="pk flag"><span>${A.txt(String(d.flag).replace(/<[^>]+>/g, '')).slice(0, 150)}…</span></div>`;
    h += acts.length
      ? acts.slice(0, 6).map(a => `<div class="pk"><b>${a.ic || '·'}</b>
          <span>${A.txt(clip(String(a.t), 52))}</span>${a.cr ? `<i>${a.cr}</i>` : ''}</div>`).join('')
        + (acts.length > 6 ? `<div class="pk more">ועוד ${acts.length - 6}</div>` : '')
      : '<div class="pk more">יום פנוי</div>';
    if (stay) h += `<div class="pk stay"><b>🛏</b><span>${A.txt(stay.n)}</span></div>`;
    h += `<a class="go" href="today.html?d=${di}">לפתוח את היום</a></div>`;
    return h;
  }

  document.getElementById('main').addEventListener('click', e => {
    const btn = e.target.closest('.day');
    if (!btn) return;
    const open = btn.getAttribute('aria-expanded') === 'true';
    // הצצה אחת בכל רגע — שתיים פתוחות הופכות את הרשימה לבלתי קריאה
    document.querySelectorAll('.day[aria-expanded="true"]').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      const pk = b.nextElementSibling;
      if (pk && pk.classList.contains('peek')) pk.classList.remove('on');
    });
    if (open) return;
    btn.setAttribute('aria-expanded', 'true');
    let pk = btn.nextElementSibling;
    if (!pk || !pk.classList.contains('peek')) {
      pk = document.createElement('div');
      pk.className = 'peek';
      pk.innerHTML = peekFor(+btn.dataset.d);
      btn.after(pk);
    }
    requestAnimationFrame(() => pk.classList.add('on'));
  });

  document.getElementById('main').addEventListener('click', e => {
    const b = e.target.closest('.exp');
    if (!b) return;
    const i = +b.dataset.ph, card = b.closest('.card');
    const opening = !open.has(i);
    if (opening) open.add(i); else open.delete(i);
    saveOpen();
    b.setAttribute('aria-expanded', String(opening));
    card.classList.toggle('open', opening);
    // הימים נכנסים בזה אחר זה רק בפתיחה יזומה, לא בקיפול ולא בטעינה
    if (opening) {
      card.classList.remove('just-open');
      void card.offsetWidth;              // מאלץ reflow כדי שהאנימציה תירה שוב
      card.classList.add('just-open');
      setTimeout(() => card.classList.remove('just-open'), 1200);
    }
  });
});
