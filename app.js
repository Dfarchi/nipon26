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

  // טקסט המחבר מכיל <b> ו-<br> בכוונה. בורחים מהכל ואז מחזירים רק את השניים
  // האלה — כך שסימן קטן יותר בתוכן לא יכול להפוך לתגית.
  function rich(s) {
    return esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/&lt;br\s*\/?&gt;/g, '<br>');
  }

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

  // ===== מי מחזיק את הטלפון =====
  // שניכם פותחים את אותה כתובת ואין התחברות, אז אין דרך לדעת מי זה —
  // חוץ מלשאול פעם אחת ולזכור במכשיר. מדלגים? פשוט לא פונים בשם.
  const WHO_KEY = 'nipon26_who';
  const PEOPLE = { yuval: 'יובל', shir: 'שירשה' };
  const who = () => { try { return localStorage.getItem(WHO_KEY) || ''; } catch (e) { return ''; } };
  const setWho = v => { try { localStorage.setItem(WHO_KEY, v); } catch (e) {} };

  // השעה מגיעה משעון המכשיר, כך שביפן זה יתקן את עצמו בלי קוד —
  // הטלפון יעבור ל-JST והברכה תזוז איתו.
  function greeting() {
    const hh = new Date().getHours();
    return hh < 5 ? 'לילה טוב' : hh < 11 ? 'בוקר טוב'
         : hh < 16 ? 'צהריים טובים' : hh < 22 ? 'ערב טוב' : 'לילה טוב';
  }

  // ברכה שהיא לא רק קישוט: שם, ואז הדבר היחיד שחשוב עכשיו.
  function hello(tail) {
    const w = who(), nm = PEOPLE[w];
    if (!w) {
      return `<div class="ping ask">מי פותח?
        <button class="chip pick-who" data-who="yuval">יובל</button>
        <button class="chip pick-who" data-who="shir">שיר</button>
        <button class="chip skip pick-who" data-who="-">דלג</button></div>`;
    }
    const name = nm ? `, ${nm}` : '';
    return `<div class="ping">${greeting()}${name}${tail ? ' · ' + tail : ''}</div>`;
  }

  // הלחיצה מחליפה את הברכה במקום, בלי לטעון מחדש
  function wireWho(host, tail) {
    if (!host) return;
    host.addEventListener('click', e => {
      const b = e.target.closest('.pick-who');
      if (!b) return;
      setWho(b.dataset.who === '-' ? 'skip' : b.dataset.who);
      host.outerHTML = hello(tail);
    });
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
  // 紅葉 momiji — חמישה אונות וגבעול. מה שהיה כאן קודם הוא כוכב בן שמונה
  // קצוות, ולכן "שלכת" נקראה כניצוצות כתומים ולא כעלים נופלים.
  const LEAF = '<path d="M12,1 L13.7,8 L20.6,5.2 L16,11.8 L22,15 L14.6,15.2 L17.2,21.2 ' +
    'L12.7,16.6 L12.7,23 L11.3,23 L11.3,16.6 L6.8,21.2 L9.4,15.2 L2,15 L8,11.8 ' +
    'L3.4,5.2 L10.3,8 Z"/>';
  // בלילה העלים כהים. אותם פיגמנטים, מעומעמים — עלה שנופל מול שמי לילה
  // ומואר כמו ביום קורא כמדבקה.
  const LEAF_COL_DAY   = ['#d4622f', '#e0a03a', '#c1303f', '#b8541f'];
  const LEAF_COL_NIGHT = ['#7e3a1c', '#8a6122', '#73202a', '#6b3212'];

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
        const LC = theme === 'night' ? LEAF_COL_NIGHT : LEAF_COL_DAY;
        el.innerHTML = `<g fill="${LC[i % LC.length]}">${LEAF}</g>`;
        el.style.cssText = `position:absolute;width:${size}px;right:${rnd(-2, 100)}%;opacity:.75;
          animation:fall ${dur}s linear ${rnd(0, dur)}s infinite`;
        el.style.opacity = theme === 'night' ? '.62' : '.75';
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

  // ===== הכפר =====
  // אותם מיקומי פסגה בשלוש הווריאנטות (x≈86, 258, 356), כי החתולות יושבות
  // עליהן במיקומים קבועים ב-charLayer. שינוי כאן בלי לשמור עליהם = חתולה
  // שמרחפת באוויר.
  const GROUND = '<path fill="var(--land)" d="M-30,70 C60,63 120,73 190,67 C250,62 300,72 360,65 ' +
    'C390,62 410,67 420,65 L420,104 L-30,104 Z"/>';

  // חלון מואר — הצורה החוזרת בשלוש הווריאנטות
  const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2"/>`;

  // גג רעפים: קו שחור עם מעוף קל בקצוות, כמו 瓦屋根
  const tileRoof = (cx, y, half, drop) =>
    `<path d="M${cx - half - 4},${y + drop} Q${cx - half},${y + drop - 3} ${cx - half + 3},${y + drop - 4} ` +
    `L${cx},${y} L${cx + half - 3},${y + drop - 4} Q${cx + half},${y + drop - 3} ${cx + half + 4},${y + drop} Z"/>`;

  function townSVG() {
    // 町家 ו-蔵: קיר טיח לבן, גג רעפים שחור, ותורי ארגמן. אדום־שחור־לבן.
    return `${GROUND}
      <g fill="var(--torii)">
        <path d="M8,74 L8,50 L11,50 L11,74 Z M28,74 L28,50 L31,50 L31,74 Z"/>
        <path d="M2,46 L37,46 L34,42 L5,42 Z"/><path d="M4,52 L35,52 L35,54 L4,54 Z"/>
      </g>
      <g fill="var(--plaster)">
        <rect x="52" y="48" width="42" height="26" rx="1"/>
        <rect x="300" y="52" width="38" height="22" rx="1"/>
      </g>
      <g fill="var(--tile)" class="plate">
        ${tileRoof(73, 38, 30, 11)}${tileRoof(319, 44, 27, 9)}
        <path d="M120,74 L120,56 L152,56 L152,74 Z"/>${tileRoof(136, 47, 22, 9)}
        <path d="M232,74 L232,52 L284,52 L284,74 Z"/>${tileRoof(258, 35, 34, 17)}
        <path d="M356,74 L356,56 L384,56 L384,74 Z"/>${tileRoof(370, 44, 22, 12)}
        <path d="M172,74 L172,60 L206,60 L206,74 Z"/>${tileRoof(189, 50, 24, 10)}
      </g>
      <g fill="var(--tile)" opacity=".9">
        <path d="M60,60 h26 v1.4 h-26 Z M60,65 h26 v1.4 h-26 Z"/>
        <path d="M306,60 h26 v1.4 h-26 Z M306,65 h26 v1.4 h-26 Z"/>
      </g>
      <g fill="var(--lit)" opacity=".92">
        ${win(126, 62, 8, 9)}${win(140, 62, 8, 9)}${win(240, 58, 9, 11)}${win(262, 58, 9, 11)}
        ${win(362, 62, 7, 8)}${win(178, 65, 7, 7)}${win(194, 65, 7, 7)}
      </g>
      <g fill="var(--tree)"><path d="M214,74 L214,63 L217,63 L217,74 Z M204,63 Q215,38 226,63 Z"/></g>`;
  }

  function citySVG() {
    // מגדלים בגבהים משתנים ורשת חלונות. הפסגות נשמרות כמדרגות גג שטוחות.
    const grid = (x, y, w, h, cols, rows) => {
      let g = '';
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++)
        if ((c + r * 3) % 4 !== 1) g += win(x + 4 + c * 7, y + 5 + r * 7, 4, 4.5);
      return g;
    };
    return `${GROUND}
      <g fill="var(--roof)" class="plate">
        <path d="M6,74 L6,44 L34,44 L34,74 Z"/>
        <path d="M44,74 L44,56 L74,56 L74,74 Z"/>
        <path d="M78,74 L78,35 L112,35 L112,74 Z"/>
        <path d="M120,74 L120,50 L158,50 L158,74 Z"/>
        <path d="M168,74 L168,60 L200,60 L200,74 Z"/>
        <path d="M212,74 L212,46 L240,46 L240,74 Z"/>
        <path d="M244,74 L244,35 L274,35 L274,74 Z"/>
        <path d="M282,74 L282,54 L316,54 L316,74 Z"/>
        <path d="M326,74 L326,38 L386,38 L386,74 Z"/>
      </g>
      <g fill="var(--torii)">
        <path d="M252,35 L252,22 L254,22 L254,35 Z"/><circle cx="253" cy="20" r="2.4"/>
      </g>
      <g fill="var(--lit)" opacity=".8">
        ${grid(6, 44, 28, 30, 3, 4)}${grid(78, 35, 34, 39, 4, 5)}${grid(120, 50, 38, 24, 4, 3)}
        ${grid(212, 46, 28, 28, 3, 4)}${grid(244, 35, 30, 39, 3, 5)}${grid(326, 38, 60, 36, 7, 5)}
      </g>`;
  }

  function mountainSVG() {
    // 合掌造り: גגות תלולים לשלג, וצפיפות עצים גבוהה.
    const gassho = (cx, peak, half) =>
      `<path d="M${cx - half},74 L${cx},${peak} L${cx + half},74 Z"/>`;
    return `${GROUND}
      <g fill="var(--tile)" class="plate">
        ${gassho(86, 36, 28)}${gassho(258, 35, 30)}${gassho(356, 38, 25)}
        ${gassho(150, 52, 20)}${gassho(310, 55, 17)}
      </g>
      <g fill="var(--lit)" opacity=".9">
        ${win(80, 62, 8, 9)}${win(252, 60, 9, 10)}${win(351, 64, 7, 7)}${win(145, 65, 7, 6)}
      </g>
      <g fill="var(--tree)">
        <path d="M22,74 L22,58 L25,58 L25,74 Z M10,58 Q23,26 36,58 Z"/>
        <path d="M46,74 L46,62 L48,62 L48,74 Z M37,62 Q47,38 57,62 Z"/>
        <path d="M196,74 L196,60 L199,60 L199,74 Z M185,60 Q197,32 209,60 Z"/>
        <path d="M218,74 L218,64 L220,64 L220,74 Z M210,64 Q219,44 228,64 Z"/>
        <path d="M290,74 L290,63 L292,63 L292,74 Z M281,63 Q291,40 301,63 Z"/>
        <path d="M382,74 L382,61 L385,61 L385,74 Z M371,61 Q383,34 395,61 Z"/>
      </g>`;
  }

  // איזה נוף. נגזר מבלוק הלינה של היום — הוא השדה הנקי היחיד שאומר איפה אתם.
  function villageSVG() {
    const st = (T.days && T.days[dayIndex()] || {}).st || '';
    const kind = /טוקיו|אוסקה|נגויה/.test(st) ? 'city'
               : /אלפים|קויאסאן/.test(st) ? 'mountain' : 'town';
    const body = kind === 'city' ? citySVG() : kind === 'mountain' ? mountainSVG() : townSVG();
    return `<svg class="l-village" data-kind="${kind}" viewBox="0 0 390 104"
      preserveAspectRatio="none" style="height:104px">${body}</svg>`;
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
      ${villageSVG()}
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
    ['tasks.html','משימות','<path d="M4 7.5l2 2 3.5-3.5M4 16.5l2 2 3.5-3.5M13 7.5h7M13 16.5h7"/>'],
    ['tools.html','כלים','<path d="M14.5 3.5a4.5 4.5 0 0 0-5.6 5.6L3.5 14.5v6h6l5.4-5.4a4.5 4.5 0 0 0 5.6-5.6l-3 3-2.6-2.6z"/>']
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
                 'wallet.html': '財', 'tasks.html': '事', 'tools.html': '具', 'documents.html': '書' };

  function boot(page) {
    const brand = document.querySelector('.brand'), ch = SEAL[page];
    if (brand && ch) { brand.className = 'seal'; brand.textContent = ch; brand.title = 'NIPON26'; }
    scene(document.getElementById('scene'));
    if (!document.querySelector('.bloom')) {
      const bl = document.createElement('div'); bl.className = 'bloom';
      document.body.insertBefore(bl, document.body.firstChild);
    }
    nav(document.getElementById('nav'), page);
    // today0 מחושב פעם אחת בטעינת הסקריפט. PWA שנשאר פתוח בטלפון וחוצה חצות
    // ימשיך להציג את הספירה של אתמול — אז כשחוזרים אליו, אם התאריך זז, טוענים.
    const bootDay = today0.getTime();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
      if (d !== bootDay) location.reload();
    });
    net();
    parallax();
    const phase = (T.dayPhase && T.days) ? (T.dayPhase[T.days[dayIndex()].st] ?? 0) : 0;
    const fx = document.getElementById('fx');
    const forced = q.get('wx');
    const pmF = m => m === 'clear' ? 'leaves' : m;
    if (forced) { particles(fx, pmF(forced)); decorate(forced); return; }
    // decorate מקבל את המצב האמיתי (הוא מכוון שמש/ערפל), אבל החלקיקים
    // מתרגמים "בהיר" לשלכת: clear היה n:0, כלומר שום דבר לא נפל ביום בהיר
    // באוקטובר — בדיוק העונה שבשבילה נוסעים.
    particles(fx, 'leaves'); decorate('clear');         // ברירת מחדל מיידית
    weather(phase, m => { particles(fx, pmF(m)); decorate(m); });
  }

  return { T, q, theme, esc, DOW, dated, dayIndex, beforeTrip, factsFor, rich, dl, hello, wireWho, who, cloudSVG, boot, today0, firstDay, particles, decorate, reveal };
})();
