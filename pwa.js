/* רישום ה-service worker + חיווי חיבור. נטען בכל דף. */
(function () {
  if ('serviceWorker' in navigator) {
    // מנוטרל controllerchange לפני ה-register: אם היה כבר controller ועכשיו הוא
    // הוחלף — זו גרסה חדשה שתפסה שליטה (clients.claim ב-sw.js), לא ההתקנה הראשונה
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) showUpdateBar();
      hadController = true;
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  function showUpdateBar() {
    const bar = document.createElement('div');
    bar.textContent = '🔄 גרסה חדשה זמינה — הקישו לרענון';
    bar.style.cssText = 'position:fixed;top:0;right:0;left:0;z-index:301;padding:9px 14px;' +
      'background:#c9622a;color:#fff;font-size:0.85rem;text-align:center;font-weight:700;cursor:pointer;' +
      "font-family:'Segoe UI',Tahoma,sans-serif";
    bar.addEventListener('click', () => location.reload());
    if (document.body) document.body.appendChild(bar);
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bar), { once: true });
  }

  // חיווי "אין רשת" — לא מודאל, רק פס דק שלא חוסם כלום
  const bar = document.createElement('div');
  bar.textContent = '⚡ אין רשת — מוצג המידע השמור';
  bar.style.cssText = 'position:fixed;bottom:0;right:0;left:0;z-index:300;padding:7px 14px;' +
    'background:#1f2937;color:#9aa6b8;font-size:0.8rem;text-align:center;' +
    "font-family:'Segoe UI',Tahoma,sans-serif;transform:translateY(100%);transition:.3s";
  const show = () => { bar.style.transform = navigator.onLine ? 'translateY(100%)' : 'translateY(0)'; };
  window.addEventListener('online', show);
  window.addEventListener('offline', show);
  document.addEventListener('DOMContentLoaded', () => { document.body.appendChild(bar); show(); });
})();
