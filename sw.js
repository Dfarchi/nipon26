/* NIPON26 service worker.
   קליפה: cache-first (מהיר, עובד אופליין).
   trip.json: network-first (תוכן הטיול זז כל יום — רוצים את הטרי, עם נפילה לעותק).
   מארחים חיצוניים (leaflet, אריחי מפה): לא נוגעים — הם לא זמינים אופליין ממילא. */
const V = '2026091540';
const SHELL = 'nipon26-shell-' + V;
const DATA  = 'nipon26-data-' + V;

const SHELL_FILES = [
  './', './index.html', './site.html', './itinerary.html', './stage.html', './decisions.html',
  './budget.html', './transit.html', './documents.html',
  './today.html', './wallet.html', './tasks.html', './tools.html',
  './styles.css', './data.js', './basemap.js', './delight.js', './mapexport.js',
  './pwa.js', './app.css', './app.js', './art.js', './today.js', './wallet.js', './tasks.js',
  './itinerary.js', './documents.js', './tools.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  // נכסי הסצנה — בלי אלה הסצנה חסרה אופליין. נכנסים לכאן
  // ככל שקבוצות נוספות מ-assets/ מתחברות לאפליקציה.
  './assets/landmarks/nagoya-castle-day.webp', './assets/landmarks/nagoya-castle-night.webp',
  './assets/landmarks/pagoda-day.webp', './assets/landmarks/pagoda-night.webp',
  './assets/landmarks/tokyo-tower-day.webp', './assets/landmarks/tokyo-tower-night.webp',
  './assets/landmarks/torii-day.webp', './assets/landmarks/torii-night.webp',
  './assets/landmarks/tsutenkaku-day.webp', './assets/landmarks/tsutenkaku-night.webp',
  './assets/street/black-pine.webp', './assets/street/chimney-smoke.webp',
  './assets/street/chochin.webp', './assets/street/gassho-farmhouse.webp',
  './assets/street/maple-tree.webp', './assets/street/noren.webp',
  './assets/street/red-umbrella.webp', './assets/street/toro.webp',
  './assets/street/utility-pole.webp', './assets/street/vending-machine.webp',
  './assets/street/water-tank.webp', './assets/cats/bellatrix-sit.webp',
  './assets/cats/cat-sleep.webp', './assets/cats/cat-tail-up.webp',
  './assets/cats/morgana-sit.webp', './assets/food/dango.webp',
  './assets/food/gyutan.webp', './assets/food/matcha.webp',
  './assets/food/nigiri-salmon.webp', './assets/food/onigiri.webp',
  './assets/food/ramen.webp', './assets/food/takoyaki.webp',
  './assets/food/yaki-imo.webp', './assets/shuin/shuin-circle.webp',
  './assets/shuin/shuin-flower.webp', './assets/shuin/shuin-mountain.webp',
  './assets/shuin/shuin-octagon.webp', './assets/shuin/shuin-square.webp',
  './assets/shuin/shuin-wave.webp', './assets/vignettes/vig-birds.webp',
  './assets/vignettes/vig-chimney-smoke.webp', './assets/vignettes/vig-moon.webp',
  './assets/vignettes/vig-tokyo-tower-night.webp', './assets/sky/birds.webp',
  './assets/sky/clouds-day.webp', './assets/sky/clouds-night.webp',
  './assets/sky/leaf-1.webp', './assets/sky/leaf-2.webp',
  './assets/sky/leaf-3.webp', './assets/sky/leaf-4.webp',
  './assets/sky/leaf-5.webp', './assets/sky/moon.webp',
  './assets/sky/sun.webp', './assets/special/ridges-day.webp',
  './assets/special/ridges-night.webp'
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
