/* רישום ה-service worker + חיווי חיבור. נטען בכל דף. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
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
