/* NIPON26 service worker.
   קליפה: cache-first (מהיר, עובד אופליין).
   trip.json: network-first (תוכן הטיול זז כל יום — רוצים את הטרי, עם נפילה לעותק).
   מארחים חיצוניים (leaflet, אריחי מפה): לא נוגעים — הם לא זמינים אופליין ממילא. */
const V = '2026091442';
const SHELL = 'nipon26-shell-' + V;
const DATA  = 'nipon26-data-' + V;

const SHELL_FILES = [
  './', './index.html', './site.html', './itinerary.html', './stage.html', './decisions.html',
  './budget.html', './transit.html', './documents.html',
  './today.html', './wallet.html', './tasks.html', './tools.html',
  './styles.css', './data.js', './basemap.js', './delight.js', './mapexport.js',
  './pwa.js', './app.css', './app.js', './art.js', './today.js', './wallet.js', './tasks.js',
  './itinerary.js', './documents.js', './tools.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // addAll נכשל כולו אם קובץ אחד נופל — מוסיפים אחד-אחד כדי לא לאבד הכל
    await Promise.all(SHELL_FILES.map(f => c.add(f).catch(() => {})));
    // trip.json נשמר בקאש הנתונים כבר בהתקנה, כדי שיהיה שם גם אם אף דף לא ביקש אותו עדיין
    await caches.open(DATA).then(d => d.add('./trip.json')).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // unpkg, אריחי מפה, גוגל — לדפדפן

  // ----- trip.json: רשת קודם -----
  if (url.pathname.endsWith('/trip.json')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) (await caches.open(DATA)).put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const hit = await caches.match(req);
        return hit || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // ----- ניווט: קליפה קודם, ורק אם אין — רשת -----
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { return await fetch(req); }
      catch (_) { return (await caches.match('./index.html')) || Response.error(); }
    })());
    return;
  }

  // ----- שאר הנכסים: קליפה קודם, ורענון ברקע -----
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) {
      fetch(req).then(r => { if (r.ok) caches.open(SHELL).then(c => c.put(req, r)); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r.ok) (await caches.open(SHELL)).put(req, r.clone());
      return r;
    } catch (_) { return Response.error(); }
  })());
});
