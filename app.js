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
  // יום קויאסאן הוא היחיד מ-45 שכותרתו לא נפתחת בתאריך, והוא חצי השני
  // של 4.11. בלי התאריך הזה כל מי שקורא ‎dated[idx].date קיבל null וקרס.
  dated.forEach((x, i) => { if (!x.date && i) x.date = dated[i - 1].date; });
  const firstDay = (dated.find(x => x.date) || {}).date;

  function dayIndex() {
    // ‎?d=abc נתן NaN, ומשם T.days[NaN] ומסך לבן. קישור שבור לא מפיל מסך.
    const n = parseInt(q.get('d'), 10);
    if (Number.isFinite(n)) return Math.max(0, Math.min(T.days.length - 1, n));
    const hit = dated.find(x => x.date && x.date.getTime() === today0.getTime());
    if (hit) return hit.i;
    return today0 < firstDay ? 0 : T.days.length - 1;
  }
  const beforeTrip = firstDay && today0 < firstDay;
  // אחרי 25.11 המסך נתקע לנצח על היום האחרון, ובלי לדעת את זה כל מסך
  // ממשיך לדבר בלשון הווה על טיול שנגמר.
  const lastDay = (dated.slice().reverse().find(x => x.date) || {}).date;
  const afterTrip = !!(lastDay && today0 > lastDay);

  // ---- ערכה ----
  const theme = q.get('theme') || (now.getHours() >= 6 && now.getHours() < 17 ? 'day' : 'night');

  // ---- טקסט כל ההחלטות, כמקור לכתובות/טלפונים/דדליינים ----
  const allItems = (T.decisions || []).flatMap(g => g.items || []);
  const corpus = allItems.map(i => esc(i.q)).join('\n');

  // טקסט המחבר מכיל <b> ו-<br> בכוונה. בורחים מהכל ואז מחזירים רק את השניים
  // האלה — כך שסימן קטן יותר בתוכן לא יכול להפוך לתגית.
  function rich(s) {
    return foreign(esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/&lt;br\s*\/?&gt;/g, '<br>'));
  }

  // ===== שמות בכתב זר =====
  // רק 21% מהשדות מכילים כתב לא-עברי, וכמעט כולם שמות פרטיים: ערים,
  // תחנות, מלונות, קווי רכבת. אין כאן מה לתרגם — הבעיה היא טיפוגרפית.
  // "טוקיו (Tokyo · 東京)" מכריח את העין לשלוש החלפות כיוון בשורה אחת.
  // הפתרון הוא לא כפתור שפה אלא הנמכה: השם נשאר (צריך אותו מול שילוט
  // ומול נהג), אבל קטן, עמום, ובגופן שלו — כך שאפשר לדלג עליו.
  // מעבר אחד בלבד: שני מעברים נפרדים הביאו לכך שהסריקה הלטינית נכנסה
  // לתוך התגית שהסריקה היפנית בדיוק הוסיפה.
  // הסדר חשוב: קודם סוגריים שכל תוכנם זר, כדי שאפשר יהיה להסתיר את כל
  // ה-"(Senseki Line 仙石線)" כיחידה ולא להשאיר סוגריים ריקים.
  const HEB = /[\u0590-\u05FF]/;
  const FOREIGN = new RegExp(
    '(&[a-z]+;|<[^>]*>)' +                                    // 1 — לא נוגעים
    '|\\(([^()]{2,60})\\)' +                                    // 2 — סוגריים
    '|([\u3040-\u30ff\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+)' +   // 3 — יפנית
    '|([A-Za-z][A-Za-z0-9\'\u2019\\-.]*(?:[ \u00a0][A-Za-z][A-Za-z0-9\'\u2019\\-.]*)*)', // 4
    'g');

  function foreign(safe) {
    return String(safe).replace(FOREIGN, (m, keep, par, jp, lat) => {
      if (keep) return m;
      if (par !== undefined) {
        // סוגריים שיש בהם עברית הם הערה בעברית — לא נוגעים
        return HEB.test(par) || !/[A-Za-z\u3040-\u9fff]/.test(par)
          ? m : `<i class="f-par">(${foreign(par)})</i>`;
      }
      return jp ? `<i class="f-jp">${jp}</i>` : `<i class="f-lat">${lat}</i>`;
    });
  }

  // esc לתוכן אלמנט: בורח, ואז מנמיך את השמות בכתב זר. לא לשימוש
  // בתוך תכונת HTML — שם צריך esc נקי, אחרת התגית נשברת.
  const txt = s => foreign(esc(s));

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
      // ‎[0-9.]+ בלע גם נקודת סוף משפט, ו-"19.10." לא עבר את dl() — שני
      // דדליינים לביטול חינם פשוט לא הופיעו בשום מקום.
      free:  (line.match(/(?:ביטול )?חינם עד ([0-9]{1,2}\.[0-9]{1,2})/) || [])[1] || ''
    };
  }

  // ===== מי מחזיק את הטלפון =====
  // שניכם פותחים את אותה כתובת ואין התחברות, אז אין דרך לדעת מי זה —
  // חוץ מלשאול פעם אחת ולזכור במכשיר. מדלגים? פשוט לא פונים בשם.
  // מתג השמות המקומיים. ברירת המחדל דולקת — ביפן צריך את 松島海岸駅 מול
  // השילוט. בתכנון מהבית זה רק רעש, ואז מכבים.
  const NAMES_KEY = 'nipon26_names';
  function namesOn() {
    try { return localStorage.getItem(NAMES_KEY) !== '0'; } catch (e) { return true; }
  }
  function setNames(on) {
    try { localStorage.setItem(NAMES_KEY, on ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('names-off', !on);
  }

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
  // איפה אתם היום. ‎st הוא השדה הנקי ("אוסקה · 5–11.11 ✅" → "אוסקה") —
  // אותו שדה ש-dayPhase ו-dish ממופים לפיו. כותרת היום לבדה לא מספיקה:
  // ב-9.11 היא אומרת "טבע במינו", שאינו שם של סיכה במפה.
  function whereToday() {
    const d = (T.days || [])[dayIndex()] || {};
    const out = [String(d.st || '').split('·')[0].trim()];
    const rest = String(d.t).split('—').slice(1).join('—').trim();
    let c = rest.split('(')[0].replace(/\s*·.*$/, '').trim();
    if (c.includes('→')) c = c.split('→').pop().trim();
    out.push(c);
    return out.filter(Boolean);
  }
  function coordsFor(phase) {
    const pts = (T.mapPoints || []).filter(x => x.ph === phase && x.lat);
    // הסיכה הראשונה בשלב היא לא בהכרח המקום שבו אתם. באוסקה ב-7.11
    // השורה העליונה הראתה "נגויה" — הסיכה הראשונה של שלב 2, 140 ק"מ משם.
    // זה לא היה שקר (שם המקום הופיע), אבל זה היה מזג אוויר של עיר אחרת.
    const all = T.mapPoints || [];
    let p = null;
    for (const w of whereToday()) {
      p = pts.find(x => String(x.n).includes(w)) || all.find(x => x.lat && String(x.n).includes(w));
      if (p) break;
    }
    p = p || pts[0] || all[0];
    // השם ב-mapPoints הוא "טוקיו (Tokyo · 東京)" או "יודאנקה · קופי ג'יגוקודאי".
    // לשורה צרה צריך רק את החלק הראשון בעברית.
    const nm = String(p && p.n || '').replace(/\s*[(（].*$/, '').split(/\s*[·\/]\s*/)[0].trim();
    return p ? { lat: p.lat, lng: p.lng, n: nm } : null;
  }
  function weather(phase, cb) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(WKEY) || 'null'); } catch (e) {}
    const c = coordsFor(phase);
    // המטמון תקף לשעה — אבל רק לאותו מקום. ביום מעבר בין ערים, מטמון
    // של העיר הקודמת היה נשאר על המסך עד שעה אחרי שעברתם.
    if (cached && Date.now() - cached.at < 36e5 && (!c || cached.place === c.n))
      return cb(cached.mode, cached);
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

  // ===== שער המטבע =====
  // השער ב-‎data.js הוא עוגן: התקציב מחושב לפיו, ‎check.js מאמת אותו, והוא
  // לא זז מעצמו. אבל מחשבון הכיס רוצה את השער של היום, ולכן הוא נמשך פעם
  // ביום — באותה הזדמנות שבה נבדק מזג האוויר, כי זו ממילא הבקשה היחידה
  // שהאפליקציה עושה החוצה.
  //
  // שתי הגנות, כי שער שגוי גרוע משער ישן: התשובה נבדקת מול טווח שפוי
  // לפני שהיא נכנסת, ואם משהו נכשל נשארים על העוגן. אף פעם לא על מספר
  // מומצא — אותו כלל כמו בשורת מזג האוויר.
  const FKEY = 'nipon26_fx';
  const FX0 = (T.budget && T.budget.fx) || {};
  const sane = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v > lo && v < hi;
  let fxWait = null;   // ‎boot ומסך הכלים שואלים שניהם — בקשה אחת, שני עונים
  function fxRate(cb) {
    const anchor = { jpy: FX0.jpy, usd: FX0.usd, asOf: FX0.asOf || '', live: false };
    let c = null;
    try { c = JSON.parse(localStorage.getItem(FKEY) || 'null'); } catch (e) {}
    if (c && Date.now() - c.at < 72e6) return cb(c);        // 20 שעות — לפחות פעם ביום
    if (!navigator.onLine) return cb(c || anchor);
    if (fxWait) { fxWait.push(cb); return; }
    fxWait = [cb];
    const done = rec => { const q = fxWait; fxWait = null; q.forEach(f => f(rec)); };
    // ILS כבסיס ולא JPY: קריאה אחת מחזירה את שני השערים שהאפליקציה
    // מכירה, וההיפוך נותן "כמה שקלים שווה ין אחד" — היחידה של data.js.
    fetch('https://api.frankfurter.app/latest?from=ILS&to=JPY,USD')
      .then(r => r.json())
      .then(j => {
        const r = (j && j.rates) || {};
        const jpy = 1 / r.JPY, usd = 1 / r.USD;
        if (!sane(jpy, .008, .05) || !sane(usd, 2, 6)) throw 0;
        const rec = { jpy, usd, asOf: j.date || '', at: Date.now(), live: true };
        try { localStorage.setItem(FKEY, JSON.stringify(rec)); } catch (e) {}
        done(rec);
      })
      .catch(() => done(c || anchor));
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
    leaves: { n: 9,  cls: 'leaf',  min: 9,  max: 15, dur: [11, 19] },
    rain:   { n: 54, cls: 'drop',  min: 1.6, max: 2.9, dur: [0.6, 1.1] },
    snow:   { n: 26, cls: 'snow',  min: 3,  max: 6,  dur: [7, 14] },
    mist:   { n: 0 }, clear: { n: 0 }
  };
  // 紅葉 momiji — חמישה אונות וגבעול. מה שהיה כאן קודם הוא כוכב בן שמונה
  // קצוות, ולכן "שלכת" נקראה כניצוצות כתומים ולא כעלים נופלים.
  function particles(host, mode) {
    const cfg = PARTICLE[mode] || PARTICLE.leaves;
    host.innerHTML = '';
    if (!cfg.n) return;
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < cfg.n; i++) {
      const el = document.createElement('i');
      const size = rnd(cfg.min, cfg.max), dur = rnd(cfg.dur[0], cfg.dur[1]);
      // השהיה שלילית מתחילה את האנימציה באמצע במקום לחכות לה: אחרת
      // השמיים ריקים עד 19 שניות אחרי הטעינה, וזו בדיוק השנייה שבה
      // מסתכלים על המסך.
      const off = -rnd(0, dur).toFixed(1);
      if (mode === 'leaves') {
        // חמישה עלים אמיתיים במקום נתיב אחד עם fill מתחלף. בלילה הם
        // מוכהים בפילטר ולא בפלטת צבעים שנייה — עלה מואר כמו ביום מול
        // שמי לילה קורא כמדבקה.
        //
        // התנועה מורכבת משלושה דברים כמו בקנבס של האתר: סחיפה קבועה
        // הצידה (הרוח), נדנוד סביבה, וסיבוב עצמי. כל אחד על שכבה משלו
        // כי כולם כותבים ‎transform.
        el.style.cssText = `position:absolute;right:${rnd(-2, 100)}%;--po:1;
          --k:${rnd(.12, .42).toFixed(2)};
          animation:fall ${dur}s linear ${off}s infinite`;
        const sw = document.createElement('span');
        sw.style.cssText = `display:block;--sw:${rnd(4, 11).toFixed(1)}px;
          animation:leaf-sway ${rnd(1.8, 3.4).toFixed(2)}s ease-in-out ${-rnd(0, 3).toFixed(2)}s infinite alternate`;
        const img = document.createElement('img');
        img.src = `assets/sky/leaf-${1 + (i % 5)}.webp`;
        img.alt = '';
        img.decoding = 'async';
        img.style.cssText = `display:block;width:${size}px;height:auto;
          --spin:${i % 2 ? '' : '-'}360deg;
          opacity:${theme === 'night' ? .62 : .82};
          filter:${theme === 'night' ? 'brightness(.52) saturate(.8)' : 'none'};
          animation:leaf-spin ${rnd(3.5, 8).toFixed(2)}s linear ${off}s infinite`;
        sw.appendChild(img);
        el.appendChild(sw);
      } else if (mode === 'rain') {
        // הטיפות היו ברוחב 1.5px ובגרדיאנט בהיר, ועל שמי יום חיוורים הן
        // פשוט לא נראו. עכשיו עבות יותר, ארוכות יותר, ובצבע שמתהפך עם
        // הערכה: כהה על שמיים בהירים, בהיר על שמי לילה.
        const wet = theme === 'night'
          ? 'rgba(198,222,238,.78)' : 'rgba(74,104,128,.62)';
        el.style.cssText = `position:absolute;width:${size}px;height:${rnd(20, 38)}px;right:${rnd(-4, 102)}%;
          background:linear-gradient(transparent,${wet});border-radius:2px;
          animation:drop ${dur}s linear ${off}s infinite`;
      } else {
        // גם השלג נסחף, רק פחות — פתית כבד מעלה ולא מתהפך ברוח.
        el.style.cssText = `position:absolute;width:${size}px;height:${size}px;right:${rnd(-2, 100)}%;
          background:rgba(255,255,255,.8);border-radius:50%;
          --k:${rnd(.05, .15).toFixed(2)};
          animation:fall ${dur}s linear ${off}s infinite`;
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
                 ['.l-village', 0.42], ['.l-house', 0.42], ['.l-art', 0.42], ['.l-chars', 0.42]];

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
    // גם השמיים נגזרים מהזרע היומי: הגוף נודד קצת, העננים בגבהים אחרים,
    // הציפורים עוברות צד. אותו יום תמיד נראה אותו דבר, יום אחר לא.
    const R = rng(dayIndex() * 17 + 3);
    const orbX = 8 + R() * 16, orbY = 5 + R() * 8;
    const cloud = (cls, top, w, dly) =>
      `<img class="drift ${cls}" src="assets/sky/clouds-${theme === 'day' ? 'day' : 'night'}.webp"
        alt="" decoding="async" style="top:${top.toFixed(0)}%;width:${w.toFixed(0)}%;animation-delay:-${dly}s"
        onload="this.classList.add('on')">`;
    const clouds = cloud('c1', 8 + R() * 10, 46 + R() * 22, (R() * 40).toFixed(0)) +
                   cloud('c2', 22 + R() * 14, 34 + R() * 20, (14 + R() * 40).toFixed(0));

    if (theme === 'night') {
      const stars = STARS.map(([x, y], i) =>
        `<i class="star" style="left:${x}%;top:${y}%;animation-delay:${(i % 7) * .7}s"></i>`).join('');
      return `<div class="l-sky">${stars}${clouds}
        <img class="orb moon" src="assets/sky/moon.webp" alt="" decoding="async"
          style="left:${orbX.toFixed(0)}%;top:${orbY.toFixed(0)}%" onload="this.classList.add('on')">
        ${A.moon ? `<div class="orb orb-fallback" style="left:${orbX.toFixed(0)}%;top:${orbY.toFixed(0)}%">${A.moon(54)}</div>` : ''}
        </div>`;
    }
    const bx = R() < .5 ? 58 + R() * 18 : 12 + R() * 16;
    return `<div class="l-sky">${clouds}
      <img class="orb sun" src="assets/sky/sun.webp" alt="" decoding="async"
        style="left:${orbX.toFixed(0)}%;top:${orbY.toFixed(0)}%" onload="this.classList.add('on')">
      ${A.sun ? `<div class="orb orb-fallback" style="left:${orbX.toFixed(0)}%;top:${orbY.toFixed(0)}%">${A.sun(62)}</div>` : ''}
      <img class="flock" src="assets/sky/birds.webp" alt="" decoding="async"
        style="left:${bx.toFixed(0)}%;top:${(16 + R() * 10).toFixed(0)}%" onload="this.classList.add('on')">
      </div>`;
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
    // הציור הווקטורי נשאר כגיבוי מתחת לתמונה, כמו בכל שאר הנכסים.
    // ההבדל היחיד: תמונה לא משנה צבע בין ערכות, ולכן בלילה מוכהית
    // בפילטר — חתולה מוארת כמו ביום מול סצנת לילה קוראת כמדבקה.
    // גובה ולא רוחב: התמונות של החתולות היושבות הן פורטרט (יחס .62),
    // וברוחב 30 הן יצאו 48 גבוהות — כפול מהווקטור, ותמרו מעל הבתים.
    const catImg = (file, h) =>
      `<img class="cat-img" src="assets/cats/${file}.webp" alt="" decoding="async"
        style="height:${ak(h)}px" onload="this.classList.add('on')">`;
    const morgana = catImg(wet ? 'cat-umbrella-morgana' : curl ? 'cat-sleep' : 'morgana-sit',
                           wet ? 40 : curl ? 21 : 31) +
      `<span class="cat-fallback">${A.cat({ coat: 'var(--cat1)', eye: 'var(--catEye)',
        pose: curl ? 'curl' : 'sit', w: curl ? 34 : 27, delay: 0 })}</span>`;
    const baltrkis = catImg(wet ? 'cat-umbrella-bellatrix' : curl ? 'cat-sleep' : 'bellatrix-sit',
                            wet ? 37 : curl ? 19 : 29) +
      `<span class="cat-fallback">${A.cat({ coat: 'var(--cat2)', eye: 'var(--catEye2)',
        pose: curl ? 'curl' : 'sit', w: curl ? 31 : 25, delay: 2.3 })}</span>`;

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
    // 3px פנימה אל תוך הגג. חתולה שבסיסה מונח בדיוק על קודקוד הרכס
    // נראית מרחפת מעליו; מעט שקיעה קוראת כישיבה.
    const at = s => `left:${(s.x / 3.9).toFixed(1)}%;bottom:${ak(74 - s.y)}px`;
    h += `<div class="ch" style="${at(st[0])}">
      ${morgana}
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
  const STREET = { tokyo: ['vending', 'vending', 'vending'], osaka: ['vending', 'vending', 'vending'],
                   nagoya: ['vending', 'vending', 'toro'], kyoto: ['toro', 'toro', 'toro'],
                   village: ['toro', 'toro', 'toro'], mountain: ['toro', 'toro', 'toro'] };

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

  // ===== קנה המידה של הבלוק המצויר =====
  // כל הקואורדינטות הפנימיות של הסצנה נשארות כפי שהן (74 = קו הקרקע,
  // 104 = גובה ה-viewBox). מה שמשתנה הוא הגובה שבו הן מרונדרות. ה-SVG
  // הוא preserveAspectRatio="none", ולכן הוא נמתח לגובה בלי להתרחב —
  // בדיוק מה שצריך: הבתים היו רחבים 65px וגבוהים 30, שטוחים מדי.
  // הערך מוזרק כ---ak, כך שה-CSS וה-JS קוראים מאותו מקום.
  const AK = 1.42;
  const ak = v => +(v * AK).toFixed(1);

  // ---- הבתים ----
  // r = יחס רוחב/גובה מהקובץ. h = טווח הגובה ביחידות הסצנה. הרוחב תמיד
  // נגזר מהיחס, אחרת הבית מתעוות.
  const HOUSE = {
    'house-gassho-1':  { r: 1.08, h: [30, 40], sink: .30 },
    'house-gassho-2':  { r: 1.37, h: [28, 37], sink: .30 },
    'house-gassho-3':  { r: 1.38, h: [28, 37], sink: .30 },
    'house-machiya-1': { r: 0.97, h: [36, 48], sink: .14 },
    'house-machiya-2': { r: 1.35, h: [30, 40], sink: .16 },
    'house-machiya-3': { r: 1.06, h: [36, 48], sink: .14 },
    'tower-1':         { r: 0.53, h: [44, 66], sink: .03 },
    'tower-2':         { r: 0.39, h: [48, 72], sink: .03 },
    'tower-3':         { r: 1.11, h: [30, 42], sink: .04 }
  };
  const ROW = {
    tokyo:    ['tower-1', 'tower-2', 'tower-3'],
    osaka:    ['tower-2', 'tower-1', 'tower-3'],
    nagoya:   ['tower-3', 'tower-1', 'tower-2'],
    kyoto:    ['house-machiya-1', 'house-machiya-2', 'house-machiya-3'],
    village:  ['house-machiya-2', 'house-machiya-3', 'house-machiya-1'],
    mountain: ['house-gassho-1', 'house-gassho-2', 'house-gassho-3']
  };

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
    smoke:   { f: 'street/chimney-smoke',   h: 40, y: 0  },
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
    tokyo:  { f: 'tokyo-tower',   h: 94, base: 0, solo: 'day' },
    osaka:  { f: 'tsutenkaku',    h: 84, base: 0 },
    nagoya: { f: 'nagoya-castle', h: 62, base: 0 },
    kyoto:  { f: 'pagoda',        h: 76, base: 0 },
    torii:  { f: 'torii',         h: 46, base: 0 }
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
  // שורת הבתים כבר לא נבנית מצורות SVG אלא מתמונות. לכן אין יותר הגרלת
  // רוחב וגובה בנפרד: מגרילים גובה, והרוחב נגזר מהיחס של הקובץ. הבתים
  // נפרסים משמאל לימין עד שהשורה מלאה, עם חפיפה קלה שמשתנה — כך אף שתי
  // סצנות לא נראות זהות, וגם אין פערים ריקים.
  function buildScene(kind, seed) {
    const P = PROFILE[kind], R = rng(seed);
    const pick = ([a, b]) => a + R() * (b - a);
    const names = ROW[kind] || ROW.village;

    const houses = [], litX = [];
    let x = -14 - R() * 16;
    let guard = 0;
    while (x < 404 && guard++ < 40) {
      const nm = names[Math.floor(R() * names.length)], c = HOUSE[nm];
      const h = pick(c.h), w = h * c.r;
      houses.push({ f: nm, x: x + w / 2, y: 74, h, w, sink: c.sink, flip: R() < .35 });
      litX.push(x + w / 2);
      // חפיפה של 4%–16%: בלי חפיפה נפערים חורים, ובחפיפה קבועה זה נראה מסודר מדי
      x += w * (.84 + R() * .12);
    }

    // ציון הדרך נכנס לפער הרחב ביותר שנמצא בתוך המסגרת הנראית
    let lmX = 195, bestGap = -1;
    for (let i = 1; i < houses.length; i++) {
      const g0 = houses[i - 1].x + houses[i - 1].w / 2, g1 = houses[i].x - houses[i].w / 2;
      const mid = (g0 + g1) / 2;
      if (mid < 92 || mid > 298) continue;
      const score = (g1 - g0) * (1 - Math.abs(mid - 195) / 260);
      if (score > bestGap) { bestGap = score; lmX = mid; }
    }
    if (bestGap < 0) lmX = 120 + R() * 150;

    // שלוש שורות עומק: שתיים מאחור כצלליות שטוחות, והשורה הקדמית היא
    // התמונות. שתי שורות נראו כמו קיר; שלוש נראות כמו רחוב שנמשך פנימה.
    let back = '<g fill="var(--land)" opacity=".2">';
    for (let i = 0; i < 7; i++) {
      const bx = -20 + i * 62 + R() * 26, bw = 30 + R() * 30, by = 46 + R() * 12;
      back += `<path d="M${bx.toFixed(1)},74 L${bx.toFixed(1)},${by.toFixed(1)} ` +
              `L${(bx + bw).toFixed(1)},${by.toFixed(1)} L${(bx + bw).toFixed(1)},74 Z"/>`;
    }
    back += '</g><g fill="var(--land)" opacity=".3">';
    for (let i = 0; i < 6; i++) {
      const bx = -34 + i * 74 + R() * 34, bw = 34 + R() * 34, by = 38 + R() * 14;
      back += `<path d="M${bx.toFixed(1)},74 L${bx.toFixed(1)},${by.toFixed(1)} ` +
              `L${(bx + bw).toFixed(1)},${by.toFixed(1)} L${(bx + bw).toFixed(1)},74 Z"/>`;
    }
    back += '</g>';

    const front = [], back2 = [];

    // עמוד חשמל בקצה, מכל מים על גג
    for (let i = 0; i < P.pole; i++)
      front.push({ p: 'pole', x: R() < .5 ? 24 + R() * 40 : 326 + R() * 40,
                   h: PROP.pole.h * (.85 + R() * .3), flip: R() < .5 });


    // עשן מגג אחד. בגאשו העשן יוצא מהקש עצמו — אין ארובה, וזה נכון.
    if (P.smoke) {
      const mid = houses.filter(hs => hs.x > 60 && hs.x < 320);
      const hs = mid[Math.floor(R() * mid.length)] || houses[0];
      if (hs) front.push({ p: 'smoke', x: hs.x + hs.w * .2, y: 74 - hs.h + 4 });
    }

    // עצים בפערים, מאחורי הבתים
    const gaps = [];
    for (let i = 1; i < houses.length; i++) {
      const g0 = houses[i - 1].x + houses[i - 1].w / 2, g1 = houses[i].x - houses[i].w / 2;
      if (g1 - g0 > 6) gaps.push({ x: (g0 + g1) / 2, w: g1 - g0 });
    }
    gaps.sort((a, b) => b.w - a.w);
    for (let i = 0; i < P.tree; i++) {
      const g = gaps[i % Math.max(1, gaps.length)];
      const tx = g && Math.abs(g.x - lmX) > 26 ? g.x : 14 + R() * 362;
      const k = R() < .5 ? 'pine' : 'maple';
      back2.push({ p: k, x: tx, h: PROP[k].h * (.72 + R() * .5), flip: R() < .5 });
    }

    // קומת הרחוב
    let shop = '';
    (STREET[kind] || STREET.village).forEach((k, i) => {
      const sx = 34 + i * 112 + R() * 54;
      if (k === 'noren') shop += `<path fill="var(--roof)" d="M${sx - 13},96 L${sx - 13},74 ` +
        `L${sx + 13},74 L${sx + 13},96 Z"/><path fill="var(--tile)" d="M${sx - 15},75 L${sx + 15},75 ` +
        `L${sx + 15},71.5 L${sx - 15},71.5 Z"/>`;
      front.push({ p: k, x: sx, flip: R() < .4 });
    });

    // מושבי החתולות: גג של בית שלא נחתך בקצה ולא מתחת לציון הדרך
    const clear = hs => !houses.some(o => o !== hs && o.h > hs.h + 1 &&
      Math.abs(o.x - hs.x) < o.w / 2);
    const perch = houses
      .filter(hs => hs.x > 56 && hs.x < 322 && Math.abs(hs.x - lmX) > 34 && clear(hs))
      .map(hs => ({ x: hs.x, y: 74 - hs.h + hs.h * hs.sink }))
      .sort((a, b) => a.x - b.x);
    const seat = i => perch.length ? perch[Math.min(perch.length - 1, Math.round(i * (perch.length - 1)))] : { x: 195, y: 40 };

    return {
      svg: `${GROUND}${back}${P.canal ? canalAt(R, litX) : ROAD}${shop}`,
      seats: [seat(.68), seat(.2), seat(.95)],
      houses, front, back: back2,
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
      preserveAspectRatio="none" style="height:${ak(104)}px">${SCENE.svg}</svg>`;
  }

  // ---- שכבות הנכסים ----
  // תמונה לא נכנסת ל-.l-village: שם preserveAspectRatio="none" מותח הכל
  // ×1.144 לרוחב, ונתיב SVG לא אכפת לו אבל תמונה מתעוותת. לכן שתי שכבות
  // div משלהן — אחת מאחורי הבניינים (עצים) ואחת לפניהם (רחוב, ציון דרך) —
  // באותו עומק פארלקס ובאותה המרת קואורדינטות של .l-chars:
  //     left = x / 3.9 %   ·   bottom = 74 − y
  const atXY = (x, y) => `left:${(x / 3.9).toFixed(1)}%;bottom:${ak(74 - y)}px`;

  function propTag(o) {
    const c = PROP[o.p];
    if (!c) return '';
    const h = o.h || c.h, y = o.y != null ? o.y : c.y;
    return `<img src="assets/${c.f}.webp" alt="" decoding="async" class="${o.p === 'smoke' ? 'puff' : ''}"
      style="${atXY(o.x, y)};height:${ak(h)}px${o.flip ? ';--fx:-1' : ''}"
      onload="this.classList.add('on')">`;
  }

  function propLayer(cls, list) {
    return `<div class="${cls}">${(list || []).map(propTag).join('')}</div>`;
  }

  // שורת הבתים: שכבה משלה, מתחת לציון הדרך ולקומת הרחוב
  function houseLayer() {
    return `<div class="l-house">` + ((SCENE && SCENE.houses) || []).map(hs =>
      `<img src="assets/houses/${hs.f}.webp" alt="" decoding="async"
        style="${atXY(hs.x, hs.y)};height:${ak(hs.h)}px${hs.flip ? ';--fx:-1' : ''}"
        onload="this.classList.add('on')">`).join('') + `</div>`;
  }

  function lmLayer() {
    const lm = SCENE && SCENE.lm;
    let s = '';
    if (lm && LM_IMG[lm.kind]) {
      const c = LM_IMG[lm.kind];
      s = `<img src="${lmFile(lm.kind)}" alt="" decoding="async"
        style="${atXY(lm.x, 74 - c.base)};height:${ak(c.h)}px" onload="this.classList.add('on')">`;
    }
    return `<div class="l-art">${s}${((SCENE && SCENE.front) || []).map(propTag).join('')}</div>`;
  }

  // ---- הרכס הרחוק ----
  // שני עותקים של אותו קובץ, בגדלים ובהזזות שנגזרים מהזרע היומי: אותה
  // תמונה נראית כמו רכס אחר בכל יום, בלי לייצר 42 קבצים. הקרוב כהה
  // וגדול, הרחוק בהיר וקטן — פרספקטיבה אטמוספרית.
  function farSVG() {
    const d = dayIndex() + 1, R = rng(d * 31 + 5);
    const v = theme === 'day' ? 'day' : 'night';
    // קנה מידה לפי רוחב, וחייב לעבור את רוחב המסך: בקנה מידה לפי גובה
    // הרכס יצא צר מ-390px ונפער פס ריק בצד. רובו מוסתר מאחורי הכפר —
    // רק הפסגות מציצות מעליו, וזה בדיוק מה שרוצים מרכס רחוק.
    const lay = (cls, w, x, y, op) =>
      `<img class="ridge ${cls}" src="assets/special/ridges-${v}.webp" alt="" decoding="async"
        style="width:${w.toFixed(0)}%;left:${x.toFixed(0)}%;bottom:${y.toFixed(0)}px;--o:${op}"
        onload="this.classList.add('on')">`;
    return `<div class="l-far">
      ${lay('r-back', 190 + R() * 60, -62 + R() * 30, 34 + R() * 10, .28)}
      ${lay('r-front', 145 + R() * 40, -34 + R() * 24, 8 + R() * 8, .5)}
    </div>`;
  }

  // עצים מאחורי הבניינים: גג מסתיר עץ ולא להפך
  function backLayer() { return propLayer('l-back', (SCENE && SCENE.back) || []); }

  // ---- ציור הסצנה ----
  function scene(host) {
    const r = document.documentElement.style;
    host.style.setProperty('--ak', AK);
    document.body.classList.toggle('is-day', theme === 'day');
    const mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.content = theme === 'day' ? '#f3ece0' : '#0b0e14';
    // הסדר כאן קריטי: villageSVG() הוא שקובע את SCENE, וכל השכבות
    // האחרות נשענות עליו. בתבנית אחת הן היו נקראות משמאל לימין
    // ו-backLayer() היה מקבל את הסצנה של הרינדור הקודם.
    const village = villageSVG();
    host.innerHTML = `<div class="art"></div>${skyLayer()}<div class="fx" id="fx"></div>
      ${farSVG()}
      ${backLayer()}${village}${houseLayer()}
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

  // ===== סרגל קפיצה =====
  // "משימות" הוא 4,600 פיקסלים — שבעה מסכים בלי שום דרך לקפוץ, ורשימה
  // אחת בתוכו תופסת 3,300 מהם. הסרגל נבנה מכותרות ה-‎.lbl שכבר קיימות
  // במסך, כך שאין מה לתחזק: מי שמוסיף סעיף מקבל קפיצה אליו בחינם.
  // נבנה רק אם יש לפחות שלוש כותרות ושתי גלילות מסך של תוכן.
  function jumpBar(root) {
    const host = root || document.getElementById('main');
    if (!host) return;
    const labels = [...host.querySelectorAll(':scope > .lbl, :scope > div > .lbl')];
    if (labels.length < 3 || host.scrollHeight < innerHeight * 2) return;

    labels.forEach((l, i) => { if (!l.id) l.id = 'sec' + i; });
    const bar = document.createElement('nav');
    bar.className = 'jump';
    // כותרת ארוכה דוחפת את כל השאר מחוץ למסך — "ביטול חינם — מה שנסגר
    // קרוב" לבדה תפסה חצי סרגל. נקודת החיתוך היא המקף, ואם אין — 18 תווים.
    const cap = s => { const t = String(s).split(/\s[—–-]\s/)[0].trim();
      return t.length > 18 ? t.slice(0, 17).trim() + '…' : t; };
    bar.innerHTML = labels.map((l, i) =>
      `<button data-to="${l.id}">${esc(cap(l.firstChild ? l.firstChild.textContent : ('סעיף ' + (i + 1))))}</button>`
    ).join('');
    host.insertAdjacentElement('beforebegin', bar);

    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-to]');
      if (!b) return;
      const t = document.getElementById(b.dataset.to);
      if (!t) return;
      // הסרגל דביק ומכסה את הכותרת שאליה קופצים — מקזזים את גובהו
      const y = t.getBoundingClientRect().top + scrollY - bar.offsetHeight - 14;
      scrollTo({ top: Math.max(0, y), behavior: REDUCE ? 'auto' : 'smooth' });
    });

    // סימון הסעיף הנוכחי
    const btns = [...bar.querySelectorAll('[data-to]')];
    const mark = id => btns.forEach(b => b.classList.toggle('on', b.dataset.to === id));
    const io = new IntersectionObserver(es => {
      const vis = es.filter(x => x.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) mark(vis.target.id);
    }, { rootMargin: `-${bar.offsetHeight + 20}px 0px -62% 0px` });
    labels.forEach(l => io.observe(l));
    mark(labels[0].id);
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
    document.body.classList.toggle('names-off', !namesOn());
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
    fxRate(() => {});   // מחמם את המטמון בכל מסך, כדי שהמחשבון ייפתח עם השער של היום
  }

  return { T, q, theme, esc, txt, foreign, namesOn, setNames, jumpBar, fxRate, DOW, dated, dayIndex, beforeTrip, afterTrip, factsFor, rich, dl, hello, wireWho, who, cloudSVG, boot, today0, firstDay, particles, decorate, reveal };
})();
