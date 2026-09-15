(function () {
  const A = App, T = A.T;
  A.boot('now.html');

  const idx = A.dayIndex(), cur = T.days[idx], dd = A.dated[idx].date;
  const N = A.whatNow(idx);

  // העיר, מאותה כותרת שממנה נגזר גם התאריך
  const rest = String(cur.t).split('—').slice(1).join('—').trim();
  let city = rest.split('(')[0].replace(/\s*·.*$/, '').trim();
  if (city.includes('→')) city = city.split('→').pop().trim();
  const latin = (rest.match(/\(([A-Za-z][^·)]*)/) || [])[1] || '';
  const jp = (rest.match(/·\s*([^)]*[　-鿿][^)]*)\)/) || [])[1] || '';

  const stay = (T.budget.booked || []).find(b => {
    const p = String(b.d).split(/[–-]/);
    const s = (p[0] || '').match(/(\d{1,2})\.?(\d{1,2})?/), e = (p[1] || '').match(/(\d{1,2})\.(\d{1,2})/);
    if (!s || !e) return false;
    const sd = new Date(2026, (s[2] ? +s[2] : +e[2]) - 1, +s[1]), ed = new Date(2026, +e[2] - 1, +e[1]);
    return dd >= sd && dd < ed;
  });

  // יעד הניווט, מהמדויק לכללי. קודם הלינק של הפעילות עצמה — אם היא
  // יודעת לאן ללכת, זו התשובה הטובה ביותר. אין יעד מדויק ואין כפתור:
  // עדיף בלי, מאשר לשלוח את שניכם לחיפוש "טוקיו" כללי ברחוב.
  const gmaps = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  const linkOf = a => a && (a.l || []).find(x => /🧭|מסלול/.test(x.t || ''));
  const stayAddr = stay && ((T.stayAddr || {})[stay.n] || A.factsFor(stay.n).addr || '');
  const target =
    (linkOf(N.cur) || {}).u ||
    (N.acts.map(linkOf).find(Boolean) || {}).u ||
    (N.cur && (N.cur.l || []).find(x => /🗺️/.test(x.t || '')) || {}).u ||
    (stayAddr ? gmaps(stayAddr) : '') ||
    (latin || jp ? gmaps((latin || jp) + ' Japan') : '');

  // שורת המצב: "עכשיו", או כמה זמן נשאר. זו השורה שמסתכלים עליה ברחוב.
  const gap = N.mins;
  const when =
    N.lead === 'עכשיו' ? 'עכשיו'
    : gap === null || gap === undefined ? N.lead
    : gap <= 0 ? 'עכשיו'
    : gap < 60 ? `בעוד ${gap} דק׳`
    : `בעוד ${Math.floor(gap / 60)}:${String(gap % 60).padStart(2, '0')} שעות`;

  let h = '';

  if (A.beforeTrip) {
    // לפני הטיול אין "עכשיו". לא ממציאים אחד.
    const fl = T.flight || {};
    const dep = fl.dep ? new Date(fl.dep) : null;
    const dep0 = dep ? new Date(dep.getFullYear(), dep.getMonth(), dep.getDate()) : A.firstDay;
    const toGo = Math.round((dep0 - A.today0) / 864e5);
    h += `<div class="nowcard soon">
      <div class="nk">עד ההמראה</div>
      <div class="nbig">${toGo}</div>
      <div class="nsub">ימים${fl.airline ? ' · ' + fl.airline : ''}${fl.code ? ' ' + fl.code : ''}</div>
      <a class="nogo" href="today.html">לראות את היום הראשון</a>
    </div>`;
  } else if (N.cur) {
    h += `<div class="nowcard">
      <div class="nk">${A.txt(when)}${N.time(N.cur) ? `<span class="nt">${N.time(N.cur)}</span>` : ''}</div>
      <div class="nbig sm">${N.cur.ic || ''} ${A.txt(N.cur.t)}</div>
      ${N.cur.d ? `<div class="nsub">${A.txt(String(N.cur.d).slice(0, 110))}</div>` : ''}
      ${target ? `<a class="nogo" href="${target}">🧭 ניווט לשם</a>`
               : `<div class="nsub dim">אין יעד מדויק לפעילות הזו</div>`}
    </div>`;
  } else {
    h += `<div class="nowcard">
      <div class="nk">היום</div>
      <div class="nbig sm">${A.txt(city || latin)}</div>
      <div class="nsub">אין פעילויות מתוכננות — יום פתוח</div>
      ${target ? `<a class="nogo" href="${target}">🧭 ניווט ללינה</a>` : ''}
    </div>`;
  }

  // הבא בתור — שורה אחת, לא רשימה
  if (N.next && !A.beforeTrip) {
    h += `<a class="nnext" href="today.html">
      <b>${N.time(N.next) || N.next.ic || '·'}</b>
      <span>${A.txt(N.next.t)}</span>
      <i class="chev"></i></a>`;
  }

  // הלילה. בסוף היום זה הדבר היחיד שצריך, והכתובת ביפנית היא מה
  // שמראים לנהג — אז היא כאן ולא שתי לחיצות משם.
  if (stay && !A.beforeTrip) {
    h += `<div class="nstay">
      <div class="lbl q">הלילה<i></i></div>
      <div class="t">${A.txt(stay.n)}</div>
      ${stayAddr ? `<div class="jp" style="margin-top:4px">${stayAddr}</div>` : ''}
      <div class="nrow">
        ${stayAddr ? `<a class="chip" href="${gmaps(stayAddr)}">🧭 ניווט</a>` : ''}
        ${stayAddr ? `<button class="chip" id="taxi">🚕 כרטיס לנהג</button>` : ''}
        <a class="chip" href="wallet.html">הארנק</a>
      </div>
    </div>`;
  }

  h += `<a class="nall" href="today.html">כל היום — ${A.txt(city || latin)} · יום ${idx + 1}</a>`;

  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));

  // כרטיס הנהג נפתח במקום, בלי מעבר מסך
  const tx = document.getElementById('taxi');
  if (tx) tx.onclick = () => {
    const open = document.getElementById('tcardWrap');
    if (open) { open.remove(); return; }
    const w = document.createElement('div');
    w.id = 'tcardWrap';
    w.innerHTML = `<div class="tcard">
      <div class="ask">Please take me here / ここまでお願いします</div>
      <div class="nm">${A.esc(stay.n)}</div>
      <div class="ad">${A.esc(stayAddr)}</div>
    </div>`;
    tx.closest('.nstay').appendChild(w);
    w.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const pick = document.getElementById('pick');
  if (pick) {
    pick.innerHTML = T.days.map((d, i) =>
      `<option value="${i}"${i === idx ? ' selected' : ''}>${i + 1}. ${String(d.t).slice(0, 20)}</option>`).join('');
    pick.onchange = () => { A.q.set('d', pick.value); location.search = A.q.toString(); };
  }

  // השעה זזה, והמסך הזה נשאר פתוח ביד. רענון מלא כל דקה היה טוען הכל
  // מחדש ובולע הקשה באמצע — אז מחשבים מחדש, ומעדכנים רק את שורת המצב.
  // טעינה מחדש קורית רק כשהפעילות הנוכחית באמת התחלפה.
  if (N.isToday) {
    const nk = document.querySelector('.nowcard .nk');
    setInterval(() => {
      const M = A.whatNow(idx);
      if (M.cursor !== N.cursor || M.lead !== N.lead) { location.reload(); return; }
      if (!nk || M.mins === null || M.mins === undefined) return;
      const g = M.mins;
      const s = g <= 0 ? 'עכשיו'
        : g < 60 ? `בעוד ${g} דק׳`
        : `בעוד ${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')} שעות`;
      if (nk.firstChild) nk.firstChild.textContent = s;
    }, 30000);
  }
})();
