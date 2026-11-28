/* Навигатор выпускника: логика + анимации (vanilla, IntersectionObserver only) */
'use strict';
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

/* ---------- Хранилище ---------- */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('nav_' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem('nav_' + key, JSON.stringify(value));
      if (typeof window.studyGuidePersist === 'function') {
        void window.studyGuidePersist(key, value);
      }
    } catch {}
  },
};

/* ---------- Общие ---------- */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const escapeHtml = s => String(s).replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));
const TYPE_LABEL = { vuz: 'Вуз', college: 'Колледж' };
const TYPE_CLASS = { vuz: 'tag-vuz', college: 'tag-college' };
const HUES = { it: 255, eng: 210, med: 350, econ: 140, law: 45, hum: 285, sci: 190, agro: 95, edu: 320, art: 20 };

async function updateCatalogFreshness() {
  const element = $('#catalogFreshness');
  if (!element) return;
  const formatDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('ru-RU');
  };
  try {
    const [siteResponse, dataResponse] = await Promise.all([
      fetch('catalog-source-status.json', { cache: 'no-store' }).catch(() => null),
      fetch('catalog-data-status.json', { cache: 'no-store' }).catch(() => null)
    ]);
    const reports = await Promise.all([
      siteResponse?.ok ? siteResponse.json().catch(() => null) : null,
      dataResponse?.ok ? dataResponse.json().catch(() => null) : null
    ]);
    const [siteReport, dataReport] = reports;
    const messages = [];
    if (siteReport?.checkedAt) {
      messages.push(`Проверка официальных сайтов и документов: ${formatDate(siteReport.checkedAt)} · доступны ${siteReport.reachable} из ${siteReport.total} ссылок.`);
    } else {
      messages.push('Плановая проверка официальных ссылок ещё не выполнялась.');
    }
    if (dataReport?.checkedAt) {
      const updated = (Number(dataReport.updatedPrices) || 0) + (Number(dataReport.updatedBudgetPlaces) || 0);
      messages.push(`Проверка приёмных данных: ${formatDate(dataReport.checkedAt)} · обновлено цен: ${Number(dataReport.updatedPrices) || 0}, сведений о бюджетных/субсидируемых местах: ${Number(dataReport.updatedBudgetPlaces) || 0}.`);
      if (dataReport.lastSuccessfulDataAt) {
        messages.push(`Последнее успешное обновление цифр: ${formatDate(dataReport.lastSuccessfulDataAt)}.`);
      } else if (updated === 0) {
        messages.push('В последней проверке новые цифры автоматически не извлечены — старые значения не перезаписывались, источники требуют проверки.');
      }
      if (Number(dataReport.needsReview) > 0) {
        messages.push(`Источников требуют ручной проверки: ${Number(dataReport.needsReview)}.`);
      }
    } else {
      messages.push('Автоматическое обновление цен и бюджетных мест ожидает первого запуска.');
    }
    messages.push('Доступность ссылки не означает, что опубликованные учреждением условия не изменились. Каждая цена и цифра мест должна открываться в своём официальном источнике.');
    element.textContent = messages.join(' ');
  } catch {
    element.textContent = 'Плановая проверка источников выполняется раз в 14 дней. Данные без подтверждённой программы, года и официальной ссылки не показываются как точные.';
  }
}
updateCatalogFreshness();
function icon(name, cls = 'icon') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;
}

function schoolMapLinks(school) {
  const query = encodeURIComponent(school.n + ', ' + school.c);
  return {
    yandex: 'https://yandex.ru/maps/?text=' + query,
    twoGis: 'https://2gis.ru/search/' + query,
    admissions: 'https://yandex.ru/search/?text=' + encodeURIComponent(
      school.n + ' ' + school.c + ' приёмная комиссия бюджетные места стоимость обучения 2027'
    ),
  };
}

function getSchoolDetails(school) {
  return typeof getCatalogDetails === 'function'
    ? getCatalogDetails(school)
    : { ownership: 'unknown', programs: [], budgetPlaces: [], tuition: [], verifiedAt: null, sourceUrl: school.u ? 'https://' + school.u : null };
}

function hasNumber(value) { return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)); }

function money(value) {
  return hasNumber(value)
    ? new Intl.NumberFormat('ru-RU').format(Number(value)) + ' ₽'
    : 'Нет подтверждённых данных';
}

