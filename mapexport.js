/* ===== ייצוא נקודות המסע ל-Google My Maps =====
   בונה קובץ KML מ-TRIP.mapPoints (שכבה לכל שלב + קו מסלול) ומוריד אותו.
   שימוש: mymaps.google.com → "צור מפה חדשה" → ייבוא → בחר את הקובץ.
   המפה תופיע באפליקציית Google Maps בנייד תחת "שמורים → מפות".
   הערה: אין API ציבורי שכותב ישירות ל"מקומות שמורים" בחשבון גוגל —
   ייבוא ל-My Maps היא הדרך הנתמכת היחידה. */

(function () {
  const PHASE_COLORS = ['#e94560', '#f2b705', '#4a9eda', '#c084fc', '#3ddc84', '#ff8c42'];

  // KML צובע ב-aabbggrr (הפוך מ-hex רגיל)
  function kmlColor(hex, alpha) {
    const h = hex.replace('#', '');
    return (alpha || 'ff') + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function phaseName(i) {
    const p = (window.TRIP && TRIP.phases && TRIP.phases[i]) || null;
    if (!p) return 'שלב ' + (i + 1);
    return p.h.replace(/\s*\(❓[^)]*\)/, '').trim();
  }

  function buildKML(opts) {
    const includeParked = !!(opts && opts.includeParked);
    const pts = ((window.TRIP && TRIP.mapPoints) || []).filter(p => includeParked || !p.parked);
    if (!pts.length) return null;

    // סגנון סיכה לכל שלב
    const phaseIdx = [...new Set(pts.map(p => p.ph))].sort((a, b) => a - b);
    const styles = phaseIdx.map(i =>
      `    <Style id="ph${i}">
      <IconStyle><color>${kmlColor(PHASE_COLORS[i % 6])}</color><scale>1.1</scale>
        <Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><color>${kmlColor(PHASE_COLORS[i % 6])}</color></LabelStyle>
    </Style>`).join('\n');

    const routeStyle =
      `    <Style id="route">
      <LineStyle><color>${kmlColor('#e94560', 'b3')}</color><width>3</width></LineStyle>
    </Style>`;

    // שכבה לכל שלב — My Maps מייבא כל Folder כשכבה נפרדת
    const folders = phaseIdx.map(i => {
      const marks = pts.filter(p => p.ph === i).map((pt, n) => {
        const order = pts.indexOf(pt) + 1;
        const desc = [pt.d, pt.parked ? '(בסימן שאלה — לא בתוכנית כרגע)' : '']
          .filter(Boolean).join(' · ');
        return `      <Placemark>
        <name>${esc(order + '. ' + pt.n)}</name>
        <description>${esc(desc)}</description>
        <styleUrl>#ph${i}</styleUrl>
        <Point><coordinates>${pt.lng},${pt.lat},0</coordinates></Point>
      </Placemark>`;
      }).join('\n');
      return `    <Folder>
      <name>${esc(phaseName(i))}</name>
${marks}
    </Folder>`;
    }).join('\n');

    const line = pts.map(p => `${p.lng},${p.lat},0`).join(' ');
    const routeFolder = `    <Folder>
      <name>קו המסלול</name>
      <Placemark>
        <name>מסלול המסע (צפון→דרום)</name>
        <styleUrl>#route</styleUrl>
        <LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString>
      </Placemark>
    </Folder>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>יפן 2026 · יובל &amp; שיר</name>
    <description>${esc('נקודות המסע מהאתר — עודכן ' + ((window.TRIP && TRIP.updated) || ''))}</description>
${styles}
${routeStyle}
${folders}
${routeFolder}
  </Document>
</kml>`;
  }

  function download(opts) {
    const kml = buildKML(opts);
    if (!kml) return false;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nipon26-japan-2026.kml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  window.TRIP_MAP_EXPORT = { buildKML, download };

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-kml-export]');
    if (!btn) return;
    e.preventDefault();
    const ok = download({ includeParked: btn.hasAttribute('data-include-parked') });
    const old = btn.textContent;
    btn.textContent = ok ? '✅ הקובץ ירד' : '⚠️ אין נקודות לייצוא';
    setTimeout(() => { btn.textContent = old; }, 2200);
  });
})();
