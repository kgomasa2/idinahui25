/* ─────────────────────────────────────────────
   Вибір мови. Скрипт синхронний і стоїть у <head>,
   щоб редирект відбувся до першого малювання.

   Правила:
   · ?lang=uk|en — явний вибір, запам'ятовується;
   · далі — збережений вибір;
   · далі — мова браузера: українська або російська → українська версія,
     будь-яка інша → англійська.
   ───────────────────────────────────────────── */
(function () {
  var KEY = 'peeping-lang';
  var here = document.documentElement.lang.slice(0, 2) || 'uk';

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* приватний режим */ }
  }

  var forced = new URLSearchParams(location.search).get('lang');
  if (forced === 'uk' || forced === 'en') write(forced);

  var want = forced || read();
  if (!want) {
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    want = /^(uk|ru)/i.test(nav) ? 'uk' : 'en';
  }
  if (want === here) return;

  location.replace(here === 'uk' ? 'en/' : '../');
})();
