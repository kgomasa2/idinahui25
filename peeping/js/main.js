import { Notepad, FLIPS } from './notepad.js';
import { LetterField } from './letters.js';
import './shots.js';

/* перший екран закріплений — сторінка завжди починається згори */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);

const field  = new LetterField($('#letterfield'));
const hero   = $('#hero');
const loader = $('#loader');
const cue    = $('#scrolldown');

/* поля «спокою» на початку й у кінці першого екрана */
const IN = 0.07, OUT = 0.10;

/* поле літер сховане на вузьких екранах (див. style.css) — не рахуємо його */
const lettersVisible = () => innerWidth > 620;

let pad = null;

function killCues() { cue.classList.add('is-off'); }

try {
  pad = new Notepad($('#gl'), {
    onReady: () => loader.classList.add('is-done'),
  });
} catch (err) {
  console.warn('WebGL недоступний:', err);
  loader.classList.add('is-done');
  const img = document.createElement('img');
  img.src = new URL('../assets/img/hero-render.jpg', import.meta.url).href;
  img.alt = 'PEEPING';
  img.className = 'stage__fallback';
  $('#stage').appendChild(img);
}

/* ── скрол ──────────────────────────────────── */
let heroTop = 0, heroMax = 1, lastW = 0;
function measure() {
  /* На мобільній панель браузера ховається/зʼявляється і кидає resize із
     новою висотою. Перерахунок у цей момент смикав прогрес гортання, тож
     реагуємо лише на зміну ширини — висота sticky задана в svh і стала. */
  if (innerWidth === lastW && matchMedia('(pointer: coarse)').matches) return;
  lastW = innerWidth;

  heroTop = hero.offsetTop;
  heroMax = Math.max(1, hero.offsetHeight - innerHeight);

  /* блок з ціною закріплений у sticky-контейнері, тож його offset-координати
     збігаються з екранними — літери мають його обходити */
  const b = $('.buy');
  field.setKeepOut(lettersVisible()
    ? { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }
    : null, 24);
}
measure();
addEventListener('resize', measure, { passive: true });
addEventListener('load', measure);
document.fonts?.ready.then(measure);   /* після KTF Metro блок міняє розмір */

addEventListener('scroll', () => {
  if (window.scrollY > innerHeight * 0.3) killCues();
}, { passive: true });

/** прокрутити сторінку так, щоб було перегорнуто n аркушів */
function scrollToFlip(n) {
  const t = clamp(n, 0, FLIPS) / FLIPS;
  const p = IN + t * (1 - IN - OUT);
  scrollTo({ top: heroTop + p * heroMax, behavior: 'smooth' });
}

function readScroll() {
  if (window.__peeping?.lock) return;
  const heroP = clamp((window.scrollY - heroTop) / heroMax, 0, 1);

  /* гортання блокнота прив'язане до скролу першого екрана */
  if (pad) pad.setFlow(clamp((heroP - IN) / (1 - IN - OUT), 0, 1) * FLIPS);

  /* композиції літер міняються протягом усього першого екрана,
     а на під'їзді до тексту зникають */
  const fade = 1 - smooth(clamp((heroP - 0.82) / 0.16, 0, 1));
  field.setProgress(clamp(heroP / 0.86, 0, 1), fade);
}

function frameLetters() {
  if (lettersVisible()) field.update();
}

/* ── цикл ───────────────────────────────────── */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  readScroll();
  frameLetters();
  if (pad) pad.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ← → гортають, поки перший екран у кадрі; ↑ ↓ лишаються за скролом */
addEventListener('keydown', (e) => {
  if (!pad || window.scrollY > heroTop + heroMax) return;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  scrollToFlip(Math.round(pad.flow) + (e.key === 'ArrowRight' ? 1 : -1));
  killCues();
  e.preventDefault();
});

/* службовий хук для покадрового прогону під час налагодження */
window.__peeping = {
  field, pad,
  step: (n = 1, dt = 1 / 60) => {
    for (let i = 0; i < n; i++) { readScroll(); frameLetters(); pad && pad.update(dt); }
  },
};
