'use strict';

document.documentElement.classList.remove('no-js');

/* --- DATA HELPERS --- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Простой store (для совместимости, если нужен на других страницах)
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('nav_'+k)) || d; } catch(e){ return d; } },
  set: (k, v) => localStorage.setItem('nav_'+k, JSON.stringify(v))
};

/* --- SCROLL ANIMATIONS (INTERSECTION OBSERVER) --- */
function initAnimations() {
  const observerOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optional: unobserve after reveal if you don't want it to hide again
        // observer.unobserve(entry.target); 
      } else {
        // Двунаправленная анимация: убираем класс, когда уходим с экрана
        entry.target.classList.remove('is-visible');
      }
    });
  }, observerOptions);

  $$('.reveal-up, .reveal-side, .dir-card').forEach(el => observer.observe(el));
}

/* --- HOME PAGE LOGIC --- */
function initHome() {
  // Stats
  if ($('[data-stat="vuz"]')) {
    $('[data-stat="vuz"]').textContent = SCHOOLS.filter(s => s.t === 'vuz').length;
    $('[data-stat="college"]').textContent = SCHOOLS.filter(s => s.t === 'college').length;
    $('[data-stat="cities"]').textContent = new Set(SCHOOLS.map(s => s.c)).size;
  }

  // Directions Render
  const dirList = $('#dirList');
  if (dirList) {
    const catCounts = {};
    SCHOOLS.forEach(s => catCounts[s.cat] = (catCounts[s.cat] || 0) + 1);
    
    dirList.innerHTML = CATEGORIES.map(c => `
      <li class="reveal-up">
        <a href="vuzi.html?cat=${c.key}" class="dir-card">
          <div class="icon-box">
             <svg class="icon" width="24" height="24"><use href="#${c.icon}"/></svg>
          </div>
          <h3>${c.name}</h3>
          <span>${catCounts[c.key] || 0} заведений</span>
        </a>
      </li>
    `).join('');
  }
  
  initAnimations();
}

/* --- VUZI PAGE LOGIC (Updated for Image Cards) --- */
function initVuzi() {
  // ... (сохраняем старую логику фильтров, но меняем рендер карточки)
  
  // Пример рендера карточки с картинкой (вставь это в функцию render внутри initVuzi)
  /*
  cards.innerHTML = list.map((s, i) => {
    // Генерируем ссылку на фото здания (заглушка Unsplash по ключевым словам или ID)
    // В реальном проекте лучше хранить прямые ссылки в data.js
    const imgUrl = `https://source.unsplash.com/600x400/?university,building,architecture&sig=${s.id}`;
    // Fallback если source.unsplash медленный: используем picsum
    const fallbackImg = `https://picsum.photos/seed/${s.id}/600/400`;

    return `
    <article class="card-glass" style="animation-delay: ${i * 50}ms">
      <div class="card-img" style="background-image: url('${fallbackImg}')"></div>
      <div class="card-content">
        <div class="card-top">
           <span class="tag">${s.t === 'vuz' ? 'Вуз' : 'Колледж'}</span>
           <button class="fav-btn" data-fav="${s.id}">★</button>
        </div>
        <h3 class="card-title">${s.n}</h3>
        <p class="card-city">📍 ${s.c}</p>
        <div class="card-score">
           <span>Проходной:</span> <b>${s.s}</b>
        </div>
      </div>
    </article>`;
  }).join('');
  */
  
  // Для этой страницы стили карточек нужно добавить в CSS (см. ниже патч)
  initAnimations();
}

/* --- EXAMS PAGE LOGIC --- */
function initExams() {
   // ... старая логика
   initAnimations();
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'vuzi') initVuzi();
  else if (page === 'exams') initExams();
});
