/* ===== שכבת הרקע של המפות (Leaflet) =====
   OSM הסטנדרטי מציג שמות בשפה המקומית — ביפן זה יפנית בלבד.
   CARTO מרנדר את אותו מידע OSM עם תוויות בכתב לטיני (Tokyo, Kyoto…),
   בחינם ובלי מפתח API.

   להחלפת סגנון — שנה כאן בלבד (שתי המפות באתר נטענות מכאן):
     rastertiles/voyager     → צבעוני וקריא, קרוב ל-OSM הרגיל (ברירת מחדל)
     light_all               → אפור-לבן נקי, הכי קריא (Positron)
     dark_all                → כהה — מתאים לעיצוב אבל התוויות כמעט לא נקראות
   כתובת: https://{s}.basemaps.cartocdn.com/<סגנון>/{z}/{x}/{y}{r}.png */

window.BASEMAP = {
  style: 'rastertiles/voyager',
  attribution: '© OpenStreetMap © CARTO',
  url: function () {
    return 'https://{s}.basemaps.cartocdn.com/' + this.style + '/{z}/{x}/{y}{r}.png';
  },
  // מוסיף את שכבת הרקע למפת Leaflet נתונה
  add: function (map, maxZoom) {
    const zoom = maxZoom || 18;
    const layer = L.tileLayer(this.url(), {
      maxZoom: zoom,
      detectRetina: true,      // מפעיל את {r} → @2x במסכים חדים
      subdomains: 'abcd',
      attribution: this.attribution
    }).addTo(map);

    // אם CARTO לא זמין — נופלים חזרה ל-OSM (תוויות ביפנית, אבל מפה שעובדת)
    let fellBack = false;
    layer.on('tileerror', function () {
      if (fellBack) return;
      fellBack = true;
      map.removeLayer(layer);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: zoom, attribution: '© OpenStreetMap'
      }).addTo(map);
    });

    return layer;
  }
};
