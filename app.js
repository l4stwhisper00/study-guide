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

function icon(name, cls = 'icon') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;
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
    if (diff <= 0)   return { cls: 'chance-ok',    text: 'Проходишь с запасом' };
    if (diff <= 0.4) return { cls: 'chance-close', text: `Не хватает ~${diff.toFixed(1)} балла` };
    return { cls: 'chance-low', text: `Не хватает ${diff.toFixed(1)} балла` };
  }
  const required = school.sub || [];
  if (!required.length || required.some(k => !(Number(scores[k]) > 0))) {
    return { cls: 'chance-unknown', text: 'Укажи баллы по всем нужным ЕГЭ' };
  }
  const sum = required.reduce((n, k) => n + Number(scores[k]), 0);
  const diff = school.s - sum;
  if (diff <= 0)  return { cls: 'chance-ok',    text: `Проходишь по ориентиру (+${-diff})` };
  if (diff <= 20) return { cls: 'chance-close', text: `Не хватает ${diff} б. по ориентиру` };
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
    $('#dialogBody').innerHTML = `
      <button type="button" class="dialog-close" data-close aria-label="Закрыть">${icon('i-x')}</button>
      <h2 id="dlgTitle">${escapeHtml(school.n)}</h2>
      <p class="card-city">${icon('i-pin')} ${escapeHtml(school.c)}</p>
      <p class="dialog-desc">${escapeHtml(school.d)}</p>
      <dl class="d-grid">
        <div class="d-cell"><dt>${school.t === 'college' ? 'Ориентир аттестата' : 'Ориентир суммы ЕГЭ'}</dt>
          <dd>${school.s == null ? 'Нет проверенных данных' : `${school.s}<small>${school.t === 'college' ? ' аттестат' : ' ЕГЭ'}</small>`}</dd></div>
        <div class="d-cell"><dt>Шансы</dt>
          <dd class="chance ${ch.cls}" style="font-size:1rem">${ch.text}</dd></div>
      </dl>
      <table class="d-table">
        <caption>Нужные экзамены</caption>
        <tr><th>${school.t === 'college' ? 'Предметы' : 'ЕГЭ'}</th></tr>
        ${school.sub.map(k => `<tr><td>${SUBJECTS[k]}</td></tr>`).join('')}
      </table>
      <div class="dialog-actions">
        <a class="btn btn-primary" href="https://${school.u}" target="_blank" rel="noopener">
          Сайт ${school.t === 'college' ? 'колледжа' : 'вуза'} ${icon('i-ext')}</a>
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
      return `
      <article class="card" style="--i:${i}">
        <div class="card-cover" data-photo="${escapeHtml(s.n)}" style="--hue:${HUES[s.cat] ?? 250}">
          <span class="cover-city">${escapeHtml(s.c)}</span>
          ${cat ? `<svg class="cover-icon" aria-hidden="true"><use href="#${cat.icon}"/></svg>` : ''}
        </div>
        <div class="card-body">
          <div class="card-top">
            <span class="tag ${TYPE_CLASS[s.t]}">${TYPE_LABEL[s.t]}</span>
            ${cat ? `<span class="card-cat">${icon(cat.icon)} ${cat.name}</span>` : ''}
            <button type="button" class="fav-btn" data-fav="${s.id}" aria-pressed="${isFav}"
              aria-label="В избранное">${icon('i-star')}</button>
          </div>
          <button type="button" class="card-open" data-open="${s.id}">${escapeHtml(s.n)}</button>
          <dl class="facts">
            <div><dt>${s.t === 'college' ? 'Ориентир аттестата' : 'Ориентир суммы ЕГЭ'}</dt>
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
