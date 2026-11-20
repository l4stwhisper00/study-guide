/* ============================================================
   НАВИГАТОР — общий скрипт (все страницы)
   Иконки-спрайт, курсор, reveal, счётчики, сплит-заголовки
   ============================================================ */

/* ---------- 1. SVG-спрайт иконок (вместо внешнего CDN) ---------- */
const ICONS = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <defs>
    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5c8dff"/><stop offset="100%" stop-color="#3ee0c0"/>
    </linearGradient>
  </defs>
  <symbol id="i-compass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-grad" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></symbol>
  <symbol id="i-buildings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="8" height="18" rx="1"/><rect x="12" y="9" width="8" height="12" rx="1"/><path d="M8 7h.01M8 11h.01M8 15h.01M16 13h.01M16 17h.01"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></symbol>
  <symbol id="i-arrow-r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></symbol>
  <symbol id="i-arrow-l" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 13 4-4 4 4 5-6"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3.5 8 1.5 1.5L7.5 7"/><rect x="3" y="13" width="6" height="6" rx="1"/><path d="m3.5 16 1.5 1.5L7.5 15"/><path d="M13 7h8M13 15h8"/></symbol>
  <symbol id="i-books" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h5v16H3zM10 4h5v16h-5z"/><path d="m17.5 4.5 4 14.5-4.8 1.4L13.6 6z"/></symbol>
  <symbol id="i-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></symbol>
  <symbol id="i-bank" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-6 9 6"/><path d="M4 9v10M8 9v10M16 9v10M20 9v10M2 19h20"/></symbol>
  <symbol id="i-rotate" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></symbol>
  <symbol id="i-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></symbol>
  <symbol id="i-brief" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></symbol>
  <symbol id="i-cpu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></symbol>
  <symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1ZM2 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1Z"/><path d="M7 21h10M12 3v18M3 7h18l-2.5-3h-13L3 7Z"/></symbol>
  <symbol id="i-palette" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 1 10-10c0 4.4-3.6 5-6 5h-1.5a2 2 0 0 0-1.5 3.3c.3.4.5.8.5 1.2a1.5 1.5 0 0 1-1.5 1.5Z"/><circle cx="7.5" cy="11.5" r="1" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1" fill="currentColor"/><circle cx="15.5" cy="7.5" r="1" fill="currentColor"/></symbol>
  <symbol id="i-wrench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0 6 6L17 16l-5.5 5.5a2.1 2.1 0 0 1-3-3L14 13 8.7 7.3a4.5 4.5 0 0 0-6 6L3 13z" transform="rotate(90 12 12)"/></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M7 12h10M10 18h4"/></symbol>
  <symbol id="i-cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></symbol>
</svg>`;
document.body.insertAdjacentHTML('afterbegin', ICONS);

/** Хелпер: <i data-i="search"></i> -> готовая svg-иконка */
function ic(name, cls) {
  return `<svg class="icon ${cls || ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
// Заменяем все <i data-i="..."> в разметке
document.querySelectorAll('i[data-i]').forEach(el => {
  el.outerHTML = ic(el.dataset.i, el.className);
});

/* ---------- 2. Кастомный курсор ---------- */
(function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let x = -100, y = -100, rx = -100, ry = -100;
  document.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; });
  (function loop() {
    rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
    dot.style.transform  = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();

  const hoverSel = 'a, button, input, select, label, .uni-card, [role="button"]';
  document.addEventListener('mouseover', e => {
    ring.classList.toggle('is-hover', !!e.target.closest(hoverSel));
  });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = '1'; });
})();

/* ---------- 3. Reveal при скролле ---------- */
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealIO.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
document.querySelectorAll('.reveal, .intro').forEach((el, i) => {
  // лёгкая «лесенка» для элементов в одном контейнере
  el.style.transitionDelay = `${Math.min((i % 6) * 0.06, 0.3)}s`;
  revealIO.observe(el);
});

/* ---------- 4. Посимвольная анимация заголовков ---------- */
document.querySelectorAll('[data-split]').forEach(el => {
  const text = el.textContent;
  el.textContent = '';
  let charIdx = 0;
  text.split(' ').forEach((word, wi, arr) => {
    // слово целиком не переносится — только по границам слов
    const wrap = document.createElement('span');
    wrap.className = 'w';
    [...word].forEach(ch => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.style.transitionDelay = `${0.35 + charIdx * 0.022}s`;
      span.textContent = ch;
      wrap.appendChild(span);
      charIdx++;
    });
    el.appendChild(wrap);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('split-in')));
});

/* ---------- 5. Счётчики ---------- */
const countIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    countIO.unobserve(entry.target);
    const el = entry.target;
    const target = parseFloat(el.dataset.count);
    const dur = 1400, t0 = performance.now();
    const isInt = Number.isInteger(target);
    (function tick(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = isInt ? Math.round(target * eased) : (target * eased).toFixed(1);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
}, { threshold: 0.4 });
document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

/* ---------- 6. Навигация + прогресс скролла ---------- */
const navEl = document.querySelector('.nav');
const progressEl = document.querySelector('.scroll-progress');
window.addEventListener('scroll', () => {
  const st = window.scrollY;
  if (navEl) navEl.classList.toggle('scrolled', st > 30);
  if (progressEl) {
    const h = document.documentElement.scrollHeight - innerHeight;
    progressEl.style.width = (h > 0 ? (st / h) * 100 : 0) + '%';
  }
}, { passive: true });

/* ---------- 7. «Прожектор» за мышью на карточках ---------- */
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.uni-card, .btn, .feature-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - r.left}px`);
  card.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });
