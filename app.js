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
    // השם ב-mapPoints הוא "טוקיו (Tokyo · 東京)" או "יודאנקה · קופי ג'יגוקודאי".
    // לשורה צרה צריך רק את החלק הראשון בעברית.
    const nm = String(p && p.n || '').replace(/\s*[(（].*$/, '').split(/\s*[·\/]\s*/)[0].trim();
    return p ? { lat: p.lat, lng: p.lng, n: nm } : null;
  }
  function weather(phase, cb) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(WKEY) || 'null'); } catch (e) {}
    if (cached && Date.now() - cached.at < 36e5) return cb(cached.mode, cached);
    const c = coordsFor(phase);
    if (!c || !navigator.onLine) return cb(cached ? cached.mode : 'leaves', cached);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}` +
          `&current=weather_code,temperature_2m`)
      .then(r => r.json())
      .then(j => {
        const cur = (j && j.current) || {};
        const rec = { mode: modeFromCode(cur.weather_code), at: Date.now(),
                      temp: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
                      place: c.n };
        try { localStorage.setItem(WKEY, JSON.stringify(rec)); } catch (e) {}
        cb(rec.mode, rec);
      })
      .catch(() => cb(cached ? cached.mode : 'leaves', cached));
  }

  // ===== שורת מזג האוויר =====
  // הבקשה רצה בדפדפן של הטלפון ואי אפשר לבדוק אותה מכאן. בלי שורה שאומרת
  // מה חזר, "עובד" הוא ניחוש. עכשיו כתוב מה נמדד, איפה, ומתי — ואם זה
  // נכפה ב-?wx= או בא מהזיכרון, זה כתוב גם.
  const WX_LABEL = { clear: ['☀️', 'בהיר'], leaves: ['⛅', 'מעונן'], rain: ['🌧', 'גשם'],
                     snow: ['❄️', 'שלג'], mist: ['🌫', 'ערפל'] };
  function showWx(mode, rec, forced) {
    const el = document.getElementById('wx');
    if (!el) return;
    const [ic, name] = WX_LABEL[mode] || WX_LABEL.leaves;
    let s = `${ic} ${name}`;
    if (rec && typeof rec.temp === 'number') s += ` ${rec.temp}°`;
    if (rec && rec.place) s += ` · ${rec.place}`;
    if (forced) s += ' · נכפה';
    else if (rec && rec.at) {
      const min = Math.round((Date.now() - rec.at) / 6e4);
      s += min < 2 ? ' · עכשיו' : ` · לפני ${min} דק׳`;
    } else s += ' · אין נתון';
    el.textContent = s;
    el.hidden = false;
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
  const DEPTH = [['.l-sky', 0.06], ['.l-far', 0.12], ['.l-back', 0.42],
                 ['.l-village', 0.42], ['.l-art', 0.42], ['.l-chars', 0.42]];

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
    // שתיהן שחורות. ההבדל הוא גוון הפרווה וצבע העיניים, לא ג'ינג'י מול שחור.
    const morgana = A.cat({ coat: 'var(--cat1)', eye: 'var(--catEye)', pose: curl ? 'curl' : 'sit', w: curl ? 34 : 27, delay: 0 });
    const baltrkis = A.cat({ coat: 'var(--cat2)', eye: 'var(--catEye2)', pose: curl ? 'curl' : 'sit', w: curl ? 31 : 25, delay: 2.3 });

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
    // המושבים מגיעים מהסצנה שנבנתה, לא ממספרים בקוד: הגגות זזים בכל יום.
    // ההמרה: left = x/3.9%  ·  bottom = 74 − y  (מקור: l-chars ב-bottom:30 וגובה 74)
    const st = (SCENE && SCENE.seats) || [{ x: 258, y: 36 }, { x: 86, y: 39 }, { x: 356, y: 39 }];
    const at = s => `left:${(s.x / 3.9).toFixed(1)}%;bottom:${(74 - s.y).toFixed(1)}px`;
    h += `<div class="ch" style="${at(st[0])}">
      ${wet ? `<div class="brolly">${A.umbrella(30)}</div>` : ''}${morgana}
      ${cold ? '<i class="snowcap"></i>' : ''}</div>`;
    h += `<div class="ch" style="${at(st[1])}">${baltrkis}</div>`;
    h += night
      ? `<div class="ch" style="${at(st[2])}">${A.ninja(24)}</div>`
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

  function villageSVG_() {
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

  // ===== הנוף =====
  // נבנה מחדש בכל יום מזרע קבוע: אותו יום → אותה סצנה תמיד, יום אחר →
  // פריסה אחרת. אותו אזור לא נראה זהה שבוע ברציפות, ובלי אקראיות שקופצת
  // בכל רינדור. החתולות כבר לא מעוגנות למספרים קשיחים אלא לגגות שנוצרו,
  // ולכן הגגות חופשיים לזוז.
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // רכס הרים מנקודות דגימה, עם משיקים אופקיים בכל נקודה — גבעות מתגלגלות,
  // לא זיגזג. השמיים הם רוב המסך; אם רק הבניינים משתנים, היום עדיין נראה זהה.
  const ridgePath = (R, base, amp, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const high = i % 2 === 1;            // פסגה, עמק, פסגה — לא הילוך אקראי
      pts.push({ x: -30 + i * (450 / n), y: base - amp * (high ? .58 + R() * .42 : .04 + R() * .26) });
    }
    let d = `M${pts[0].x.toFixed(0)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i <= n; i++) {
      const a = pts[i - 1], b = pts[i], span = b.x - a.x, dy = b.y - a.y;
      const k = .16 + R() * .2;          // בקרה קרובה לקו הישר → מדרון ישר
      d += ` C${(a.x + span * k).toFixed(0)},${(a.y + dy * k * 1.7).toFixed(1)} ` +
           `${(b.x - span * k).toFixed(0)},${(b.y - dy * k * 1.7).toFixed(1)} ` +
           `${b.x.toFixed(0)},${b.y.toFixed(1)}`;
    }
    return d + ' L420,150 L-30,150 Z';
  };

  const winTint = r => r < .18 ? 'var(--tvlit)' : 'var(--lit)';

  // רשת חלונות עם כמה כבויים וכמה בגוון מסך
  const grid = (x, y, w, h, R) => {
    let g = '', cols = Math.max(1, Math.floor((w - 5) / 6)), rows = Math.max(1, Math.floor((h - 6) / 6));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const v = R();
      if (v < .32) continue;
      g += `<rect x="${(x + 3.5 + c * 6).toFixed(1)}" y="${(y + 4 + r * 6).toFixed(1)}" ` +
           `width="3.4" height="3.8" rx="1" fill="${winTint(v)}"/>`;
    }
    return g;
  };

  // מכל מים על הגג — הפרט שהופך גוש למבנה עירוני
  const tank = (x, y) => `<path d="M${x},${y} L${x},${y - 5} L${x + 9},${y - 5} L${x + 9},${y} Z
    M${x + 1.5},${y} L${x + 1.5},${y + 3} M${x + 7},${y} L${x + 7},${y + 3}"
    stroke="var(--roof)" stroke-width="1.4" fill="var(--roof)"/>`;

  // עמוד חשמל עם כבלים — הדבר הכי יפני בכל רחוב, ואף פעם לא בתמונות
  const pole = (x, h) => `<g stroke="var(--wire)" stroke-width=".9" fill="none" opacity=".75">
    <path d="M${x},74 L${x},${74 - h}"/>
    <path d="M${x - 5},${74 - h + 4} L${x + 5},${74 - h + 4}"/>
    <path d="M${x - 4},${74 - h + 9} L${x + 4},${74 - h + 9}"/></g>`;

  // עץ: אורן בשכבות אופקיות, או עץ עגול. הפטרייה הקודמת לא נראתה יפנית.
  const treeAt = (tx, th, R) => {
    const base = 74 - th * .42;
    let s = `<path d="M${(tx - 1.3).toFixed(1)},74 L${(tx - 1.3).toFixed(1)},${base.toFixed(1)} ` +
            `L${(tx + 1.3).toFixed(1)},${base.toFixed(1)} L${(tx + 1.3).toFixed(1)},74 Z"/>`;
    if (R() < .5) {
      for (let i = 0; i < 3; i++) {
        const y = 74 - th * (.5 + i * .24), hw = th * (.44 - i * .11);
        s += `<path d="M${(tx - hw).toFixed(1)},${y.toFixed(1)} Q${tx.toFixed(1)},${(y - th * .2).toFixed(1)} ` +
             `${(tx + hw).toFixed(1)},${y.toFixed(1)} Q${tx.toFixed(1)},${(y + th * .06).toFixed(1)} ` +
             `${(tx - hw).toFixed(1)},${y.toFixed(1)} Z"/>`;
      }
      return s;
    }
    return s + `<path d="M${(tx - th * .42).toFixed(1)},${base.toFixed(1)} Q${tx.toFixed(1)},${(74 - th * 1.4).toFixed(1)} ` +
               `${(tx + th * .42).toFixed(1)},${base.toFixed(1)} Z"/>`;
  };

  // ---- קומת הרחוב ----
  // הפס שמתחת לבניינים היה ריק. אלה הדברים שבאמת עומדים ברחוב יפני,
  // בקנה מידה גדול יותר מהבניינים כי הם קרובים יותר.
  const vending = x => `<rect x="${x}" y="70" width="17" height="26" rx="1.4" fill="var(--roof)"/>
    <rect x="${x + 2}" y="72.4" width="13" height="13.5" rx="1" fill="var(--tvlit)" opacity=".8"/>
    <rect x="${x + 2}" y="88" width="13" height="3" rx="1" fill="var(--lit)"/>
    <rect x="${x + 2}" y="92.4" width="5" height="2" rx=".8" fill="var(--wire)" opacity=".6"/>`;

  const toro = x => `<g fill="var(--tile)">
    <path d="M${x - 7},96 L${x + 7},96 L${x + 6},92 L${x - 6},92 Z"/>
    <path d="M${x - 3},92 L${x - 3},83 L${x + 3},83 L${x + 3},92 Z"/>
    <path d="M${x - 8.5},82.4 L${x + 8.5},82.4 L${x + 5},76.5 L${x - 5},76.5 Z"/>
    <path d="M${x - 1.4},76.5 L${x - 1.4},72.6 L${x + 1.4},72.6 L${x + 1.4},76.5 Z"/></g>
    <rect x="${x - 3.6}" y="76.8" width="7.2" height="5.4" rx=".6" fill="var(--lit)" opacity=".95"/>`;

  // חנות עם נורן: הפתח הכהה מאחור הוא מה שהופך שלושה פסים אדומים לדלת
  const norenAt = x => `<rect x="${x - 2}" y="74" width="30" height="22" rx="1" fill="var(--roof)"/>
    <rect x="${x - 4}" y="72.6" width="34" height="3" rx="1" fill="var(--tile)"/>
    <rect x="${x + 1}" y="78" width="24" height="18" fill="var(--tile)"/>
    <g fill="var(--torii)"><rect x="${x + 1.6}" y="78" width="6.8" height="11" rx=".6"/>
    <rect x="${x + 9.6}" y="78" width="6.8" height="11" rx=".6"/>
    <rect x="${x + 17.6}" y="78" width="6.8" height="11" rx=".6"/></g>
    <rect x="${x + 1}" y="76.8" width="24" height="1.4" fill="var(--tile)"/>`;

  // מכונת משקאות, פנס אבן ונורן — שלושה דברים שרואים ביפן כל יום
  const STREET = { tokyo: ['vending', 'vending', 'noren'], osaka: ['vending', 'noren', 'vending'],
                   nagoya: ['vending', 'noren', 'toro'], kyoto: ['toro', 'noren', 'toro'],
                   village: ['toro', 'noren', 'toro'], mountain: ['toro', 'toro', 'noren'] };

  // הכביש: פס בהיר שמפריד בין הבתים לקדמה, אחרת הכל צף על מישור אחד
  const ROAD = '<path fill="var(--wire)" opacity=".13" d="M-30,84 C90,81 200,86 300,82 L420,84 L420,104 L-30,104 Z"/>';

  // תעלה — כמו שירקאווה בקיוטו. הבתים מאחור, הגדה הקרובה מלפנים,
  // ובאמצע פס מים שמחזיר את האור של החלונות כמריחה אנכית רועדת.
  const canalAt = (R, lit) => {
    let s = '<path fill="var(--ridge)" opacity=".5" d="M-30,80 C90,78.5 200,82 300,79.5 L420,81 L420,92 ' +
            'C300,93.5 190,90 90,92.5 L-30,91 Z"/>';
    lit.forEach(x => {
      s += `<rect x="${(x - 3.4).toFixed(1)}" y="80" width="6.8" height="12" fill="var(--lit)" opacity=".3"/>` +
           `<rect x="${(x - 1.3).toFixed(1)}" y="80" width="2.6" height="12" fill="var(--lit)" opacity=".5"/>`;
    });
    for (let i = 0; i < 11; i++)
      s += `<rect x="${(-10 + R() * 400).toFixed(1)}" y="${(81 + R() * 9).toFixed(1)}" ` +
           `width="${(9 + R() * 18).toFixed(1)}" height=".9" rx=".45" fill="var(--rice)" opacity=".3"/>`;
    return s;
  };

  // שלט אנכי. בקנה מידה הזה קנג׳י אמיתי הוא כתם — אז משיכות מופשטות,
  // שלוש או ארבע לכל סימן. זה מה שהעין קוראת כשלט יפני מרחוק.
  const signAt = (x, y, h, R) => {
    const col = R() < .5 ? 'var(--torii)' : 'var(--hot)';
    let s = `<rect x="${(x - 1.6).toFixed(1)}" y="${y.toFixed(1)}" width="1.6" height="3.4" fill="var(--wire)" opacity=".7"/>` +
            `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7.4" height="${h.toFixed(1)}" rx="1" fill="${col}"/>`;
    for (let i = 0; i + 8 < h; i += 8) {
      const gy = y + 3 + i;
      s += `<g fill="var(--rice)" opacity=".9">` +
           `<rect x="${(x + 1.7).toFixed(1)}" y="${gy.toFixed(1)}" width="4" height=".9"/>` +
           `<rect x="${(x + 1.7).toFixed(1)}" y="${(gy + 2.1).toFixed(1)}" width="4" height=".9"/>` +
           `<rect x="${(x + 3.3).toFixed(1)}" y="${gy.toFixed(1)}" width=".9" height="4.8"/>` +
           (R() < .55 ? `<rect x="${(x + 1.7).toFixed(1)}" y="${(gy + 4.2).toFixed(1)}" width="4" height=".9"/>` : '') +
           `</g>`;
    }
    return s;
  };

  // אוניגאווארה — כובע הרכס עם שתי קרניים בקצוות. שתי נקודות לכל גג,
  // וזה כבר גג יפני ולא משולש. חייב להיצמד לפסגה, אחרת הוא מרחף.
  const ridgeEnds = (cx, y, half) => { const h = Math.min(7, half * .22);
    return `<path d="M${(cx - h).toFixed(1)},${(y - 1.1).toFixed(1)} L${(cx + h).toFixed(1)},${(y - 1.1).toFixed(1)} ` +
      `L${(cx + h).toFixed(1)},${(y + 1.7).toFixed(1)} L${(cx - h).toFixed(1)},${(y + 1.7).toFixed(1)} Z ` +
      `M${(cx - h).toFixed(1)},${(y - 1.1).toFixed(1)} l0,-3 l2,3 Z ` +
      `M${(cx + h).toFixed(1)},${(y - 1.1).toFixed(1)} l0,-3 l-2,3 Z"/>`; };

  // הארובה נשארת SVG (היא חלק מהגג), העשן מגיע כתמונה ב-.l-art
  const chimneyStack = (x, y) =>
    `<rect x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" width="5" height="11" rx=".8" fill="var(--ridge2)"/>` +
    `<rect x="${(x - 1).toFixed(1)}" y="${(y - 9.4).toFixed(1)}" width="7" height="2" rx=".6" fill="var(--ridge2)"/>`;

  const tileRoof2 = (cx, y, half, drop) =>
    `<path d="M${cx - half - 4},${y + drop} Q${cx - half},${y + drop - 3} ${cx - half + 3},${y + drop - 4} ` +
    `L${cx},${y} L${cx + half - 3},${y + drop - 4} Q${cx + half},${y + drop - 3} ${cx + half + 4},${y + drop} Z"/>`;

  // ---- נכסי הרחוב ----
  // h הוא גובה ביחידות הסצנה (74 = קו הקרקע). y הוא היכן הבסיס יושב:
  // 96 = על המדרכה לפני הבתים, 74 = על קו הקרקע, 62 = על גג.
  // הרוחב נגזר מיחס התמונה ולכן לא מופיע כאן — אחרת הוא מתעוות.
  const PROP = {
    vending: { f: 'street/vending-machine', h: 30, y: 98 },
    toro:    { f: 'street/toro',            h: 27, y: 98 },
    noren:   { f: 'street/noren',           h: 24, y: 96 },
    pole:    { f: 'street/utility-pole',    h: 27, y: 75 },
    tank:    { f: 'street/water-tank',      h: 10, y: 0  },   // y מגיע מהגג
    brolly:  { f: 'street/red-umbrella',    h: 22, y: 97 },
    smoke:   { f: 'street/chimney-smoke',   h: 30, y: 0  },
    pine:    { f: 'street/black-pine',      h: 30, y: 76 },
    maple:   { f: 'street/maple-tree',      h: 32, y: 76 }
  };

  // ---- ציוני דרך: התמונות ----
  // גובה לכל אחד בנפרד, כי הם לא באמת באותו סדר גודל: מגדל טוקיו מתנשא
  // מעל העיר, תורי בקושי מעל גג. base הוא כמה הבסיס יושב מעל קו הקרקע —
  // התורי של המקדש עומד על מדרגה, המגדל ניצב על הקרקע.
  const LM_IMG = {
    // ‎tokyo-tower-night הגיע כציור שלם עם גלים, שמש ועצי אדר במקום צללית.
    // עד שיוחלף — הקובץ הצבעוני בשתי הערכות. הוא נקרא סביר גם על שמי יום.
    tokyo:  { f: 'tokyo-tower',   h: 86, base: 0, solo: 'day' },
    osaka:  { f: 'tsutenkaku',    h: 74, base: 0 },
    nagoya: { f: 'nagoya-castle', h: 46, base: 0 },
    kyoto:  { f: 'pagoda',        h: 62, base: 0 },
    torii:  { f: 'torii',         h: 34, base: 0 }
  };
  // הקבצים נקראים ‎-day (צבעוני) ו-‎-night (צללית כהה), וזה הפוך ממה
  // שצריך: צללית כהה נעלמת על שמי לילה, וצבעוני בולט עליהם. בפועל —
  // ביום הצללית, בלילה הצבעוני. זה גם נכון למציאות: מגדל טוקיו והפגודה
  // מוארים בלילה. נבדק ברינדור: הפגודה והתורי הכהים פשוט לא נראו.
  const lmFile = kind => { const c = LM_IMG[kind];
    return `assets/landmarks/${c.f}-${c.solo || (theme === 'day' ? 'night' : 'day')}.webp`; };

  // ---- ציוני דרך ----
  const LM = {
    tokyo: cx => `<g fill="var(--torii)">
      <path d="M${cx - 13},74 L${cx - 4},20 L${cx + 4},20 L${cx + 13},74 L${cx + 8},74 L${cx},30 L${cx - 8},74 Z"/>
      <path d="M${cx - 9},50 L${cx + 9},50 L${cx + 9},53 L${cx - 9},53 Z"/>
      <path d="M${cx - 6},36 L${cx + 6},36 L${cx + 6},39 L${cx - 6},39 Z"/>
      <path d="M${cx - 1},20 L${cx - 1},9 L${cx + 1},9 L${cx + 1},20 Z"/></g>
      <circle cx="${cx}" cy="7" r="2" fill="var(--hot)"/>`,
    osaka: cx => `<g fill="var(--roof)">
      <path d="M${cx - 11},74 L${cx - 5},34 L${cx + 5},34 L${cx + 11},74 Z"/>
      <path d="M${cx - 8},32 L${cx + 8},32 L${cx + 6},26 L${cx - 6},26 Z"/>
      <path d="M${cx - 1.4},26 L${cx - 1.4},17 L${cx + 1.4},17 L${cx + 1.4},26 Z"/></g>
      <g fill="var(--hot)"><circle cx="${cx}" cy="15" r="3"/>
      <path d="M${cx - 7},28 L${cx + 7},28 L${cx + 7},30.5 L${cx - 7},30.5 Z"/></g>`,
    nagoya: cx => `<g fill="var(--plaster)">
      <rect x="${cx - 17}" y="46" width="34" height="28" rx="1"/>
      <rect x="${cx - 12}" y="32" width="24" height="12" rx="1"/></g>
      <g fill="var(--tile)">
        <path d="M${cx - 24},48 Q${cx - 18},41 ${cx - 12},39 L${cx},36 L${cx + 12},39 Q${cx + 18},41 ${cx + 24},48 Z"/>
        <path d="M${cx - 17},34 Q${cx - 12},28 ${cx - 7},26 L${cx},24 L${cx + 7},26 Q${cx + 12},28 ${cx + 17},34 Z"/></g>
      <g fill="var(--hot)"><path d="M${cx - 5},24 q2,-5 5,-5 q3,0 5,5 Z"/></g>`,
    kyoto: cx => { let g = `<path d="M${cx - 10},74 L${cx - 10},70 L${cx + 10},70 L${cx + 10},74 Z"/>`;
      // חמש קומות. בין גג לגג יש קיר — בלי זה זה נראה כמו עץ אשוח.
      for (let i = 0; i < 5; i++) { const y = 26 + i * 9.2, w = 6.4 + i * 2.2;
        g += `<path d="M${cx - w + 2},${y + 8.2} L${cx - w + 2},${y + 3.2} L${cx + w - 2},${y + 3.2} ` +
             `L${cx + w - 2},${y + 8.2} Z"/>` +
             `<path d="M${cx - w - 2.6},${y + 3.4} Q${cx - w},${y + .4} ${cx - w + 3},${y - .4} L${cx},${y - 2.4} ` +
             `L${cx + w - 3},${y - .4} Q${cx + w},${y + .4} ${cx + w + 2.6},${y + 3.4} Z"/>`; }
      // סורין — הצריח והטבעות שבראש כל פגודה
      g += `<path d="M${cx - .9},26 L${cx - .9},11 L${cx + .9},11 L${cx + .9},26 Z"/>`;
      for (let i = 0; i < 4; i++) g += `<path d="M${cx - 3},${14 + i * 2.7} L${cx + 3},${14 + i * 2.7} ` +
        `L${cx + 3},${15 + i * 2.7} L${cx - 3},${15 + i * 2.7} Z"/>`;
      return `<g fill="var(--torii)">${g}</g>`; },
    torii: cx => `<g fill="var(--torii)">
      <path d="M${cx - 19},74 L${cx - 19},44 L${cx - 15},44 L${cx - 15},74 Z
               M${cx + 15},74 L${cx + 15},44 L${cx + 19},44 L${cx + 19},74 Z"/>
      <path d="M${cx - 28},34 Q${cx},41 ${cx + 28},34 L${cx + 27},38 Q${cx},44.5 ${cx - 27},38 Z"/>
      <path d="M${cx - 24},46 L${cx + 24},46 L${cx + 24},49 L${cx - 24},49 Z"/>
      <path d="M${cx - 2},40 L${cx - 2},46 L${cx + 2},46 L${cx + 2},40 Z"/></g>`
  };

  // ---- פרופיל לכל אזור ----
  const PROFILE = {
    tokyo:    { lm: 'tokyo',  n: [9, 11], hi: [14, 46], flat: 1, tank: .22, pole: 1, tree: 0, sign: 3 },
    osaka:    { lm: 'osaka',  n: [9, 12], hi: [34, 56], flat: 1, tank: .26, pole: 1, tree: 0, sign: 5 },
    nagoya:   { lm: 'nagoya', n: [8, 10], hi: [38, 58], flat: 1, tank: .18, pole: 1, tree: 1, sign: 2 },
    kyoto:    { lm: 'kyoto',  n: [7, 9],  hi: [44, 58], flat: 0, tank: 0, pole: 1, tree: 2, sign: 1, canal: 1 },
    village:  { lm: 'torii',  n: [6, 8],  hi: [46, 60], flat: 0, tank: 0, pole: 1, tree: 2, sign: 0, smoke: 1 },
    mountain: { lm: 'torii',  n: [5, 7],  hi: [36, 56], flat: 0, gassho: 1, tank: 0, pole: 0, tree: 6, sign: 0, smoke: 1 }
  };

  // ---- בניית הסצנה ----
  function buildScene(kind, seed) {
    const P = PROFILE[kind], R = rng(seed);
    const pick = ([a, b]) => a + R() * (b - a);
    const n = Math.round(pick(P.n));

    // פריסה: רוחבים ומרווחים משתנים, ואז נרמול לרוחב המלא
    const slots = [];
    let w = [], gap = [];
    for (let i = 0; i < n; i++) { w.push(26 + R() * 34); gap.push(4 + R() * 14); }
    const total = w.reduce((a, b) => a + b, 0) + gap.reduce((a, b) => a + b, 0);
    const k = 450 / total;
    let x = -30;
    for (let i = 0; i < n; i++) {
      const bw = w[i] * k, top = pick(P.hi);
      slots.push({ x, w: bw, top });
      x += bw + gap[i] * k;
    }

    // ציון הדרך נכנס לפער הרחב ביותר שנמצא בתוך המסגרת הנראית — לא בקצה,
    // שם הוא נחתך, ולא מתחת לבניין, שם הוא נבלע.
    let lmX = 195, bestGap = -1;
    for (let i = 1; i < slots.length; i++) {
      const g0 = slots[i - 1].x + slots[i - 1].w, g1 = slots[i].x, mid = (g0 + g1) / 2;
      if (mid < 92 || mid > 298) continue;
      const score = (g1 - g0) * (1 - Math.abs(mid - 195) / 260);
      if (score > bestGap) { bestGap = score; lmX = mid; }
    }

    // שלוש שורות עומק, לא שתיים: רחוקה ושטוחה, אמצעית עם כמה חלונות
    // עמומים, וקדמית מלאה. שתי שורות נראו כמו קיר; שלוש נראות כמו רחוב.
    let back = '<g fill="var(--land)" opacity=".5">';
    for (let i = 0; i < 7; i++) {
      const bx = -20 + i * 62 + R() * 26, bw = 30 + R() * 30, by = 48 + R() * 12;
      back += `<path d="M${bx.toFixed(1)},74 L${bx.toFixed(1)},${by.toFixed(1)} ` +
              `L${(bx + bw).toFixed(1)},${by.toFixed(1)} L${(bx + bw).toFixed(1)},74 Z"/>`;
    }
    back += '</g><g fill="var(--land)" opacity=".8">';
    let midLit = '';
    for (let i = 0; i < 6; i++) {
      const bx = -34 + i * 74 + R() * 34, bw = 34 + R() * 34, by = 40 + R() * 14;
      back += `<path d="M${bx.toFixed(1)},74 L${bx.toFixed(1)},${by.toFixed(1)} ` +
              `L${(bx + bw).toFixed(1)},${by.toFixed(1)} L${(bx + bw).toFixed(1)},74 Z"/>`;
      if (P.flat) midLit += grid(bx, by, bw, 74 - by, R);
    }
    back += `</g><g opacity=".28">${midLit}</g>`;

    let body = '', lights = '', extra = '';
    const perch = [];
    let smoked = 0;
    const litX = [], front = [], back2 = [];
    slots.forEach((s, i) => {
      const cx = s.x + s.w / 2;
      if (P.gassho) {
        body += `<path d="M${s.x.toFixed(1)},74 L${cx.toFixed(1)},${s.top.toFixed(1)} ` +
                `L${(s.x + s.w).toFixed(1)},74 Z"/>`;
        lights += `<rect x="${(cx - 4).toFixed(1)}" y="${(s.top + 22).toFixed(1)}" width="8" height="9" rx="1.2" fill="var(--lit)"/>`;
        // קורות הרוחב של גג הגאשו — הקווים שמסמנים שהוא קש ולא משולש
        extra += `<g stroke="var(--wire)" stroke-width="1" opacity=".32" fill="none">` +
                 `<path d="M${(cx - s.w * .22).toFixed(1)},${(s.top + (74 - s.top) * .45).toFixed(1)} ` +
                 `L${(cx + s.w * .22).toFixed(1)},${(s.top + (74 - s.top) * .45).toFixed(1)}"/>` +
                 `<path d="M${(cx - s.w * .34).toFixed(1)},${(s.top + (74 - s.top) * .68).toFixed(1)} ` +
                 `L${(cx + s.w * .34).toFixed(1)},${(s.top + (74 - s.top) * .68).toFixed(1)}"/></g>`;
      } else if (P.flat) {
        body += `<path d="M${s.x.toFixed(1)},74 L${s.x.toFixed(1)},${s.top.toFixed(1)} ` +
                `L${(s.x + s.w).toFixed(1)},${s.top.toFixed(1)} L${(s.x + s.w).toFixed(1)},74 Z"/>`;
        lights += grid(s.x, s.top, s.w, 74 - s.top, R);
        if (R() < P.tank) front.push({ p: 'tank', x: cx, y: s.top + 2 });
        // מעקה גג ואנטנה — הצללית של גג עירוני, לא קו ישר
        else if (R() < .45) extra += `<rect x="${(s.x + 1).toFixed(1)}" y="${(s.top - 2).toFixed(1)}" ` +
          `width="${(s.w - 2).toFixed(1)}" height="2" fill="var(--roof)"/>`;
        if (R() < .3) extra += `<g stroke="var(--wire)" stroke-width=".8" opacity=".6" fill="none">` +
          `<path d="M${(cx + 6).toFixed(1)},${s.top.toFixed(1)} L${(cx + 6).toFixed(1)},${(s.top - 9).toFixed(1)}"/>` +
          `<path d="M${(cx + 3).toFixed(1)},${(s.top - 6).toFixed(1)} L${(cx + 9).toFixed(1)},${(s.top - 6).toFixed(1)}"/></g>`;
      } else {
        const wallTop = s.top + 12, half = s.w / 2 - 2;
        body += `<path d="M${(s.x + 3).toFixed(1)},74 L${(s.x + 3).toFixed(1)},${wallTop.toFixed(1)} ` +
                `L${(s.x + s.w - 3).toFixed(1)},${wallTop.toFixed(1)} L${(s.x + s.w - 3).toFixed(1)},74 Z"/>` +
                tileRoof2(cx, s.top, half, 12) + ridgeEnds(cx, s.top, half);
        lights += `<rect x="${(cx - 9).toFixed(1)}" y="${(wallTop + 5).toFixed(1)}" width="8" height="9" rx="1.2" fill="var(--lit)"/>` +
                  `<rect x="${(cx + 1).toFixed(1)}" y="${(wallTop + 5).toFixed(1)}" width="8" height="9" rx="1.2" fill="var(--lit)"/>`;
        // מרזב: קו דק לאורך שולי הגג, ואז מוריד בפינה
        extra += `<g stroke="var(--land)" stroke-width=".7" opacity=".45" fill="none">` +
                 `<path d="M${(cx - half - 3).toFixed(1)},${(s.top + 12.8).toFixed(1)} ` +
                 `L${(cx + half + 3).toFixed(1)},${(s.top + 12.8).toFixed(1)}"/>` +
                 `<path d="M${(cx + half + 1).toFixed(1)},${(s.top + 12.8).toFixed(1)} ` +
                 `L${(cx + half + 1).toFixed(1)},74"/></g>`;
      }
      // ארובה מעשנת — על בית אחד בלבד, לא על כולם
      if (P.smoke && !smoked && cx > 60 && cx < 320 && R() < .5) {
        // לא על הרכס: שם יושבת החתולה. מעט הצידה, על המדרון.
        const dx = s.w * .17, ry = s.top + (P.gassho ? (74 - s.top) * .34 : 4);
        extra += chimneyStack(cx + dx, ry);
        front.push({ p: 'smoke', x: cx + dx + 2.5, y: ry - 9 });
        smoked = 1;
      }
      // מועמד למושב: גג שלא נחתך בקצה ולא מתחת לציון הדרך
      if (cx > 56 && cx < 322 && Math.abs(cx - lmX) > 34) perch.push({ x: cx, y: s.top });
      litX.push(cx);
    });
    if (P.smoke && !smoked && slots.length) {
      const s = slots[Math.floor(slots.length / 2)];
      const cy = s.top + (74 - s.top) * .34, cxx = s.x + s.w * .67;
      extra += chimneyStack(cxx, cy);
      front.push({ p: 'smoke', x: cxx + 2.5, y: cy - 9 });
    }

    for (let i = 0; i < P.pole; i++)
      front.push({ p: 'pole', x: R() < .5 ? 24 + R() * 40 : 326 + R() * 40,
                   h: PROP.pole.h * (.85 + R() * .3), flip: R() < .5 });
    // שלטים נתלים על חזיתות. קודם הם ריחפו באמצע האוויר.
    let signs = P.sign || 0;
    for (const s of slots.slice().sort(() => R() - .5)) {
      if (!signs) break;
      const cx = s.x + s.w / 2, tall = 74 - s.top;
      if (s.w < 22 || tall < 26 || cx < 20 || cx > 370 || Math.abs(cx - lmX) < 26) continue;
      const sx = R() < .5 ? s.x + 2.4 : s.x + s.w - 9.8;
      extra += signAt(sx, s.top + 4 + R() * 5, Math.min(30, tall * .52), R);
      signs--;
    }
    // עצים נכנסים לפערים שבין הבניינים, ונצבעים לפני הבניינים כדי שגג
    // יסתיר עץ ולא להפך. קודם הם נחתו על הגגות ונראו כמו מדבקות.
    const gaps = [];
    for (let i = 1; i < slots.length; i++) {
      const g0 = slots[i - 1].x + slots[i - 1].w, g1 = slots[i].x;
      if (g1 - g0 > 6) gaps.push({ x: (g0 + g1) / 2, w: g1 - g0 });
    }
    gaps.sort((a, b) => b.w - a.w);
    for (let i = 0; i < P.tree; i++) {
      const g = gaps[i % Math.max(1, gaps.length)];
      const tx = g && Math.abs(g.x - lmX) > 26 ? g.x : 14 + R() * 362;
      const k = R() < .5 ? 'pine' : 'maple';
      back2.push({ p: k, x: tx, h: PROP[k].h * (.72 + R() * .5), flip: R() < .5 });
    }

    // קומת הרחוב — שלושה עצמים, פרוסים על שליש־שליש־שליש
    let shop = '';
    (STREET[kind] || STREET.village).forEach((k, i) => {
      const x = 34 + i * 112 + R() * 54;
      if (k === 'noren') shop += `<path fill="var(--roof)" d="M${x - 13},96 L${x - 13},74 ` +
        `L${x + 13},74 L${x + 13},96 Z"/><path fill="var(--tile)" d="M${x - 15},75 L${x + 15},75 ` +
        `L${x + 15},71.5 L${x - 15},71.5 Z"/>`;
      front.push({ p: k, x, flip: R() < .4 });
    });

    // שלושה מושבים, מפוזרים: שמאל, אמצע, ימין
    perch.sort((a, b) => a.x - b.x);
    const seat = i => perch.length ? perch[Math.min(perch.length - 1, Math.round(i * (perch.length - 1)))] : { x: 195, y: 40 };
    const seats = [seat(.68), seat(.2), seat(.95)];

    const fill = P.gassho || !P.flat ? 'var(--tile)' : 'var(--roof)';
    return {
      svg: `${GROUND}${back}` +
           `<g fill="${fill}" class="plate">${body}</g>` +
           `<g class="lm-fallback">${LM[P.lm](lmX)}</g>` +
           `<g opacity=".9">${lights}</g>${P.canal ? canalAt(R, litX) : ROAD}${shop}${extra}`,
      seats, front, back: back2,
      lm: { kind: P.lm, x: lmX }
    };
  }

  // איזה נוף. נגזר מבלוק הלינה של היום — הוא השדה הנקי היחיד שאומר איפה אתם.
  let SCENE = null;
  function villageSVG() {
    const st = (T.days && T.days[dayIndex()] || {}).st || '';
    const kind = /טוקיו/.test(st) ? 'tokyo' : /אוסקה/.test(st) ? 'osaka'
               : /קיוטו/.test(st) ? 'kyoto' : /נגויה/.test(st) ? 'nagoya'
               : /אלפים|קויאסאן/.test(st) ? 'mountain' : 'village';
    SCENE = buildScene(kind, dayIndex() + 1);
    return `<svg class="l-village" data-kind="${kind}" viewBox="0 0 390 104"
      preserveAspectRatio="none" style="height:104px">${SCENE.svg}</svg>`;
  }

  // ---- הרכס הרחוק ----
  // היה קבוע לנצח (seed="7" ושני נתיבים כתובים ביד). עכשיו הוא נגזר מאותו
  // זרע יומי כמו הכפר, כולל זרע הרעש — כך שגם קו הרקיע משתנה מיום ליום.
  function farSVG() {
    const d = dayIndex() + 1, R1 = rng(d * 31 + 5), R2 = rng(d * 97 + 11);
    return `<svg class="l-far" viewBox="0 0 390 150" preserveAspectRatio="none" style="height:150px">
      <defs>
        <filter id="pt" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.03" numOctaves="4"
            seed="${(d * 13) % 89}" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="13"/><feGaussianBlur stdDeviation="1.6"/></filter>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--ridge)" stop-opacity=".45"/>
          <stop offset="100%" stop-color="var(--ridge)" stop-opacity="0"/></linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--ridge2)" stop-opacity=".8"/>
          <stop offset="100%" stop-color="var(--ridge2)" stop-opacity="0"/></linearGradient>
      </defs>
      <path filter="url(#pt)" fill="url(#g1)" d="${ridgePath(R1, 64, 52, 7 + 2 * Math.floor(R1() * 2))}"/>
      <path filter="url(#pt)" fill="url(#g2)" d="${ridgePath(R2, 100, 58, 5 + 2 * Math.floor(R2() * 2))}"/>
    </svg>`;
  }

  // ---- שכבות הנכסים ----
  // תמונה לא נכנסת ל-.l-village: שם preserveAspectRatio="none" מותח הכל
  // ×1.144 לרוחב, ונתיב SVG לא אכפת לו אבל תמונה מתעוותת. לכן שתי שכבות
  // div משלהן — אחת מאחורי הבניינים (עצים) ואחת לפניהם (רחוב, ציון דרך) —
  // באותו עומק פארלקס ובאותה המרת קואורדינטות של .l-chars:
  //     left = x / 3.9 %   ·   bottom = 74 − y
  const atXY = (x, y) => `left:${(x / 3.9).toFixed(1)}%;bottom:${(74 - y).toFixed(1)}px`;

  function propTag(o) {
    const c = PROP[o.p];
    if (!c) return '';
    const h = o.h || c.h, y = o.y != null ? o.y : c.y;
    return `<img src="assets/${c.f}.webp" alt="" decoding="async" class="${o.p === 'smoke' ? 'puff' : ''}"
      style="${atXY(o.x, y)};height:${h.toFixed(1)}px${o.flip ? ';--fx:-1' : ''}"
      onload="this.classList.add('on')">`;
  }

  function propLayer(cls, list) {
    return `<div class="${cls}">${(list || []).map(propTag).join('')}</div>`;
  }

  function lmLayer() {
    const lm = SCENE && SCENE.lm;
    let s = '';
    if (lm && LM_IMG[lm.kind]) {
      const c = LM_IMG[lm.kind];
      s = `<img src="${lmFile(lm.kind)}" alt="" decoding="async"
        style="${atXY(lm.x, 74 - c.base)};height:${c.h}px" onload="this.classList.add('on')">`;
    }
    return `<div class="l-art">${s}${((SCENE && SCENE.front) || []).map(propTag).join('')}</div>`;
  }

  // עצים מאחורי הבניינים: גג מסתיר עץ ולא להפך
  function backLayer() { return propLayer('l-back', (SCENE && SCENE.back) || []); }

  // ---- ציור הסצנה ----
  function scene(host) {
    const r = document.documentElement.style;
    document.body.classList.toggle('is-day', theme === 'day');
    const mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.content = theme === 'day' ? '#f3ece0' : '#0b0e14';
    // הסדר כאן קריטי: villageSVG() הוא שקובע את SCENE, וכל השכבות
    // האחרות נשענות עליו. בתבנית אחת הן היו נקראות משמאל לימין
    // ו-backLayer() היה מקבל את הסצנה של הרינדור הקודם.
    const village = villageSVG();
    host.innerHTML = `<div class="art"></div>${skyLayer()}<div class="fx" id="fx"></div>
      ${farSVG()}
      ${backLayer()}${village}
      ${lmLayer()}
      ${charLayer('')}<div class="haze" id="haze"></div><div class="hem"></div>`;
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
    if (forced) { particles(fx, pmF(forced)); decorate(forced); showWx(forced, null, true); return; }
    // decorate מקבל את המצב האמיתי (הוא מכוון שמש/ערפל), אבל החלקיקים
    // מתרגמים "בהיר" לשלכת: clear היה n:0, כלומר שום דבר לא נפל ביום בהיר
    // באוקטובר — בדיוק העונה שבשבילה נוסעים.
    particles(fx, 'leaves'); decorate('clear');         // ברירת מחדל מיידית
    weather(phase, (m, rec) => { particles(fx, pmF(m)); decorate(m); showWx(m, rec, false); });
  }

  return { T, q, theme, esc, DOW, dated, dayIndex, beforeTrip, factsFor, rich, dl, hello, wireWho, who, cloudSVG, boot, today0, firstDay, particles, decorate, reveal };
})();
