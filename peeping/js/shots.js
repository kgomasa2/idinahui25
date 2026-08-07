/* ─────────────────────────────────────────────
   Смуга сканів на третьому екрані.

   · колесо над смугою гортає її вбік;
   · клік розкриває скан на весь екран.
   ───────────────────────────────────────────── */

const strip = document.querySelector('.shots');
if (strip) {
  const shots = [...strip.querySelectorAll('.shot img')];

  /* ── колесо гортає смугу ─────────────────── */
  /* Перехоплюємо тільки поки смузі є куди їхати: на її краю подія йде далі
     й сторінка гортається вертикально, як завжди. Інакше курсор над смугою
     ставав би пасткою. Трекпади дають і deltaX — його поважаємо як є. */
  strip.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;                       /* зум сторінки не чіпаємо */
    const step = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!step) return;

    const max = strip.scrollWidth - strip.clientWidth;
    if (max <= 0) return;
    const at = strip.scrollLeft;
    if ((step < 0 && at <= 0) || (step > 0 && at >= max - 1)) return;

    strip.scrollLeft = at + step;
    e.preventDefault();
  }, { passive: false });

  /* ── скан на весь екран ──────────────────── */
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  const full = document.createElement('img');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lightbox__close';
  close.innerHTML = '&times;';
  box.append(full, close);
  document.body.append(box);

  const root = document.documentElement;
  let at = -1, opener = null;

  /* дрібний кадр із смуги → великий скан поруч із ним */
  const bigSrc = (src) => src.replace(/\.jpg(\?|$)/, '-lg.jpg$1');

  function show(i) {
    at = (i + shots.length) % shots.length;
    const small = shots[at];
    full.alt = small.alt;
    /* якщо великого файлу нема — лишаємось на дрібному, а не на порожньому місці */
    full.onerror = () => { full.onerror = null; full.src = small.currentSrc || small.src; };
    full.src = bigSrc(small.getAttribute('src'));
  }

  function open(i, from) {
    opener = from;
    show(i);
    /* padding замість смуги прокрутки — інакше сторінка під сподом смикнеться */
    const bar = window.innerWidth - root.clientWidth;
    if (bar > 0) root.style.paddingRight = bar + 'px';
    root.classList.add('is-locked');
    box.hidden = false;
    void box.offsetHeight;          /* фіксуємо стартовий стан, інакше згасання не програється */
    box.classList.add('is-open');
    /* наступним кадром: поки стилі не перерахувались, шар ще visibility:hidden
       і фокус на ньому не тримається */
    requestAnimationFrame(() => close.focus({ preventScroll: true }));
  }

  function hide() {
    if (box.hidden) return;
    box.classList.remove('is-open');
    root.classList.remove('is-locked');
    root.style.paddingRight = '';
    opener?.focus({ preventScroll: true });
    opener = null;
    /* ховаємо після згасання, щоб картинка не зникала ривком */
    setTimeout(() => { if (!box.classList.contains('is-open')) box.hidden = true; }, 350);
  }

  shots.forEach((img, i) => {
    const fig = img.closest('.shot');
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.addEventListener('click', () => open(i, fig));
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, fig); }
    });
  });

  box.addEventListener('click', hide);

  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') { hide(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { show(at + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { show(at - 1); e.preventDefault(); }
  });
}