function renderBudgetPlaces(details) {
  const rows = (details.budgetPlaces || []).filter(item => hasNumber(item.count));
  if (!rows.length) return '<p class="catalog-data-empty">Нет подтверждённого количества бюджетных мест по программам текущего набора. Не подставляем общую цифру вместо официальных данных.</p>';
  return '<ul class="catalog-data-list">' + rows.map(item =>
    '<li><b>' + escapeHtml(item.program || 'Программа не указана') + '</b><span>' +
    escapeHtml(String(item.count)) + ' мест · ' + escapeHtml(String(item.year || 'год не указан')) +
    (item.fundingType ? ' · ' + escapeHtml(item.fundingType) : '') +
    (item.sourceUrl ? ' · <a href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Источник</a>' : '') +
    '</span></li>'
  ).join('') + '</ul>';
}

function renderTuition(details) {
  const rows = (details.tuition || []).filter(item =>
    hasNumber(item.annualRub) || hasNumber(item.monthlyRub)
  );
  if (!rows.length) return '<p class="catalog-data-empty">Стоимость платного обучения пока не подтверждена официальным документом для конкретной программы. Проверь цену на сайте приёмной комиссии.</p>';
  return '<div class="catalog-tuition-list">' + rows.map(item => {
    const monthly = hasNumber(item.monthlyRub)
      ? money(item.monthlyRub) + (item.monthlyIsEquivalent ? ' (эквивалент)' : '')
      : hasNumber(item.annualRub) ? money(Number(item.annualRub) / 12) + ' (эквивалент)' : 'Не опубликовано';
    const annual = hasNumber(item.annualRub) ? money(item.annualRub) : 'Не опубликовано';
    return '<article class="catalog-tuition-row"><b>' + escapeHtml(item.program || 'Программа не указана') +
      '</b><div><span>В месяц</span><strong>' + escapeHtml(monthly) + '</strong></div><div><span>В год</span><strong>' +
      escapeHtml(annual) + '</strong></div><small>' + escapeHtml(String(item.year || 'Год набора не указан')) +
      (item.paymentPeriod ? ' · ' + escapeHtml(item.paymentPeriod) : '') +
      (item.sourceUrl ? ' · <a href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Источник</a>' : '') +
      '</small></article>';
  }).join('') + '</div>';
}

function scoreMeta(school) {
  if (school.s == null || !Number.isFinite(Number(school.s))) {
    return {
      value: 'Нет подтверждённых данных',
      label: school.t === 'college' ? 'Средний балл аттестата' : 'Проходной балл ЕГЭ',
      note: 'Значение не опубликовано в каталоге. Уточни его в приёмной комиссии по конкретной специальности и форме обучения.',
    };
  }
  return {
    value: String(school.s) + (school.t === 'college' ? ' / 5' : ' баллов'),
    label: school.t === 'college' ? 'Ориентир среднего балла аттестата' : 'Ориентир суммы ЕГЭ',
    note: 'Это ориентир из текущей версии каталога, а не подтверждённый официальный проходной балл. Год, конкурсная группа и программа требуют проверки в приёмной комиссии.',
  };
}

function chanceInfo(school) {
  const scores = store.get('scores', {});
  if (school.s == null || !Number.isFinite(Number(school.s))) {
    return { cls: 'chance-unknown', text: 'Нет подтверждённого ориентира' };
  }
  if (school.t === 'college') {
    const gpa = Number(scores.gpa);
    if (!gpa) return { cls: 'chance-unknown', text: 'Укажи балл аттестата' };
    const diff = school.s - gpa;
    if (diff <= 0)   return { cls: 'chance-ok',    text: 'Выше ориентира по аттестату' };
    if (diff <= 0.4) return { cls: 'chance-close', text: `Ниже ориентира на ~${diff.toFixed(1)} балла` };
    return { cls: 'chance-low', text: `Ниже ориентира на ${diff.toFixed(1)} балла` };
  }
  const required = school.sub || [];
  if (!required.length || required.some(k => !(Number(scores[k]) > 0))) {
    return { cls: 'chance-unknown', text: 'Укажи баллы по всем нужным ЕГЭ' };
  }
  const sum = required.reduce((n, k) => n + Number(scores[k]), 0);
  const diff = school.s - sum;
  if (diff <= 0)  return { cls: 'chance-ok',    text: `Выше ориентира на ${-diff} б.` };
  if (diff <= 20) return { cls: 'chance-close', text: `Ниже ориентира на ${diff} б.` };
  return { cls: 'chance-low', text: `Не хватает ${diff} б. по ориентиру` };
}

