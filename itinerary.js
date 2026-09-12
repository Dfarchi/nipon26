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

  let h = `<div class="head"><div class="kicker">${active.length} שלבים · ${T.days.length} ימים</div>
    <div class="h1">המסלול</div></div>`;

  h += `<div style="position:relative;margin-top:18px;padding-right:20px">
    <div style="position:absolute;right:6px;top:6px;bottom:6px;width:2px;border-radius:2px;
      background:linear-gradient(var(--hi),var(--hot),var(--ok))"></div>`;

  active.forEach(({ p, i }) => {
    const isCur = i === curPhase;
    h += `<div style="position:relative;padding-bottom:14px">
      <div style="position:absolute;right:-17px;top:5px;width:${isCur ? 14 : 10}px;height:${isCur ? 14 : 10}px;
        border-radius:50%;background:var(--hot);border:2px solid var(--skyEnd)${isCur ? ';box-shadow:0 0 0 3px color-mix(in srgb,var(--hot) 30%,transparent)' : ''}"></div>
      <div class="card"${isCur ? ' style="border-color:color-mix(in srgb,var(--hot) 45%,transparent)"' : ''}>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="t" style="flex:1">${A.esc(title(p.h))}</div>
          ${isCur ? '<span class="chip hot">כאן עכשיו</span>' : `<div class="d" style="margin:0">${A.esc(p.when)}</div>`}
        </div>
        <div class="d" style="margin-top:4px">${A.esc(p.nights)}</div>
        <div class="d" style="margin-top:6px;line-height:1.6">${A.esc(clip(p.p, isCur ? 260 : 130))}</div>`;

    if (isCur && byPhase[i]) {
      h += `<div class="steps" style="margin-top:10px">` + byPhase[i].map(({ d, i: di }) => {
        const m = String(d.t).match(/^(\d{1,2}\.\d{1,2})\s*—\s*(.*)$/);
        const isToday = di === idx;
        const style = 'text-decoration:none;color:inherit' + (isToday ? ';border-color:color-mix(in srgb,var(--hot) 45%,transparent)' : '');
        return `<a class="step" href="today.html?d=${di}" style="${style}">
          <b>${m ? m[1] : ''}</b><span>${A.esc(clip(m ? m[2] : String(d.t), 46))}</span>
          ${isToday ? '<i class="pip" style="background:var(--hot)"></i>' : ''}</a>`;
      }).join('') + `</div>`;
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
})();
