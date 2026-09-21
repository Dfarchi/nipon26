// שער ין חי — מרענן את TRIP.budget.fx.jpy מ-API ציבורי, פעם ביום.
// למה: שער מוקלד מתיישן בשקט ומטה את כל התקציב. השער הקשיח נשאר כרשת ביטחון.
// המוצג הוא השער של לאיה: שער שוק חי × (1 + spread). ה-spread נמדד מהעברה אמיתית.
(function (global) {
  const KEY = 'nipon26.fx.jpy';
  const DAY = 864e5;
  const SOURCES = [
    { u: 'https://api.frankfurter.app/latest?from=JPY&to=ILS', pick: j => j && j.rates && j.rates.ILS },
    { u: 'https://open.er-api.com/v6/latest/JPY',              pick: j => j && j.rates && j.rates.ILS }
  ];

  const spread = () => (TRIP.budget.fx.spread != null ? TRIP.budget.fx.spread : 0);
  const apply = (mid, asOf, live) => {
    const f = TRIP.budget.fx;
    f.jpy = mid * (1 + spread());
    f.asOf = asOf;
    f.live = live;
  };

  // קודם המטמון המקומי — ככה הדף נטען כבר עם שער עדכני, בלי להמתין לרשת
  function fromCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && c.mid > 0 && Date.now() - c.at < 7 * DAY) { apply(c.mid, c.asOf, true); return true; }
    } catch (e) {}
    return false;
  }

  async function refresh(onUpdate) {
    const before = TRIP.budget.fx.jpy;
    for (const s of SOURCES) {
      try {
        const r = await fetch(s.u, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        const mid = s.pick(j);
        if (!(mid > 0)) continue;
        const asOf = (j.date || j.time_last_update_utc || new Date().toISOString().slice(0, 10)).slice(0, 10);
        try { localStorage.setItem(KEY, JSON.stringify({ mid, asOf, at: Date.now() })); } catch (e) {}
        apply(mid, asOf, true);
        if (Math.abs(TRIP.budget.fx.jpy - before) > 1e-6 && onUpdate) onUpdate();
        return true;
      } catch (e) { /* מקור אחד נפל — ממשיכים לבא */ }
    }
    return false; // אין רשת: נשארים עם המטמון או עם השער הקשיח
  }

  fromCache();
  global.FX = { refresh, fromCache };
})(window);