function renderStats() {
  const vuz = SCHOOLS.filter(s => s.t === 'vuz').length;
  const college = SCHOOLS.filter(s => s.t === 'college').length;
  $$('[data-stat="vuz"]').forEach(el => el.textContent = vuz);
  $$('[data-stat="college"]').forEach(el => el.textContent = college);
  $$('[data-stat="cities"]').forEach(el => el.textContent = new Set(SCHOOLS.map(s => s.c)).size);
  $$('[data-stat="topics"]').forEach(el => el.textContent = Object.values(EXAM_TOPICS).reduce((n, s) => n + s.topics.length, 0));
  $$('[data-stat="total"]').forEach(el => el.textContent = SCHOOLS.length);
}

/* ---------- Кастомный select ---------- */
function initCustomSelect(sel, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'cselect';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'cselect-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  const list = document.createElement('div');
  list.className = 'cselect-list';
  list.innerHTML = Array.from(sel.options).map(o =>
    `<button type="button" role="option" data-v="${o.value}" aria-selected="${o.value === sel.value}">${o.text}</button>`).join('');
  wrap.append(btn, list);
  const setLabel = () => { btn.textContent = sel.options[sel.selectedIndex].text; };
  setLabel();
  btn.addEventListener('click', () => wrap.classList.toggle('open'));
  list.addEventListener('click', e => {
    const opt = e.target.closest('[data-v]');
    if (!opt) return;
    sel.value = opt.dataset.v;
    list.querySelectorAll('[role=option]').forEach(b => b.setAttribute('aria-selected', String(b === opt)));
    wrap.classList.remove('open'); setLabel(); onChange(sel.value);
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
}

/* ---------- Scroll-reveal (двусторонний, только IO) ---------- */
function initReveal() {
  $$('[data-stagger]').forEach(group => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--rd', (Math.min(i, 12) * 80) + 'ms');
    });
  });
  const items = $$('.reveal-up, .reveal-side');
  if (!items.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) el.classList.add('is-visible');
      else { el.classList.remove('is-visible'); el.style.willChange = ''; }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => {
    el.addEventListener('transitionend', e => {
      if (e.target === el && e.propertyName === 'transform' && el.classList.contains('is-visible')) {
        el.style.willChange = 'auto';
      }
    });
    io.observe(el);
  });
}

/* ---------- Портреты и фото зданий: Wikipedia API + фолбэки ---------- */
function loadPortraits() {
  $$('[data-wiki]').forEach(box => {
    fetch('https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(box.dataset.wiki))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => {
        const src = j.thumbnail && j.thumbnail.source;
        if (!src) throw 0;
        const img = new Image();
        img.alt = '';
        img.onload = () => { box.appendChild(img); box.classList.add('has-img'); };
        img.src = src;
      })
      .catch(() => box.classList.add('no-img'));
  });
}

const photoCache = store.get('wiki_imgs', {});
function initCardPhotos() {
  const covers = $$('.card-cover[data-photo]');
  if (!covers.length) return;
  const apply = (box, url) => {
    if (!url) return;
    box.style.backgroundImage = `url('${url}')`;
    box.classList.add('has-photo');
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const box = entry.target;
      io.unobserve(box);
      const key = box.dataset.photo;
      if (key in photoCache) { apply(box, photoCache[key]); return; }
      fetch('https://ru.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
            '&generator=search&gsrlimit=1&prop=pageimages&pithumbsize=640&gssearch=' + encodeURIComponent(key))
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(j => {
          const page = j.query && Object.values(j.query.pages)[0];
          const url = page && page.thumbnail ? page.thumbnail.source : '';
          if (Object.keys(photoCache).length < 80) { photoCache[key] = url; store.set('wiki_imgs', photoCache); }
          apply(box, url);
        })
        .catch(() => { photoCache[key] = ''; store.set('wiki_imgs', photoCache); });
    });
  }, { rootMargin: '200px' });
  covers.forEach(box => {
    if (box.dataset.photo in photoCache) apply(box, photoCache[box.dataset.photo]);
    else io.observe(box);
  });
}

