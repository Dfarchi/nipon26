(function () {
  const MON = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];
  const A = App, T = A.T;
  A.boot('today.html');
  const idx = A.dayIndex(), cur = T.days[idx], dd = A.dated[idx].date;

  const head = String(cur.t).split('—');
  // רוב הכותרות הן "30.10 — עיר (Latin · 漢字)". יום קויאסאן נפתח בשם
  // העיר, ולכן שם החלק הראשון הוא כבר התיאור ואין מה לקלף ממנו.
  const hasDate = /^\d{1,2}\.\d{1,2}/.test(head[0].trim());
  const rest = hasDate ? head.slice(1).join('—').trim() : String(cur.t);
  let city = rest.split('(')[0].replace(/\s*·.*$/, '').trim();
  if (city.includes('→')) city = city.split('→').pop().trim();
  const jp = (rest.match(/·\s*([^)]*[　-鿿][^)]*)\)/) || [])[1] || '';
  const latin = (rest.match(/\(([A-Za-z][^·)]*)/) || [])[1] || '';

  const acts = (cur.acts || []).filter(a => a && a.t);
  const crowd = c => c === '🔴' ? 'var(--warn)' : c === '🟡' ? 'var(--hot)' : 'var(--ok)';
  // ‎(~2:15) הוא משך נסיעה ולא שעה. בלי ההחרגה הזו מסך 19.11 פתח ב-"עכשיו
  // 2:15 · קיוטו → טוקיו" והחביא את כל פעילויות הבוקר מאחורי "זהו להיום".
  const time = s => (String(s).match(/(?<![~(\d:])\b([0-2]?\d:[0-5]\d)\b/) || [])[1] || '';

  const stay = (T.budget.booked || []).find(b => {
    const p = String(b.d).split(/[–-]/);
    const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
    if (!s || !e) return false;
    const sd = new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]), ed = new Date(2026, +e[2] - 1, +e[1]);
    return dd >= sd && dd < ed;
  });

  let h = '';
  // סופרים עד ההמראה עצמה, לא עד היום הראשון בטיול — הם לא אותו תאריך.
  const fl = T.flight || {};
  const dep = fl.dep ? new Date(fl.dep) : null;
  const dep0 = dep ? new Date(dep.getFullYear(), dep.getMonth(), dep.getDate()) : A.firstDay;
  const toGo = Math.round((dep0 - A.today0) / 864e5);
  if (A.beforeTrip) {
    const hhmm = dep ? String(dep.getHours()).padStart(2, '0') + ':' + String(dep.getMinutes()).padStart(2, '0') : '';
    const when = dep ? `${dep.getDate()} ${MON[dep.getMonth()]}׳ ${hhmm}` : '';
    h += `<div class="countdown"><div class="kicker">${toGo === 0 ? 'היום' : 'עד ההמראה'}</div>
      <div class="n">${toGo}</div>
      <div class="d">ימים${fl.airline ? ' · ' + fl.airline : ''}${fl.code ? ' ' + fl.code : ''}${when ? ' · ' + when : ''}</div></div>`;
  }
  // הטיול נגמר, והמסך ממשיך להראות את יום 45 בלשון הווה.
  if (A.afterTrip) h += `<div class="card" style="text-align:center">
    <div class="lbl q" style="justify-content:center">הטיול הסתיים<i></i></div>
    <div class="d" style="margin-top:4px">42 לילות, 14.10–25.11.2026. מה שלמטה הוא היום האחרון.</div></div>`;

  h += `<div class="head"${A.beforeTrip ? ' style="padding-top:clamp(30px,8vh,70px)"' : ''}>
    <div class="kline"><div class="kicker">יום ${idx + 1} · מתוך ${T.days.length}${cur.st ? ' · ' + cur.st : ''}</div>
      <span id="pickSlot"></span></div>
    <div class="row"><div class="dnum">${hasDate ? head[0].trim() : (dd ? dd.getDate() + '.' + (dd.getMonth() + 1) : '')}</div>
      <div class="d" style="padding-bottom:6px">${dd ? A.DOW[dd.getDay()] : ''}</div><div style="flex:1"></div>
      <div style="display:flex;align-items:baseline;gap:7px;padding-bottom:5px">
        <div class="city">${city || latin}</div>${jp ? `<div class="jp">${jp}</div>` : ''}</div></div></div>`;

  // הברכה נכתבת לפני ה-head, כדי שהיא תהיה השורה הראשונה שקוראים
  {
    const tail = A.beforeTrip
      ? `${toGo} ימים לטיסה`
      : `יום ${idx + 1} · ${city || latin || ''}`.trim().replace(/ ·\s*$/, '');
    const slot = document.getElementById('hello');
    if (slot) { slot.outerHTML = A.hello(tail); A.wireWho(document.querySelector('.ping.ask'), tail); }
  }

  // ===== מה עכשיו באמת =====
  // הכרטיס הזה הציג תמיד את acts[0] — כלומר ב-20:00 בטוקיו הוא עדיין
  // אמר "עכשיו: קופים בבוקר". רק 25% מהפעילויות נושאות שעה, אבל 57%
  // מהימים מכילים לפחות אחת, ובאלה אפשר לדעת.
  //
  // הכלל: מקדמים את הפעילות המתוזמנת האחרונה שהשעה שלה כבר עברה.
  // אם אף שעה לא עברה — הראשונה, והכותרת היא "מתחילים". אם אין שעות
  // בכלל — "היום", כי "עכשיו" יהיה שקר.
  // "היום" נקבע לפי התאריך ולא לפי היעדר ‎?d=, כך שגם תצוגה מפורשת של
  // היום הנוכחי מקבלת "עכשיו" אמיתי.
  const isToday = !!(A.dated[idx] && A.dated[idx].date &&
                     A.dated[idx].date.getTime() === A.today0.getTime());
  const nowMin = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
  const mins = s => { const t = time(s); if (!t) return null;
    const [H, M] = t.split(':').map(Number); return H * 60 + M; };

  const timed = acts.map((a, i) => ({ a, i, m: mins(a.d) ?? mins(a.t) })).filter(x => x.m !== null);
  let cursor = 0, lead = 'היום';
  if (timed.length) {
    lead = 'מתחילים';
    if (isToday) {
      const passed = timed.filter(x => x.m <= nowMin);
      if (passed.length) { cursor = passed[passed.length - 1].i; lead = 'עכשיו'; }
      else { cursor = timed[0].i; lead = 'מתחילים'; }
    } else cursor = timed[0].i;
  }

  if (acts.length) {
    const a = acts[cursor], tm = time(a.d) || time(a.t);
    h += `<div class="card now"><div class="lbl">${lead}<i></i>${tm ? `<span class="big">${tm}</span>` : ''}</div>
      <div class="t">${a.ic || ''} ${A.txt(a.t)}</div>
      ${a.d ? `<div class="d">${A.txt(String(a.d).slice(0, 160))}</div>` : ''}</div>`;
  }

  // הפסקה המסבירה יורדת אל מתחת לכרטיס. היא חשובה, אבל היא 196 פיקסלים
  // של טקסט רץ — ומי שפותח את המסך ברחוב רוצה קודם את השורה שעונה.
  if (cur.flag) h += `<div class="flagnote">${A.rich(cur.flag)}</div>`;
  const after = acts.filter((_, i) => i > cursor).slice(0, 5);
  // אחרי הפעילות האחרונה המסך פשוט נגמר. שורה שאומרת את זה טובה מריק.
  if (!after.length && acts.length && lead === 'עכשיו') {
    h += `<div class="lbl q" style="margin-top:16px">זהו להיום<i></i></div>
      <div class="d" style="margin-top:2px">אין עוד פעילויות מתוכננות${stay ? ' — נשאר רק לחזור ללינה' : ''}</div>`;
  }
  if (after.length) {
    h += `<div style="margin-top:16px"><div class="lbl q">אחר כך<i></i></div><div class="steps">` +
      after.map(a => `<div class="step"><b>${time(a.d) || time(a.t) || (a.ic || '·')}</b>
        <span>${A.txt(a.t)}</span><i class="pip" style="background:${crowd(a.cr)}"></i></div>`).join('') + `</div></div>`;
  }
  // המנה של האזור. לא "מה לאכול היום" אלא מה המקום הזה עושה טוב —
  // המפתח הוא תחילת day.st, אותו שדה נקי שממנו נגזר גם הנוף.
  const region = String(cur.st || '').replace(/\s*·.*$/, '').trim();
  const dish = (T.dish || {})[region];
  if (dish) {
    h += `<a class="card dish" href="tools.html#dish">
      <img src="assets/food/${dish.a}.webp" alt="" decoding="async" loading="lazy"
        onload="this.classList.add('on')">
      <div class="dish-t">
        <div class="lbl q">לאכול כאן<i></i></div>
        <div class="t">${A.txt(dish.t)}</div>
        <div class="d">${A.txt(dish.d)}</div>
      </div></a>`;
  }

  if (stay) {
    // ‎stayAddr הוא הכתובת שהוקלדה ואומתה; factsFor הוא ניחוש ברג׳קס
    // שמחזיר לפעמים שבר משם המלון. הראשון קודם, כמו בארנק ובכלים.
    const f = A.factsFor(stay.n);
    const addr = (T.stayAddr || {})[stay.n] || f.addr;
    h += `<div class="card"><div class="lbl q">הלילה<i></i></div><div class="t">${A.txt(stay.n)}</div>
      <div class="d">${stay.d} · ${stay.nights} לילות${stay.meals ? ' · ' + stay.meals : ''}</div>
      ${addr ? `<div class="jp" style="margin-top:5px">${addr}</div>` : ''}</div>`;
  }

  // יעד הניווט, מהמדויק לכללי. אין יעד מדויק — אין כפתור: עדיף בלי, מאשר
  // לשלוח את שניכם לחיפוש "טוקיו" כללי כשאתם עומדים ברחוב.
  const a0 = acts[0];
  const navLink = (acts.map(a => (a.l || []).find(x => /🧭|מסלול/.test(x.t || ''))).find(Boolean))
    || (a0 && (a0.l || []).find(x => /🗺️/.test(x.t || '')));
  const stayAddr = stay && ((T.stayAddr || {})[stay.n] || A.factsFor(stay.n).addr || '');
  const cityQ = latin || jp || '';
  const navHref = navLink ? navLink.u
    : stayAddr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(stayAddr)
    : cityQ ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(cityQ + ' Japan')
    : '';
  h += `<div class="acts">
    ${navHref ? `<button class="cloud" onclick="location.href='${navHref}'">
      ${A.cloudSVG('var(--hi)', 'var(--key)')}<span>ניווט</span></button>` : ''}
    <button class="cloud g" id="fullDayBtn">
      ${A.cloudSVG(A.theme === 'day' ? '#e8dcc4' : '#2b3b48')}<span>היום המלא</span></button></div>`;

  h += `<div id="fullDayWrap" hidden style="margin-top:16px">
    <div class="lbl q">כל הפעילויות היום<i></i></div>
    <div class="steps" style="margin-top:8px">` +
    (acts.length ? acts.map(a => `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="t" style="flex:1">${a.ic || ''} ${A.txt(a.t)}</div>
          <i class="pip" style="background:${crowd(a.cr)}"></i>
        </div>
        ${a.d ? `<div class="d" style="margin-top:5px;line-height:1.5">${A.txt(a.d)}</div>` : ''}
        ${(a.l || []).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">` +
          a.l.map(x => `<a class="chip" href="${x.u}" target="_blank" rel="noopener" style="text-decoration:none">${A.txt(x.t)}</a>`).join('') +
          `</div>` : ''}
      </div>`).join('') : `<div class="empty">${(window.ART && ART.onigiri) ? ART.onigiri({ w: 58 }) : ''}
        <div class="d">יום פנוי — בלי פעילויות מתוכננות</div></div>`) +
    `</div></div>`;

  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));


  document.getElementById('fullDayBtn').onclick = () => {
    const w = document.getElementById('fullDayWrap');
    w.hidden = !w.hidden;
    if (!w.hidden) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // הבורר היה ‎position:fixed בפינה, ולכן ישב קבוע על טקסט היום. מקומו
  // הוא ליד "יום 17 · מתוך 45" — זה מה שהוא משנה.
  const pick = document.getElementById('pick');
  const slot = document.getElementById('pickSlot');
  if (slot && pick) slot.appendChild(pick);
  pick.innerHTML = T.days.map((d, i) => `<option value="${i}"${i === idx ? ' selected' : ''}>${i + 1}. ${String(d.t).slice(0, 14)}</option>`).join('');
  pick.onchange = () => { A.q.set('d', pick.value); location.search = A.q.toString(); };
})();
