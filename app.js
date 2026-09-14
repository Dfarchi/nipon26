/* ===== NIPON26 app — שכבה משותפת לכל המסכים. הכל נגזר מ-TRIP. ===== */
window.App = (function () {
  const T = window.TRIP || {};
  const q = new URLSearchParams(location.search);
  const YEAR = 2026;
  const DOW = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const esc = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ---- תאריך לכל יום, מהכותרת ("30.10 — ...") ----
  const dated = (T.days || []).map((d, i) => {
    const m = String(d.t).match(/^(\d{1,2})\.(\d{1,2})/);
    return { i, d, date: m ? new Date(YEAR, +m[2] - 1, +m[1]) : null };
  });
  const firstDay = (dated.find(x => x.date) || {}).date;

  function dayIndex() {
    if (q.has('d')) return Math.max(0, Math.min(T.days.length - 1, +q.get('d')));
    const hit = dated.find(x => x.date && x.date.getTime() === today0.getTime());
    if (hit) return hit.i;
    return today0 < firstDay ? 0 : T.days.length - 1;
  }
  const beforeTrip = firstDay && today0 < firstDay;

  // ---- ערכה ----
  const theme = q.get('theme') || (now.getHours() >= 6 && now.getHours() < 17 ? 'day' : 'night');

  // ---- טקסט כל ההחלטות, כמקור לכתובות/טלפונים/דדליינים ----
  const allItems = (T.decisions || []).flatMap(g => g.items || []);
  const corpus = allItems.map(i => esc(i.q)).join('\n');

  function factsFor(name) {
    const key = String(name).replace(/[·—–-].*$/, '').trim().split(/\s+/).filter(w => w.length > 2);
    // המילה הארוכה ביותר היא המבדילה. התאמה על מילה כלשהי שלפה כתובת וטלפון
    // של מלון אחר ברגע ששתי הזמנות חלקו מילה גנרית כמו "הוטל" — כלומר כרטיס
    // הנהג הראה כתובת שגויה, וזו התקלה הגרועה ביותר שהמסך הזה יכול לייצר.
    const lines = corpus.split('\n');
    const main = key.slice().sort((a, b) => b.length - a.length)[0] || '';
    const line = (main && lines.find(l => l.includes(main)))
      || lines.find(l => key.length > 1 && key.every(w => l.includes(w)))
      || '';
    return {
      addr:  (line.match(/[一-龯ぁ-んァ-ヶ][一-龯ぁ-んァ-ヶ0-9０-９\-ー－]{3,}(?:[市町村区][^\s,)·]*)?[0-9０-９][0-9０-９\-ー－]*/) || [])[0]
          || (line.match(/[一-龯]{2,}[市町村区][^\s,)·]{0,20}/) || [])[0] || '',
      phone: (line.match(/0\d{1,4}-\d{2,4}-\d{4}/) || [])[0] || '',
      free:  (line.match(/(?:ביטול )?חינם עד ([0-9.]+)/) || [])[1] || ''
    };
  }

  // ---- דדליין: כמה ימים מהיום ----
  function dl(txt) {
    const m = String(txt).match(/^(\d{1,2})\.(\d{1,2})$/); if (!m) return null;
    const d = new Date(YEAR, +m[2] - 1, +m[1]);
    return { date: d, days: Math.round((d - today0) / 864e5) };
  }


  // ===== מזג אוויר: מגדיר את מצב הסצנה. Open-Meteo, בלי מפתח. =====
  // הבקשה רצה בדפדפן של המשתמש, לא אצלי — אם היא נכשלת נופלים ל"עלים".
  const WKEY = 'nipon26_wx';
  function modeFromCode(c) {
    if (c == null) return 'leaves';
    if (c >= 71 && c <= 77 || c === 85 || c === 86) return 'snow';
    if (c >= 51 && c <= 67 || c >= 80 && c <= 82 || c >= 95) return 'rain';
    if (c === 45 || c === 48) return 'mist';
    if (c === 0 || c === 1) return 'clear';
    return 'leaves';
  }
  function coordsFor(phase) {
    const p = (T.mapPoints || []).find(x => x.ph === phase && x.lat) || (T.mapPoints || [])[0];
    return p ? { lat: p.lat, lng: p.lng } : null;
  }
  function weather(phase, cb) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(WKEY) || 'null'); } catch (e) {}
    if (cached && Date.now() - cached.at < 36e5) return cb(cached.mode);
    const c = coordsFor(phase);
    if (!c || !navigator.onLine) return cb(cached ? cached.mode : 'leaves');
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=weather_code`)
      .then(r => r.json())
      .then(j => {
        const mode = modeFromCode(j && j.current && j.current.weather_code);
        try { localStorage.setItem(WKEY, JSON.stringify({ mode, at: Date.now() })); } catch (e) {}
        cb(mode);
      })
      .catch(() => cb(cached ? cached.mode : 'leaves'));
  }

  // ===== חלקיקים: עלים / גשם / שלג =====
  const PARTICLE = {
    leaves: { n: 9,  cls: 'leaf',  min: 11, max: 18, dur: [11, 19] },
    rain:   { n: 34, cls: 'drop',  min: 1,  max: 2,  dur: [0.7, 1.3] },
    snow:   { n: 26, cls: 'snow',  min: 3,  max: 6,  dur: [7, 14] },
    mist:   { n: 0 }, clear: { n: 0 }
  };
  const LEAF = '<path d="M11,0 L13.4,6 L19,3.4 L16.4,9.4 L22,11.6 L16.4,14 L19,19.6 L13.4,17 L11,23 L8.6,17 L3,19.6 L5.6,14 L0,11.6 L5.6,9.4 L3,3.4 L8.6,6 Z"/>';
  const LEAF_COL = ['#d4622f', '#e0a03a', '#c1303f', '#b8541f'];

  function particles(host, mode) {
    const cfg = PARTICLE[mode] || PARTICLE.leaves;
    host.innerHTML = '';
    if (!cfg.n) return;
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < cfg.n; i++) {
      const el = document.createElement(mode === 'leaves' ? 'svg' : 'i');
      const size = rnd(cfg.min, cfg.max), dur = rnd(cfg.dur[0], cfg.dur[1]);
      if (mode === 'leaves') {
        el.setAttribute('viewBox', '0 0 22 24');
        el.innerHTML = `<g fill="${LEAF_COL[i % LEAF_COL.length]}">${LEAF}</g>`;
        el.style.cssText = `position:absolute;width:${size}px;right:${rnd(-2, 100)}%;opacity:.75;
          animation:fall ${dur}s linear ${rnd(0, dur)}s infinite`;
      } else if (mode === 'rain') {
        el.style.cssText = `position:absolute;width:${size}px;height:${rnd(12, 22)}px;right:${rnd(-2, 100)}%;
          background:linear-gradient(transparent,rgba(180,210,230,.55));border-radius:2px;
          animation:drop ${dur}s linear ${rnd(0, dur)}s infinite`;
      } else {
        el.style.cssText = `position:absolute;width:${size}px;height:${size}px;right:${rnd(-2, 100)}%;
          background:rgba(255,255,255,.8);border-radius:50%;
          animation:fall ${dur}s linear ${rnd(0, dur)}s infinite`;
      }
      host.appendChild(el);
    }
  }

  // ===== תנועה: גלילה ונטייה, צינור אחד =====
  // שתי מערכות שכותבות transform לאותה שכבה דורסות זו את זו, אז הגלילה
  // והנטייה נאספות למצב אחד ונכתבות יחד, בפריים אחד.
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOTION = { y: 0 };
  let LAYERS = null, ticking = false, lastOp = 1;

  // עומק לכל שכבה: [בורר, מקדם גלילה]
  const DEPTH = [['.l-sky', 0.06], ['.l-far', 0.12], ['.l-village', 0.42], ['.l-chars', 0.42]];

  // נקרא גם אחרי decorate(), שמחליף את .l-chars ומשאיר הפניה מתה
  function cacheLayers() {
    const sc = document.querySelector('.scene');
    LAYERS = sc ? { sc,
                    els: DEPTH.map(([s, a]) => [sc.querySelector(s), a]) } : null;
  }

  function frame() {
    ticking = false;
    if (!LAYERS) return;
    const { sc, els } = LAYERS, y = MOTION.y;
    els.forEach(([el, s]) => {
      if (el) el.style.transform = `translate3d(0,${(y * s).toFixed(2)}px,0)`;
    });
    // אטימות מקוונטטת: ל-.scene יש שני pseudo-elements עם mix-blend-mode פרושים
    // על כל השטח, ושינוי אטימות על ההורה מקבץ את כל הערימה לשכבה אחת. בקפיצות
    // של 0.02 העין לא מבחינה, והקיבוץ מחדש קורה פי עשרה פחות.
    const op = Math.max(0.25, 1 - y / 520);
    if (Math.abs(op - lastOp) > 0.02 || (y === 0) !== (lastOp === 1)) {
      lastOp = op; sc.style.opacity = op.toFixed(2);
    }
    if (!REDUCE) {
      // ה-zoom יושב על השכבות ולא על .scene: scale על ההורה מאלץ ראסטריזציה
      // מחדש של ה-blend ושל feTurbulence שב-.l-far, בכל פריים.
      const z = (1 + Math.min(y, 400) / 2600).toFixed(4);
      els.forEach(([el], n) => { if (el && n >= 2) el.style.scale = z; });

    }
  }

  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  function parallax() {
    cacheLayers();
    if (!LAYERS) return;
    addEventListener('scroll', () => { MOTION.y = window.scrollY || 0; schedule(); }, { passive: true });
    frame();
  }

  // ===== כניסות =====
  // שלוש התנהגויות, לא אחת, ולכל אחת תפקיד:
  //   rise  — בלוק עולה מעט וגדל לתוך גודלו. בלי תזוזה אופקית: ציר הגלילה
  //           הוא האנכי, ותזוזה אופקית זעירה נקראת כ"לא מיושר" ולא כ"הגיע".
  //   slide — שורת רשימה נכנסת מהצד מאחורי קצה המיכל. ה-overflow על .steps
  //           הוא מה שהופך את זה מ"זזה קצת" ל"נכנסה מבחוץ".
  //   wipe  — תווית נחשפת ממסכה והקו נמשך. בלי אטימות כלל.
  // אין חריגה מעבר ליעד באף אחת מהן: על מרחק קצר היא יוצאת פיקסל וחצי,
  // וזה סדר גודל של באג רינדור ולא של תנופה.
  const RV_MAP = [
    ['.card,.tcard,.countdown,.empty,.acts', 'rv-rise',  45, 4],
    ['.lbl',                                 'rv-lbl',   45, 4],
    ['.step',                                'rv-slide', 38, 7]
  ];
  const RV_ALL = RV_MAP.map(r => r[0]).join(',');

  function reveal(root, opt) {
    if (!root || REDUCE || !window.IntersectionObserver) return;
    const now = (opt || {}).now, seen = new Set(), targets = [];

    RV_MAP.forEach(([sel, cls, step, cap]) => {
      [].slice.call(root.querySelectorAll(sel)).forEach(el => {
        if (seen.has(el)) return;
        // הכותרת מקבלת transform מצינור התנועה; שורות בתוך שלב מנוהלות ב-.just-open
        if (el.closest('.head') || el.closest('.ph-body')) return;
        // מה שיושב בתוך בלוק שנכנס — נכנס יחד איתו. חוץ משורות ברשימה.
        const p = el.parentElement && el.parentElement.closest(RV_ALL);
        if (p && !el.matches('.step')) return;
        seen.add(el);
        el.classList.add(cls);
        targets.push([el, cls, step, cap]);
      });
    });
    if (!targets.length) return;

    // המשך התנועה הארוכה ביותר בכל התנהגות. הניקוי על שעון ולא על transitionend:
    // האירוע הזה מבעבע, וילד שסיים תנועה משלו היה מוריד את המחלקות מההורה
    // באמצע — מה שקורא בדיוק כ"קופץ במקום להחליק".
    const DUR = { 'rv-rise': 380, 'rv-slide': 340, 'rv-lbl': 400 };
    const fire = ([el, cls, step, cap], k) => {
      const d = Math.min(k, cap) * step;
      el.style.transitionDelay = d + 'ms';
      requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => {
        el.classList.remove(cls, 'in');
        el.style.transitionDelay = '';
      }, d + DUR[cls] + 260);   // 260 מכסה גם את הקו הנמשך שמאחר אחרי הטקסט
    };
    if (now) { targets.forEach(fire); return; }

    const map = new Map(targets.map(t => [t[0], t]));
    const io = new IntersectionObserver(entries => {
      // האינדקס נספר בתוך האצווה הזו בלבד. מונה שרץ לאורך חיי הדף היה נותן
      // לכל אלמנט מעבר לעשירי את ההשהיה המקסימלית — כלומר חצי שנייה של כלום.
      let k = 0;
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        fire(map.get(en.target), k++);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    targets.forEach(t => io.observe(t[0]));
  }

  // ---- כוכבים: מיקומים קבועים, לא אקראיים — אחרת הם קופצים בכל רינדור ----
  const STARS = [[8,14],[17,7],[24,20],[31,10],[39,17],[46,6],[54,22],[61,12],
                 [68,8],[74,19],[82,11],[89,21],[94,9],[13,25],[35,27],[57,29],[79,26],[21,13]];

  // ---- שכבת שמיים: שמש/ירח, כוכבים, עננים, ציפורים ----
  function skyLayer() {
    const A = window.ART || {};
    if (theme === 'night') {
      const stars = STARS.map(([x, y], i) =>
        `<i class="star" style="left:${x}%;top:${y}%;animation-delay:${(i % 7) * .7}s"></i>`).join('');
      return `<div class="l-sky">${stars}
        <div class="orb" style="left:14%;top:9%">${A.moon ? A.moon(54) : ''}</div></div>`;
    }
    return `<div class="l-sky">
      <div class="orb" style="left:16%;top:7%">${A.sun ? A.sun(62) : ''}</div>
      <div class="drift d1">${cloudSVG('var(--skyCloud)')}</div>
      <div class="drift d2">${cloudSVG('var(--skyCloud)')}</div>
      <svg class="birds" viewBox="0 0 60 20" width="54">
        <g fill="none" stroke="var(--bird)" stroke-width="1.4" stroke-linecap="round">
          <path d="M4,9 q4,-4 8,0 q4,-4 8,0"/><path d="M24,15 q3,-3 6,0 q3,-3 6,0"/>
          <path d="M40,6 q2.6,-2.6 5.2,0 q2.6,-2.6 5.2,0"/></g></svg></div>`;
  }

  // ---- דמויות: החתולות של הבית, ומי שעל הגג ----
  // mode מגיע ממזג האוויר, ומשנה תנוחה ואביזרים.
  function charLayer(mode) {
    const A = window.ART || {};
    if (!A.cat) return '<div class="l-chars"></div>';
    const wet = mode === 'rain', cold = mode === 'snow';
    const night = theme === 'night';

    // בגשם החתולות מסתתרות מתחת למטרייה; בקור הן מתכרבלות; בלילה הן ישנות.
    const curl = night || cold;
    const morgana = A.cat({ coat: 'var(--cat1)', pose: curl ? 'curl' : 'sit', w: curl ? 34 : 27, delay: 0 });
    const baltrkis = A.cat({ coat: 'var(--cat2)', pose: curl ? 'curl' : 'sit', w: curl ? 31 : 25, delay: 2.3 });

    let h = '<div class="l-chars">';

    // חוט פנסים כמו במאצורי. הפנסים תלויים עליו במקום לרחף:
    // הקשת היא בזייה ריבועית, והגובה של כל פנס מחושב מהנקודה שבה הוא נתלה.
    if (night) {
      h += `<svg class="wire" viewBox="0 0 100 12" preserveAspectRatio="none">
        <path d="M0,0 Q50,12 100,0" fill="none" stroke="var(--wire)" stroke-width=".7"/></svg>`;
      [[18, 12, 0], [40, 10, 1.1], [62, 13, .5], [84, 11, 1.7]].forEach(([pct, w, dly]) => {
        const t = pct / 100, dist = 68 - 24 * t * (1 - t);   // מרחק החוט מתחתית הסצנה
        h += `<div class="ch" style="left:${pct}%;bottom:${(dist - w * 30 / 18).toFixed(1)}px">
          ${A.lantern({ w: w, delay: dly })}</div>`;
      });
    }

    // החתולות יושבות על רכסי הגגות שכבר קיימים ב-l-village:
    // גג 258,35 → 39px מהתחתית · גג 86,38 → 36px · גג 356,38 → 36px
    h += `<div class="ch" style="left:66.2%;bottom:38px">
      ${wet ? `<div class="brolly">${A.umbrella(30)}</div>` : ''}${morgana}
      ${cold ? '<i class="snowcap"></i>' : ''}</div>`;
    h += `<div class="ch" style="left:22%;bottom:35px">${baltrkis}</div>`;
    h += night
      ? `<div class="ch" style="left:91.3%;bottom:35px">${A.ninja(24)}</div>`
      : `<div class="ch walk" style="left:6%;bottom:2px">${A.traveler(26)}</div>`;
    h += '</div>';
    return h;
  }

  // ---- ציור הסצנה ----
  function scene(host) {
    const r = document.documentElement.style;
    document.body.classList.toggle('is-day', theme === 'day');
    const mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.content = theme === 'day' ? '#f3ece0' : '#0b0e14';
    host.innerHTML = `<div class="art"></div>${skyLayer()}<div class="fx" id="fx"></div>
      <svg class="l-far" viewBox="0 0 390 150" preserveAspectRatio="none" style="height:150px">
        <defs>
          <filter id="pt" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.03" numOctaves="4" seed="7" result="n"/>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="13"/><feGaussianBlur stdDeviation="1.6"/></filter>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--ridge)" stop-opacity=".45"/><stop offset="100%" stop-color="var(--ridge)" stop-opacity="0"/></linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--ridge2)" stop-opacity=".8"/><stop offset="100%" stop-color="var(--ridge2)" stop-opacity="0"/></linearGradient>
        </defs>
        <path filter="url(#pt)" fill="url(#g1)" d="M-30,62 C12,48 32,14 60,28 C88,42 106,8 140,24 C170,38 192,18 216,34 C246,52 264,12 298,27 C328,40 352,22 420,45 L420,150 L-30,150 Z"/>
        <path filter="url(#pt)" fill="url(#g2)" d="M-30,98 C20,84 46,50 78,66 C112,82 130,40 164,58 C198,75 218,49 250,68 C284,87 308,52 342,70 C374,85 398,75 420,82 L420,150 L-30,150 Z"/>
      </svg>
      <svg class="l-village" viewBox="0 0 390 74" preserveAspectRatio="none" style="height:74px">
        <g fill="var(--roof)" class="plate">
          <path d="M18,74 L18,40 L24,40 L24,74 Z"/><path d="M4,44 L38,44 L32,38 L10,38 Z"/>
          <path d="M2,54 L40,54 L33,47 L9,47 Z"/><path d="M0,66 L42,66 L34,57 L8,57 Z"/>
          <path d="M62,74 L62,50 L86,38 L110,50 L110,74 Z"/><path d="M112,74 L112,56 L134,45 L156,56 L156,74 Z"/>
          <path d="M232,74 L232,48 L258,35 L284,48 L284,74 Z"/><path d="M286,74 L286,58 L306,48 L326,58 L326,74 Z"/>
          <path d="M328,74 L328,52 L356,38 L384,52 L384,74 Z"/>
        </g>
        <g fill="var(--tree)" class="plate">
          <path d="M178,74 L178,60 L182,60 L182,74 Z M164,60 Q180,28 196,60 Z"/>
          <path d="M206,74 L206,64 L209,64 L209,74 Z M196,64 Q207,40 218,64 Z"/>
        </g>
        <g fill="var(--lit)" opacity=".92">
          <rect x="70" y="60" width="8" height="11" rx="1.5"/><rect x="92" y="60" width="8" height="11" rx="1.5"/>
          <rect x="244" y="58" width="9" height="13" rx="1.5"/><rect x="264" y="58" width="9" height="13" rx="1.5"/>
          <rect x="340" y="60" width="8" height="11" rx="1.5"/><rect x="362" y="60" width="8" height="11" rx="1.5"/>
          <rect x="124" y="64" width="7" height="9" rx="1.5"/><rect x="300" y="64" width="7" height="9" rx="1.5"/>
        </g>
      </svg>
      ${charLayer('')}<div class="haze" id="haze"></div>`;
  }

  // ---- עדכון הדמויות והאובך כשמזג האוויר מתברר ----
  function decorate(mode) {
    const host = document.getElementById('scene');
    if (!host) return;
    const old = host.querySelector('.l-chars');
    if (old) { old.outerHTML = charLayer(mode); cacheLayers(); }
    const haze = document.getElementById('haze');
    if (haze) haze.classList.toggle('on', mode === 'mist');
    // שמש בוהקת באמצע גשם נראית כמו באג. מעוננים = מעמעמים את גוף השמיים.
    host.classList.toggle('overcast', mode === 'rain' || mode === 'snow' || mode === 'mist');
  }

  // קו המפתח חייב להיצמד למילוי בדיוק, ומתאר שנכתב ביד רק מקרב את איחוד
  // ארבעת העיגולים. במקום זה: אותן צורות בדיוק, מעובות בקו, ומסכה שמנקבת
  // את הפנים — כך שנשארת רק השפה החיצונית. מדויק לפי בנייה.
  const CLOUD_SHAPES = '<circle cx="34" cy="32" r="19"/><circle cx="66" cy="24" r="23"/>' +
    '<circle cx="100" cy="27" r="21"/><circle cx="128" cy="33" r="17"/>' +
    '<rect x="34" y="32" width="94" height="19" rx="9.5"/>';
  let cloudN = 0;

  function cloudSVG(fill, key) {
    const id = 'ck' + (++cloudN);
    return `<svg viewBox="0 0 160 58" preserveAspectRatio="none">
      ${key ? `<defs><mask id="${id}">
        <rect x="-6" y="-6" width="172" height="70" fill="#fff"/>
        <g fill="#000">${CLOUD_SHAPES}</g></mask></defs>
        <g fill="${key}" stroke="${key}" stroke-width="5" stroke-linejoin="round"
           mask="url(#${id})">${CLOUD_SHAPES}</g>` : ''}
      <g fill="${fill}" opacity=".3"><circle cx="34" cy="32" r="19"/><circle cx="66" cy="24" r="23"/><circle cx="100" cy="27" r="21"/><circle cx="128" cy="33" r="17"/><rect x="34" y="32" width="94" height="19" rx="9.5"/></g>
      <g fill="${fill}"><circle cx="34" cy="32" r="16"/><circle cx="66" cy="24" r="20"/><circle cx="100" cy="27" r="18"/><circle cx="128" cy="33" r="14"/><rect x="34" y="32" width="94" height="16" rx="8"/></g></svg>`;
  }

  const NAV = [
    ['today.html','היום','<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/>'],
    ['itinerary.html','מסלול','<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M6 8.4v4.1a4 4 0 0 0 4 4h4"/>'],
    ['wallet.html','ארנק','<rect x="3.5" y="6.5" width="17" height="12" rx="3"/><path d="M3.5 10.5h17"/>'],
    ['tasks.html','משימות','<path d="M4 7.5l2 2 3.5-3.5M4 16.5l2 2 3.5-3.5M13 7.5h7M13 16.5h7"/>']
  ];
  function nav(host, on) {
    host.innerHTML = NAV.map(([href, label, path]) =>
      `<a href="${href}${q.has('theme') ? '?theme=' + theme : ''}"${href === on ? ' class="on"' : ''}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>${label}</a>`).join('');
  }

  function net() {
    const t = document.getElementById('netTxt'), d = document.getElementById('netDot');
    const s = () => { if (!t) return;
      t.textContent = navigator.onLine ? 'מסונכרן' : 'אין רשת · מהזיכרון';
      d.style.background = navigator.onLine ? 'var(--ok)' : 'var(--dim)'; };
    addEventListener('online', s); addEventListener('offline', s); s();
  }

  // 落款 — החותם. תו אחד בריבוע ורמיליון, במקום שם המותג: הניווט התחתון
  // כבר אומר באיזה מסך אתה, והחותם אומר את זה בסימן ולא במילה.
  const SEAL = { 'today.html': '今', 'itinerary.html': '道',
                 'wallet.html': '財', 'tasks.html': '事', 'documents.html': '書' };

  function boot(page) {
    const brand = document.querySelector('.brand'), ch = SEAL[page];
    if (brand && ch) { brand.className = 'seal'; brand.textContent = ch; brand.title = 'NIPON26'; }
    scene(document.getElementById('scene'));
    nav(document.getElementById('nav'), page);
    net();
    parallax();
    const phase = (T.dayPhase && T.days) ? (T.dayPhase[T.days[dayIndex()].st] ?? 0) : 0;
    const fx = document.getElementById('fx');
    const forced = q.get('wx');
    if (forced) { particles(fx, forced); decorate(forced); return; }
    const first = theme === 'day' ? 'leaves' : 'clear';
    particles(fx, first); decorate(first);              // ברירת מחדל מיידית
    weather(phase, m => {
      const mode = theme === 'night' && m === 'leaves' ? 'clear' : m;
      particles(fx, mode); decorate(mode);
    });
  }

  return { T, q, theme, esc, DOW, dated, dayIndex, beforeTrip, factsFor, dl, cloudSVG, boot, today0, firstDay, particles, decorate, reveal };
})();