/* ---------- Главная ---------- */
function initHome() {
  renderStats();
  const top = SCHOOLS.filter(s => s.t === 'vuz' && s.s != null).sort((a, b) => b.s - a.s).slice(0, 5);
  $('#topList').innerHTML = top.map((s, i) => `
    <li>
      <span class="n">${i + 1}.</span>
      <span><a href="vuzi.html?school=${encodeURIComponent(s.id)}">${escapeHtml(s.n)}</a>
        <small>${escapeHtml(s.c)}</small></span>
      <span class="sc">${s.s}<small> б. · ориентир</small></span>
    </li>`).join('');

  const catCount = {};
  SCHOOLS.forEach(s => { catCount[s.cat] = (catCount[s.cat] || 0) + 1; });
  $('#dirList').innerHTML = CATEGORIES.filter(c => catCount[c.key]).map(c => `
    <li class="reveal-up">
      <a class="dir-card" href="vuzi.html?cat=${c.key}">
        <span class="icon-box">${icon(c.icon)}</span>
        <span><b>${c.name}</b><span>${catCount[c.key]} заведения</span></span>
      </a>
    </li>`).join('');

  loadPortraits();
}

/* ---------- Страница вузов ---------- */
function initVuzi() {
  renderStats();
  const state = {
    q: new URLSearchParams(location.search).get('q') || '',
    type: 'all',
    sort: 'default',
    cat: new URLSearchParams(location.search).get('cat') || '',
    city: new URLSearchParams(location.search).get('city') || '',
    subj: '',
    favOnly: false,
    fav: store.get('fav', []),
  };

  /* Мои баллы */
  const egeKeys = ['rus', 'math', 'phys', 'inf', 'soc', 'hist', 'eng', 'chem', 'bio'];
  const egeInputs = $('#egeInputs');
  egeInputs.innerHTML = egeKeys.map(k => `
    <label class="score-field">
      <span>${SUBJECTS[k]}</span>
      <input type="number" min="0" max="100" data-ege="${k}" placeholder="—" inputmode="numeric">
    </label>`).join('');

  const updateSummary = () => {
    const s = store.get('scores', {});
    const filled = egeKeys.filter(k => Number(s[k]) > 0).length;
    $('#scoresSummary').textContent = filled
      ? `· ${filled} предм. ЕГЭ${s.gpa ? ' + аттестат' : ''}`
      : (s.gpa ? '· аттестат указан' : '· не указаны');
  };
  const fillScores = () => {
    const s = store.get('scores', {});
    egeInputs.querySelectorAll('input').forEach(inp => { inp.value = s[inp.dataset.ege] ?? ''; });
    $('#gpaInput').value = s.gpa ?? '';
    updateSummary();
  };
  fillScores();

  egeInputs.addEventListener('input', () => {
    const s = store.get('scores', {});
    egeInputs.querySelectorAll('input').forEach(inp => {
      s[inp.dataset.ege] = inp.value === '' ? 0 : Math.max(0, Math.min(100, Number(inp.value) || 0));
    });
    store.set('scores', s); updateSummary(); render();
  });
  $('#gpaInput').addEventListener('input', e => {
    const s = store.get('scores', {});
    s.gpa = e.target.value === '' ? 0 : Math.min(5, Math.max(2, Number(e.target.value) || 0));
    store.set('scores', s); updateSummary(); render();
  });
  $('#clearScores').addEventListener('click', () => { store.set('scores', {}); fillScores(); render(); });

  /* Чипсы направлений */
  const catChips = $('#catChips');
  const catCount = {};
  SCHOOLS.forEach(s => { catCount[s.cat] = (catCount[s.cat] || 0) + 1; });
  catChips.innerHTML =
    `<button type="button" class="chip" data-cat="" aria-pressed="${state.cat === ''}">Все</button>` +
    CATEGORIES.filter(c => catCount[c.key]).map(c => `
      <button type="button" class="chip" data-cat="${c.key}" aria-pressed="${state.cat === c.key}">
        ${c.name} <span class="count">${catCount[c.key]}</span>
      </button>`).join('');
  catChips.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = state.cat === btn.dataset.cat ? '' : btn.dataset.cat;
    syncChips(catChips, 'data-cat', state.cat);
    render();
  });

  /* Чипсы городов */
  const cityChips = $('#cityChips');
  const cityCount = {};
  SCHOOLS.forEach(s => { cityCount[s.c] = (cityCount[s.c] || 0) + 1; });
  const topCities = Object.keys(cityCount).filter(c => cityCount[c] >= 2)
    .sort((a, b) => cityCount[b] - cityCount[a]).slice(0, 14);
  cityChips.innerHTML =
    `<button type="button" class="chip" data-city="" aria-pressed="${state.city === ''}">Все</button>` +
    topCities.map(c => `
      <button type="button" class="chip" data-city="${escapeHtml(c)}" aria-pressed="${state.city === c}">
        ${escapeHtml(c)} <span class="count">${cityCount[c]}</span>
      </button>`).join('');
  cityChips.addEventListener('click', e => {
    const btn = e.target.closest('[data-city]');
    if (!btn) return;
    state.city = state.city === btn.dataset.city ? '' : btn.dataset.city;
    syncChips(cityChips, 'data-city', state.city);
    render();
  });

  /* Чипсы предметов */
  const subjChips = $('#subjChips');
  const subjCount = {};
  SCHOOLS.forEach(s => s.sub.forEach(k => { subjCount[k] = (subjCount[k] || 0) + 1; }));
  subjChips.innerHTML = Object.keys(SUBJECTS).filter(k => subjCount[k]).map(k => `
    <button type="button" class="chip" data-subj="${k}" aria-pressed="false">${SUBJECTS[k]}</button>`).join('');
  subjChips.addEventListener('click', e => {
    const btn = e.target.closest('[data-subj]');
    if (!btn) return;
    state.subj = state.subj === btn.dataset.subj ? '' : btn.dataset.subj;
    syncChips(subjChips, 'data-subj', state.subj);
    render();
  });

  function syncChips(box, attr, active) {
    box.querySelectorAll('[' + attr + ']').forEach(b =>
      b.setAttribute('aria-pressed', String(b.getAttribute(attr) === active)));
  }

  /* Тип и сортировка */
  $('#typeSeg').addEventListener('click', e => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    state.type = btn.dataset.type;
    $$('#typeSeg [data-type]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.type === state.type)));
    render();
  });
  initCustomSelect($('#sort'), v => { state.sort = v; render(); });

  /* Поиск */
  const qInput = $('#q');
  qInput.value = state.q;
  qInput.addEventListener('input', () => { state.q = qInput.value; render(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== qInput) { e.preventDefault(); qInput.focus(); }
  });

  /* Избранное */
  const favToggle = $('#favToggle');
  favToggle.addEventListener('click', () => {
    state.favOnly = !state.favOnly;
    favToggle.setAttribute('aria-pressed', String(state.favOnly));
    render();
  });
  $('#favCount').textContent = state.fav.length;
  favToggle.setAttribute('aria-pressed', String(state.favOnly));

  $('#resetFilters').addEventListener('click', () => {
    Object.assign(state, { q: '', type: 'all', cat: '', city: '', subj: '', favOnly: false, sort: 'default' });
    qInput.value = ''; 
    syncChips(catChips, 'data-cat', '');
    syncChips(cityChips, 'data-city', '');
    syncChips(subjChips, 'data-subj', '');
    $$('#typeSeg [data-type]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.type === 'all')));
    favToggle.setAttribute('aria-pressed', 'false');
    render();
  });

  /* Диалог */
  const dialog = $('#schoolDialog');
  const openDialog = school => {
    const ch = chanceInfo(school);
    const maps = schoolMapLinks(school);
    const score = scoreMeta(school);
    const details = getSchoolDetails(school);
    const category = CATEGORIES.find(c => c.key === school.cat);
    const examRows = (school.sub || []).map(k =>
      `<tr><td>${escapeHtml(SUBJECTS[k] || k)}</td></tr>`
    ).join('');
    $('#dialogBody').innerHTML = `
      <button type="button" class="dialog-close" data-close aria-label="Закрыть">${icon('i-x')}</button>
      <span class="tag ${TYPE_CLASS[school.t]}">${TYPE_LABEL[school.t]}</span>
      ${details.ownership === 'private' ? '<span class="ownership-tag">Частное учреждение</span>' : ''}
      <h2 id="dlgTitle">${escapeHtml(school.n)}</h2>
      <p class="card-city">${icon('i-pin')} ${escapeHtml(school.c)}</p>
      <p class="dialog-desc">${escapeHtml(school.d || 'Описание заведения уточняется на официальном сайте.')}</p>

      <section class="school-profile-section" aria-label="Основная информация">
        <h3>О заведении</h3>
        <dl class="school-profile-grid">
          <div><dt>Тип</dt><dd>${TYPE_LABEL[school.t]}</dd></div>
          <div><dt>Форма собственности</dt><dd>${details.ownership === 'private' ? 'Частное' : details.ownership === 'public' ? 'Государственное / муниципальное' : 'Требует подтверждения'}</dd></div>
          <div><dt>Город</dt><dd>${escapeHtml(school.c)}</dd></div>
          <div><dt>Профиль</dt><dd>${escapeHtml(category ? category.name : 'Не указан')}</dd></div>
          <div><dt>Последняя проверка карточки</dt><dd>${details.verifiedAt ? escapeHtml(new Date(details.verifiedAt + "T00:00:00").toLocaleDateString("ru-RU")) : "Дата проверки не указана"}</dd></div>
          <div><dt>Источник сведений</dt><dd>${details.sourceUrl ? '<a href="' + escapeHtml(details.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Официальный источник</a>' : 'Не указан'}</dd></div>
          <div><dt>Официальный сайт</dt><dd><a href="https://${escapeHtml(school.u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(school.u)} ${icon('i-ext')}</a></dd></div>
        </dl>
      </section>

      <section class="school-profile-section" aria-label="Образовательные программы">
        <h3>Чему здесь обучают</h3>
        ${(details.programs || []).length
          ? '<ul class="catalog-program-list">' + details.programs.map(program => '<li>' + escapeHtml(program) + '</li>').join('') + '</ul>'
          : '<p class="school-profile-hint">' + escapeHtml(school.d || 'Перечень программ уточняется на официальном сайте учреждения.') + '</p>'}
      </section>

      <section class="school-profile-section" aria-label="Бюджетные места">
        <h3>Бюджетные места</h3>
        ${renderBudgetPlaces(details)}
      </section>

      <section class="school-profile-section" aria-label="Стоимость платного обучения">
        <h3>Платное обучение</h3>
        ${renderTuition(details)}
        <p class="school-profile-hint">Если опубликована только годовая цена, месячная сумма показана как расчётный эквивалент (годовая стоимость ÷ 12), а не как обещание ежемесячной оплаты. Фактический график платежей смотрите в договоре.</p>
      </section>

      <section class="school-profile-section" aria-label="Информация о поступлении">
        <h3>Поступление и баллы</h3>
        <div class="d-grid">
          <div class="d-cell">
            <dt>${escapeHtml(score.label)}</dt>
            <dd class="school-score-value">${escapeHtml(score.value)}</dd>
            <p class="score-source-note">${escapeHtml(score.note)}</p>
          </div>
          <div class="d-cell">
            <dt>Оценка твоих шансов</dt>
            <dd class="chance ${ch.cls}" style="font-size:1rem">${escapeHtml(ch.text)}</dd>
          </div>
        </div>
        <p class="school-profile-hint">Проходной балл — это результат последнего зачисленного абитуриента. Он отличается по направлению, форме обучения, основе (бюджет/платное) и году приёма. Для колледжей конкурс обычно зависит от среднего балла аттестата и правил конкретного набора.</p>
        <a class="link-btn" href="${maps.admissions}" target="_blank" rel="noopener noreferrer">Найти официальные проходные баллы и правила приёма ${icon('i-ext')}</a>
      </section>

      <section class="school-profile-section">
        <h3>Какие экзамены учитывать</h3>
        <table class="d-table">
          <caption>${school.t === 'college' ? 'Предметы / вступительные испытания из каталога' : 'Предметы ЕГЭ из каталога'}</caption>
          <tbody>${examRows || '<tr><td>Уточни перечень на сайте приёмной комиссии</td></tr>'}</tbody>
        </table>
        <p class="school-profile-hint">Перечень предметов может отличаться в зависимости от выбранной образовательной программы. Перед подачей документов проверь правила приёма текущего года.</p>
      </section>

      <section class="school-profile-section">
        <h3>Адрес и расположение</h3>
        <p class="school-profile-hint">У крупных вузов и колледжей может быть несколько корпусов и кампусов. Открой поиск на карте и выбери нужный корпус по адресу из официального сайта.</p>
        <div class="dialog-actions map-actions">
          <a class="btn btn-primary" href="${maps.yandex}" target="_blank" rel="noopener noreferrer">Яндекс Карты ${icon('i-ext')}</a>
          <a class="btn" href="${maps.twoGis}" target="_blank" rel="noopener noreferrer">2ГИС ${icon('i-ext')}</a>
        </div>
      </section>

      <div class="dialog-actions">
        <a class="btn" href="https://${escapeHtml(school.u)}" target="_blank" rel="noopener noreferrer">Официальный сайт ${icon('i-ext')}</a>
        <button type="button" class="btn" data-close>Закрыть</button>
      </div>`;
    dialog.showModal();
  };
    dialog.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
  });

  /* Рендер карточек */
  const cards = $('#cards');
  function render() {
    const q = state.q.trim().toLowerCase();
    const list = SCHOOLS.filter(s => {
      if (state.type !== 'all' && s.t !== state.type) return false;
      if (state.cat && s.cat !== state.cat) return false;
      if (state.city && s.c !== state.city) return false;
      if (state.subj && !s.sub.includes(state.subj)) return false;
      if (state.favOnly && !state.fav.includes(s.id)) return false;
      if (q && !(s.n.toLowerCase().includes(q) || s.c.toLowerCase().includes(q))) return false;
      return true;
    });
    const sorters = {
      default:      (a, b) => (state.fav.includes(b.id) - state.fav.includes(a.id)) || b.s - a.s,
      chance:       (a, b) => (state.fav.includes(b.id) - state.fav.includes(a.id)) || a.s - b.s,
      'score-desc': (a, b) => b.s - a.s,
      'score-asc':  (a, b) => a.s - b.s,
      name:         (a, b) => a.n.localeCompare(b.n, 'ru'),
      city:         (a, b) => a.c.localeCompare(b.c, 'ru') || a.n.localeCompare(b.n, 'ru'),
    };
    list.sort(sorters[state.sort] || sorters.default);

    $('#found').textContent = list.length;
    $('#resetFilters').hidden = !(state.q || state.type !== 'all' || state.cat || state.city || state.subj || state.favOnly);

    if (!list.length) {
      cards.innerHTML = `<div class="empty"><b>Ничего не найдено.</b><br>
        Попробуй изменить запрос или сбросить фильтры.</div>`;
      return;
    }

    cards.innerHTML = list.map((s, i) => {
      const ch = chanceInfo(s);
      const isFav = state.fav.includes(s.id);
      const cat = CATEGORIES.find(c => c.key === s.cat);
      const details = getSchoolDetails(s);
      return `
      <article class="card" style="--i:${i}">
        <div class="card-cover" data-photo="${escapeHtml(s.n)}" style="--hue:${HUES[s.cat] ?? 250}">
          <span class="cover-city">${escapeHtml(s.c)}</span>
          ${cat ? `<svg class="cover-icon" aria-hidden="true"><use href="#${cat.icon}"/></svg>` : ''}
        </div>
        <div class="card-body">
          <div class="card-top">
            <span class="tag ${TYPE_CLASS[s.t]}">${TYPE_LABEL[s.t]}</span>
      ${details.ownership === 'private' ? '<span class="ownership-tag">Частное учреждение</span>' : ''}
            ${cat ? `<span class="card-cat">${icon(cat.icon)} ${cat.name}</span>` : ''}
            <button type="button" class="fav-btn" data-fav="${s.id}" aria-pressed="${isFav}"
              aria-label="В избранное">${icon('i-star')}</button>
          </div>
          <button type="button" class="card-open" data-open="${s.id}">${escapeHtml(s.n)}</button>
          <dl class="facts">
            <div><dt>${s.t === 'college' ? 'Ориентир аттестата' : 'Ориентир суммы ЕГЭ'} · требует проверки</dt>
              <dd class="score">${s.s == null ? '—' : s.s}<small>${s.t === 'college' ? ' / 5' : ''}</small></dd></div>
            <div><dt class="chance ${ch.cls}">${ch.text}</dt></div>
          </dl>
        </div>
      </article>`;
    }).join('');
    initCardPhotos();
  }

  cards.addEventListener('click', e => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const id = favBtn.dataset.fav;
      const i = state.fav.indexOf(id);
      if (i === -1) state.fav.push(id); else state.fav.splice(i, 1);
      store.set('fav', state.fav);
      favBtn.setAttribute('aria-pressed', String(i === -1));
      $('#favCount').textContent = state.fav.length;
      return;
    }
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      const school = SCHOOLS.find(s => s.id === openBtn.dataset.open);
      if (school) openDialog(school);
    }
  });

  /* Открытие конкретного заведения из ссылки */
  const schoolParam = new URLSearchParams(location.search).get('school');
  if (schoolParam) {
    const school = SCHOOLS.find(s => s.id === schoolParam);
    if (school) setTimeout(() => openDialog(school), 100);
  }
  render();
}

