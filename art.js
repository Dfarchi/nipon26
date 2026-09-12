/* NIPON26 — ספריית האיורים.
   הכל מקורי ומצויר ביד: אין כאן דמויות מוגנות, רק צלליות וחיות משלנו.
   כל צורה מקבלת צבע ממשתני ה-CSS, כדי ששתי הערכות (יום/לילה) יזוזו יחד איתה.
   ההפרדה מ-app.js מכוונת: כאן רק ציור, בלי לוגיקה. */
window.ART = (function () {

  // ===== חתולה =====
  // pose: 'sit' (ערה, זנב מתנדנד) · 'curl' (ישנה, מכורבלת) · 'play' (מנתרת על עלה)
  // שתי החתולות של הבית: מורגנה הכהה ובלטריקס הבהירה.
  function cat(o) {
    const c = o || {};
    const coat = c.coat || 'var(--cat1)';
    const inner = c.inner || 'var(--catInner)';
    const eye = c.eye || 'var(--catEye)';
    const d = c.delay || 0;

    if (c.pose === 'curl') {
      // מכורבלת: עיגול רך, זנב עוטף, אוזניים שטוחות. הנשימה היא האנימציה.
      return `<svg class="art-cat breathe" style="animation-delay:${d}s" viewBox="0 0 44 28" width="${c.w || 34}">
        <g fill="${coat}">
          <path d="M4,27 C2,16 10,9 22,9 C34,9 42,16 40,27 Z"/>
          <path d="M11,11 L8.5,4.5 L16,8 Z"/><path d="M27,8.5 L34,4.5 L32,11 Z"/>
        </g>
        <path d="M11.8,10 L10.4,6.4 L14.6,8.5 Z" fill="${inner}"/>
        <path d="M29.4,8.6 L32.6,6.4 L31.6,10 Z" fill="${inner}"/>
        <path d="M40,26 C46,24 45,16 38,15" fill="none" stroke="${coat}" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M14.5,17.5 q2.2,2 4.4,0" fill="none" stroke="${eye}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M25.5,17.5 q2.2,2 4.4,0" fill="none" stroke="${eye}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M22,20.5 l-1.6,-1.6 h3.2 Z" fill="${inner}"/>
      </svg>`;
    }

    // יושבת
    return `<svg class="art-cat" viewBox="0 0 40 37" width="${c.w || 26}">
      <g class="tail"><path d="M28.5,32.5 C36.5,32.5 38.5,24.5 33.5,20.5"
        fill="none" stroke="${coat}" stroke-width="3.8" stroke-linecap="round"/></g>
      <g fill="${coat}">
        <path d="M11,34.5 C10,23 13,18.2 20,18.2 C27,18.2 30,23 29,34.5 Z"/>
        <path d="M13.6,6.2 L12.3,1 L19,4.6 Z"/><path d="M26.4,6.2 L27.7,1 L21,4.6 Z"/>
        <circle cx="20" cy="13" r="8.2"/>
      </g>
      <path d="M14.6,5.9 L13.8,2.7 L17.7,4.9 Z" fill="${inner}"/>
      <path d="M25.4,5.9 L26.2,2.7 L22.3,4.9 Z" fill="${inner}"/>
      <ellipse cx="15.6" cy="34.2" rx="3.1" ry="1.8" fill="${coat}"/>
      <ellipse cx="24.4" cy="34.2" rx="3.1" ry="1.8" fill="${coat}"/>
      <g class="blink" style="animation-delay:${d}s">
        <ellipse cx="16.7" cy="12.7" rx="1.65" ry="2.15" fill="${eye}"/>
        <ellipse cx="23.3" cy="12.7" rx="1.65" ry="2.15" fill="${eye}"/>
        <circle cx="17.2" cy="12" r=".55" fill="#fff" opacity=".9"/>
        <circle cx="23.8" cy="12" r=".55" fill="#fff" opacity=".9"/>
      </g>
      <path d="M20,16.4 l-1.5,-1.4 h3 Z" fill="${inner}"/>
      <g stroke="${coat}" stroke-width=".6" opacity=".55" stroke-linecap="round">
        <path d="M12.5,15 L6.5,14"/><path d="M12.5,16.4 L7,17.6"/>
        <path d="M27.5,15 L33.5,14"/><path d="M27.5,16.4 L33,17.6"/>
      </g>
    </svg>`;
  }

  // ===== נינג׳ה על הגג (לילה) =====
  // צללית בלבד — כפופה, סרט הראש מתנופף. בלי פנים, זה מה שעושה אותה נינג׳ה.
  function ninja(w) {
    return `<svg class="art-fig" viewBox="0 0 34 28" width="${w || 24}">
      <g fill="var(--figure)">
        <path d="M9,27 C9,17.5 12,13.5 16,13.5 C20.5,13.5 23.5,17.5 23,27 Z"/>
        <circle cx="16" cy="9" r="4.6"/>
        <path d="M21,16 L29,19.5 L28,21.8 L20,18.8 Z"/>
        <path d="M11,26.5 L5,24 L6,21.8 L12,24.2 Z"/>
      </g>
      <g class="ribbon" fill="none" stroke="var(--figure)" stroke-width="1.7" stroke-linecap="round">
        <path d="M20,7.2 C25,5.6 29,7.4 32,10.4"/>
        <path d="M20,9.6 C24.5,9.4 28,11.6 30.4,14.6"/>
      </g>
    </svg>`;
  }

  // ===== מטייל עם כובע קש (יום) =====
  function traveler(w) {
    return `<svg class="art-fig" viewBox="0 0 34 34" width="${w || 26}">
      <g fill="var(--figure)">
        <path d="M11.5,14 L21.5,14 L24,33 L9,33 Z"/>
        <circle cx="16.5" cy="11.5" r="3.6"/>
        <path d="M4.5,10.5 Q16.5,-1 28.5,10.5 Q16.5,7 4.5,10.5 Z"/>
        <path d="M22,17 q6,1 7.5,6 l-2.4,.7 q-1.4,-3.6 -5.6,-4.4 Z"/>
      </g>
      <path d="M28.5,6 L28.5,33" stroke="var(--figure)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="28.5" cy="6" r="2" fill="none" stroke="var(--figure)" stroke-width="1.2"/>
    </svg>`;
  }

  // ===== פנס נייר =====
  function lantern(o) {
    const c = o || {};
    return `<svg class="art-lantern" style="animation-delay:${c.delay || 0}s" viewBox="0 0 18 30" width="${c.w || 13}">
      <path d="M9,0 L9,5" stroke="var(--roof)" stroke-width="1.2"/>
      <rect x="5.5" y="4.5" width="7" height="2" rx="1" fill="var(--roof)"/>
      <ellipse cx="9" cy="15" rx="7.4" ry="8.6" fill="var(--lanternGlow)" opacity=".35"/>
      <ellipse cx="9" cy="15" rx="5.6" ry="7.4" fill="var(--lantern)"/>
      <g stroke="var(--lanternRib)" stroke-width=".5" opacity=".5">
        <path d="M3.6,12.5 h10.8"/><path d="M3.4,15 h11.2"/><path d="M3.6,17.5 h10.8"/></g>
      <rect x="5.5" y="22.6" width="7" height="2" rx="1" fill="var(--roof)"/>
      <path d="M8,24.6 L8,28.4 M10,24.6 L10,27.6" stroke="var(--lantern)" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
    </svg>`;
  }

  // ===== שמש / ירח =====
  function sun(w) {
    return `<svg class="art-sun" viewBox="0 0 80 80" width="${w || 62}">
      <defs><radialGradient id="sunG"><stop offset="42%" stop-color="var(--sun)" stop-opacity=".95"/>
        <stop offset="62%" stop-color="var(--sun)" stop-opacity=".28"/>
        <stop offset="100%" stop-color="var(--sun)" stop-opacity="0"/></radialGradient></defs>
      <circle cx="40" cy="40" r="40" fill="url(#sunG)"/>
      <circle cx="40" cy="40" r="15" fill="var(--sunCore)"/>
    </svg>`;
  }
  function moon(w) {
    return `<svg class="art-moon" viewBox="0 0 80 80" width="${w || 54}">
      <defs><radialGradient id="moonG"><stop offset="36%" stop-color="var(--moon)" stop-opacity=".5"/>
        <stop offset="58%" stop-color="var(--moon)" stop-opacity=".16"/>
        <stop offset="100%" stop-color="var(--moon)" stop-opacity="0"/></radialGradient></defs>
      <circle cx="40" cy="40" r="40" fill="url(#moonG)"/>
      <circle cx="40" cy="40" r="14.5" fill="var(--moon)"/>
      <g fill="var(--moonCrater)" opacity=".45">
        <circle cx="36" cy="36" r="3.1"/><circle cx="44.5" cy="42.5" r="2.2"/><circle cx="38.5" cy="45" r="1.5"/></g>
    </svg>`;
  }

  // ===== מטרייה (גשם) =====
  function umbrella(w) {
    return `<svg class="art-umbrella" viewBox="0 0 34 34" width="${w || 26}">
      <path d="M2,15 Q17,-2 32,15 Q24.5,10.5 17,15 Q9.5,10.5 2,15 Z" fill="var(--umbrella)"/>
      <path d="M17,15 L17,29 q0,3.4 -3.4,3.4 q-2.4,0 -2.6,-2.2"
        fill="none" stroke="var(--umbrellaRib)" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M17,2.4 L17,0" stroke="var(--umbrellaRib)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  // ===== שער טורי =====
  function torii(w) {
    return `<svg class="art-torii" viewBox="0 0 40 34" width="${w || 26}">
      <g fill="var(--torii)">
        <path d="M2,5 Q20,1.5 38,5 L38,8.4 Q20,5.2 2,8.4 Z"/>
        <rect x="6" y="11.5" width="28" height="3.2" rx="1"/>
        <path d="M8.5,8 L12.5,8 L14,34 L9.5,34 Z"/>
        <path d="M31.5,8 L27.5,8 L26,34 L30.5,34 Z"/>
      </g>
    </svg>`;
  }

  // ===== אוניגירי =====
  function onigiri(o) {
    const c = o || {};
    return `<svg class="art-food" viewBox="0 0 46 42" width="${c.w || 44}">
      <path d="M23,3 C27,3 29,6 41,28 C43.6,32.6 41,38.6 35.6,38.6 L10.4,38.6
        C5,38.6 2.4,32.6 5,28 C17,6 19,3 23,3 Z" fill="var(--rice)"/>
      <path d="M23,3 C27,3 29,6 41,28 C43.6,32.6 41,38.6 35.6,38.6 L10.4,38.6
        C5,38.6 2.4,32.6 5,28 C17,6 19,3 23,3 Z" fill="none" stroke="var(--riceEdge)" stroke-width="1.1"/>
      <path d="M13.5,27.5 L32.5,27.5 L34.5,38.6 L11.5,38.6 Z" fill="var(--nori)"/>
      ${c.face === false ? '' : `
      <g fill="var(--noriFace)">
        <ellipse cx="17.5" cy="20" rx="1.5" ry="2"/><ellipse cx="28.5" cy="20" rx="1.5" ry="2"/>
        <path d="M20.4,24 q2.6,2.4 5.2,0" fill="none" stroke="var(--noriFace)" stroke-width="1.3" stroke-linecap="round"/>
      </g>
      <g fill="var(--blush)" opacity=".55"><ellipse cx="13.5" cy="23.4" rx="2.4" ry="1.5"/>
        <ellipse cx="32.5" cy="23.4" rx="2.4" ry="1.5"/></g>`}
    </svg>`;
  }

  // ===== ניגירי (סושי) =====
  function sushi(w) {
    return `<svg class="art-food" viewBox="0 0 52 34" width="${w || 44}">
      <ellipse cx="26" cy="23.5" rx="20" ry="9" fill="var(--rice)"/>
      <ellipse cx="26" cy="23.5" rx="20" ry="9" fill="none" stroke="var(--riceEdge)" stroke-width="1"/>
      <path d="M6.5,17 C9,8.5 43,8.5 45.5,17 C46.5,20.6 42,22.5 26,22.5 C10,22.5 5.5,20.6 6.5,17 Z" fill="var(--salmon)"/>
      <g stroke="var(--salmonStripe)" stroke-width="1.5" opacity=".75" stroke-linecap="round">
        <path d="M12,15.5 C19,12.4 33,12.4 40,15.5"/><path d="M10,19 C18,16.4 34,16.4 42,19"/></g>
      <rect x="21" y="12.5" width="10" height="12" rx="1.4" fill="var(--nori)" opacity=".92"/>
    </svg>`;
  }

  // ===== עלה =====
  const LEAF_PATH = 'M11,0 L13.4,6 L19,3.4 L16.4,9.4 L22,11.6 L16.4,14 L19,19.6 L13.4,17 L11,23 L8.6,17 L3,19.6 L5.6,14 L0,11.6 L5.6,9.4 L3,3.4 L8.6,6 Z';

  return { cat, ninja, traveler, lantern, sun, moon, umbrella, torii, onigiri, sushi, LEAF_PATH };
})();