/* ---------- Страница подготовки ---------- */
function initExams() {
  renderStats();
  const done = store.get('done', {});
  let current = Object.keys(EXAM_TOPICS)[0];
  let sidebarAnim = true;
  const subjectList = $('#subjectList');
  const panel = $('#subjectPanel');

  const subjectMeta = key => {
    const list = EXAM_TOPICS[key].topics;
    return { n: list.filter(t => done[key + ':' + t]).length, total: list.length };
  };

  function renderSidebar() {
    subjectList.innerHTML = Object.entries(EXAM_TOPICS).map(([key, sub], i) => {
      const { n, total } = subjectMeta(key);
      return `
      <button type="button" style="--i:${i}"
        class="subject-btn ${n === total ? 'done' : ''}${sidebarAnim ? ' in' : ''}"
        data-sub="${key}" aria-current="${key === current}">
        <span>${sub.name}</span><span class="cnt">${n}/${total}</span>
      </button>`;
    }).join('');
    sidebarAnim = false;
  }

  function renderPanel() {
    const sub = EXAM_TOPICS[current];
    const { n, total } = subjectMeta(current);
    panel.innerHTML = `
      <div class="panel-head">
        <h2>${sub.name} <span class="muted" style="font-size:1rem">· ${sub.exam}</span></h2>
        <span class="muted">${n} из ${total}</span>
      </div>
      <ul class="topics">
        ${sub.topics.map((t, i) => {
          const key = current + ':' + t;
          const checked = done[key] ? 'checked' : '';
          return `
          <li style="--i:${i}">
            <div class="topic-row">
              <label class="topic">
                <input type="checkbox" data-topic="${escapeHtml(key)}" ${checked}>
                <span class="box">${icon('i-check')}</span>
                <span class="topic-text"><span class="topic-name">${t}</span></span>
              </label>
              <button type="button" class="drill-btn" data-drill="${escapeHtml(key)}">конспект + практика</button>
            </div>
          </li>`;
        }).join('')}
      </ul>`;
    panel.querySelectorAll('[data-topic]').forEach(inp => {
      inp.addEventListener('change', () => {
        done[inp.dataset.topic] = inp.checked;
        store.set('done', done);
        renderSidebar(); renderOverall();
      });
    });
  }

  function renderOverall() {
    const total = Object.values(EXAM_TOPICS).reduce((n, s) => n + s.topics.length, 0);
    const n = Object.values(done).filter(Boolean).length;
    const pct = total ? Math.round(n / total * 100) : 0;
    $('#overallPct').textContent = pct + '%';
    $('#overallLabel').textContent = `пройдено тем из ${total}`;
    $('#overallBar').style.transform = `scaleX(${pct / 100})`;
  }

  subjectList.addEventListener('click', e => {
    const btn = e.target.closest('[data-sub]');
    if (!btn) return;
    current = btn.dataset.sub;
    renderSidebar(); renderPanel();
  });

  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-drill]');
    if (b && window.openDrill) openDrill(b.dataset.drill);
  });

  $('#resetTopics').addEventListener('click', () => {
    store.set('done', {});
    Object.keys(done).forEach(k => delete done[k]);
    renderSidebar(); renderPanel(); renderOverall();
  });

  renderSidebar(); renderPanel(); renderOverall();
}

/* ---------- Точка входа ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Restore authenticated users' cloud scores/progress before rendering page state.
  if (window.studyGuideAuthReady) {
    try { await window.studyGuideAuthReady; } catch {}
  }
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'vuzi') initVuzi();
  else if (page === 'exams') initExams();
  initReveal();
});
