'use strict';

/* ================= Утилиты ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = v => String(v).replace(/[&<>"']/g, c => ESC[c]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е');
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* приватный режим / нет места */ }
  }
};

/* ================= Данные ================= */
// subjects: "Мат., Рус., Общ./Инф." → [["Мат."], ["Рус."], ["Общ.", "Инф."]]
const SCHOOLS = database.map((item, idx) => {
  const groups = item.subjects.split(',').map(s => s.trim()).filter(Boolean)
    .map(s => s.split('/').map(x => x.trim()));
  const isVuz = item.type === 'vuz';
  return {
    ...item, idx, isVuz, groups,
    flat: groups.flat(),
    score: parseFloat(item.score.replace(',', '.').replace(/[^\d.]/g, '')) || 0,
    max: isVuz ? groups.length * 100 : 5,
    search: norm(`${item.name} ${item.city} ${item.desc}`)
  };
});

const catOf = s => CATEGORIES[s.cat] || { label: 'Другое', icon: 'compass' };
const subjName = k => SUBJECT_SHORT[k] || k;
const groupLabel = g => g.map(subjName).join(' или ');
const scoreText = s => s.isVuz ? `~${s.score}` : `от ${s.score.toFixed(1)}`;

function fillStats() {
  const vuz = SCHOOLS.filter(s => s.isVuz).length;
  const stats = {
    total: SCHOOLS.length,
    vuz,
    college: SCHOOLS.length - vuz,
    cities: new Set(SCHOOLS.map(s => s.city)).size,
    topics: Object.values(subjectsData).reduce((n, s) => n + s.topics.length, 0)
  };
  document.querySelectorAll('[data-stat]').forEach(el => {
    if (el.dataset.stat in stats) el.textContent = stats[el.dataset.stat];
  });
}

/* ================= Главная ================= */
function initHome() {
  const top = SCHOOLS.filter(s => s.isVuz).sort((a, b) => b.score - a.score).slice(0, 5);
  $('#topList').innerHTML = top.map((s, i) => `
    <li>
      <span class="n">${i + 1}</span>
      <span>
        <a href="vuzi.html?q=${encodeURIComponent(s.name)}">${esc(s.name)}</a>
        <small>${esc(s.city)} · ${esc(catOf(s).label)}</small>
      </span>
      <span class="sc">~${s.score}<small> / ${s.max}</small></span>
    </li>`).join('');

  $('#dirList').innerHTML = Object.entries(CATEGORIES).map(([key, c]) => {
    const n = SCHOOLS.filter(s => s.cat === key).length;
    return `<li><a class="dir" href="vuzi.html?cat=${key}">${icon(c.icon)}
      <span><b>${esc(c.label)}</b><span>${n} ${plural(n, 'заведение', 'заведения', 'заведений')}</span></span></a></li>`;
  }).join('');
}

/* ================= Вузы и колледжи ================= */
function initVuzi() {
  const els = {
    q: $('#q'), sort: $('#sort'), type: $('#typeSeg'), cats: $('#catChips'), subjs: $('#subjChips'),
    cards: $('#cards'), found: $('#found'), favToggle: $('#favToggle'), favCount: $('#favCount'),
    reset: $('#resetFilters'), dialog: $('#schoolDialog'), dialogBody: $('#dialogBody'),
    ege: $('#egeInputs'), gpa: $('#gpaInput'), summary: $('#scoresSummary'), panel: $('#scoresPanel')
  };

  const SORTS = ['default', 'chance', 'score-desc', 'score-asc', 'name', 'city'];
  const state = { q: '', type: 'all', cat: '', subj: new Set(), sort: 'default', fav: false };
  const favs = new Set(Array.isArray(store.get('nav_favs', [])) ? store.get('nav_favs', []) : []);
  let my = store.get('nav_scores', {});
  if (!my || typeof my !== 'object') my = {};

  const usedSubj = Object.keys(SUBJECT_SHORT).filter(k => SCHOOLS.some(s => s.flat.includes(k)));

  /* --- состояние из адресной строки --- */
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') || '';
  if (['vuz', 'college'].includes(params.get('type'))) state.type = params.get('type');
  if (Object.hasOwn(CATEGORIES, params.get('cat') || '')) state.cat = params.get('cat');
  (params.get('subj') || '').split(',').forEach(k => { if (usedSubj.includes(k)) state.subj.add(k); });
  if (SORTS.includes(params.get('sort'))) state.sort = params.get('sort');
  state.fav = params.get('fav') === '1';

  function syncURL() {
    const p = new URLSearchParams();
    if (state.q.trim()) p.set('q', state.q.trim());
    if (state.type !== 'all') p.set('type', state.type);
    if (state.cat) p.set('cat', state.cat);
    if (state.subj.size) p.set('subj', [...state.subj].join(','));
    if (state.sort !== 'default') p.set('sort', state.sort);
    if (state.fav) p.set('fav', '1');
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  /* --- элементы управления --- */
  els.cats.innerHTML = `<button type="button" class="chip" data-cat="">Все</button>` +
    Object.entries(CATEGORIES).map(([k, c]) =>
      `<button type="button" class="chip" data-cat="${k}">${esc(c.label)}</button>`).join('');
  els.subjs.innerHTML = usedSubj.map(k =>
    `<button type="button" class="chip" data-subj="${esc(k)}">${esc(SUBJECT_SHORT[k])}</button>`).join('');
  els.ege.innerHTML = usedSubj.map(k => `
    <label class="score-field">
      <span>${esc(SUBJECT_SHORT[k])}</span>
      <input type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="—"
             data-score="${esc(k)}" value="${esc(my[k] ?? '')}">
    </label>`).join('');
  els.gpa.value = my.gpa ?? '';
  if (Object.keys(my).length) els.panel.open = true;

  /* --- баллы и шансы --- */
  const hasEge = () => usedSubj.some(k => my[k] > 0);

  function chance(s) {
    if (!s.isVuz) {
      if (!my.gpa) return null;
      const diff = Math.round((my.gpa - s.score) * 100) / 100;
      return { level: diff >= 0 ? 'ok' : diff >= -0.2 ? 'close' : 'low', diff, total: my.gpa };
    }
    if (!hasEge()) return null;
    let total = 0;
    const missing = [];
    s.groups.forEach(g => {
      const vals = g.map(k => my[k] || 0);
      const best = Math.max(...vals);
      if (best > 0) total += best; else missing.push(g);
    });
    if (missing.length) return { level: 'unknown', missing };
    const diff = total - s.score;
    return { level: diff >= 0 ? 'ok' : diff >= -15 ? 'close' : 'low', diff, total };
  }

  function chanceText(s, c) {
    if (c.level === 'unknown') return `Нет баллов: ${c.missing.map(groupLabel).join(', ')}`;
    const d = s.isVuz ? Math.abs(c.diff) : Math.abs(c.diff).toLocaleString('ru-RU');
    if (c.level === 'ok') return s.isVuz ? `Проходишь: ${c.total} из ${s.max}, запас ${d}` : `Проходишь, запас ${d}`;
    return `${c.level === 'close' ? 'Близко' : 'Пока мало'}: не хватает ${d}`;
  }

  function updateSummary() {
    const n = usedSubj.filter(k => my[k] > 0).length;
    const parts = [];
    if (n) parts.push(`ЕГЭ: ${n} ${plural(n, 'предмет', 'предмета', 'предметов')}`);
    if (my.gpa) parts.push(`аттестат: ${String(my.gpa).replace('.', ',')}`);
    els.summary.textContent = parts.length ? `· ${parts.join(' · ')}` : '· введи баллы, чтобы увидеть шансы';
  }

  function saveScores() { store.set('nav_scores', my); updateSummary(); render(); }

  els.ege.addEventListener('input', e => {
    const input = e.target.closest('[data-score]');
    if (!input) return;
    const v = Math.round(Number(input.value));
    if (input.value === '' || !Number.isFinite(v) || v <= 0) delete my[input.dataset.score];
    else my[input.dataset.score] = Math.min(v, 100);
    saveScores();
  });
  els.ege.addEventListener('change', e => {
    const input = e.target.closest('[data-score]');
    if (input) input.value = my[input.dataset.score] ?? '';
  });
  els.gpa.addEventListener('input', () => {
    const v = Number(els.gpa.value);
    if (!els.gpa.value || !(v >= 2 && v <= 5)) delete my.gpa; else my.gpa = Math.round(v * 100) / 100;
    saveScores();
  });
  $('#clearScores').addEventListener('click', () => {
    my = {};
    els.ege.querySelectorAll('input').forEach(i => { i.value = ''; });
    els.gpa.value = '';
    saveScores();
  });

  /* --- фильтрация и сортировка --- */
  const RANK = { ok: 0, close: 1, low: 2, unknown: 3 };

  function getList() {
    const q = norm(state.q.trim());
    const res = SCHOOLS.filter(s =>
      (state.type === 'all' || s.type === state.type) &&
      (!state.cat || s.cat === state.cat) &&
      (!state.fav || favs.has(s.name)) &&
      (!q || s.search.includes(q)) &&
      [...state.subj].every(k => s.flat.includes(k)));

    const vuzFirst = (a, b) => Number(b.isVuz) - Number(a.isVuz);
    const byName = (a, b) => a.name.localeCompare(b.name, 'ru');

    switch (state.sort) {
      case 'score-desc': res.sort((a, b) => vuzFirst(a, b) || b.score - a.score); break;
      case 'score-asc':  res.sort((a, b) => vuzFirst(a, b) || a.score - b.score); break;
      case 'name':       res.sort(byName); break;
      case 'city':       res.sort((a, b) => a.city.localeCompare(b.city, 'ru') || byName(a, b)); break;
      case 'chance': {
        const ch = new Map(res.map(s => [s, chance(s)]));
        const rank = s => (ch.get(s) ? RANK[ch.get(s).level] : 4);
        const rel = s => { const c = ch.get(s); return c && 'diff' in c ? c.diff / s.max : -1e9; };
        res.sort((a, b) => rank(a) - rank(b) || rel(b) - rel(a));
        break;
      }
    }
    return res;
  }

  /* --- рендер --- */
  const favLabel = (s, on) => esc(`${on ? 'Убрать из избранного' : 'Добавить в избранное'}: ${s.name}`);
  const subjTags = s => s.groups.map(g =>
    `<span class="subj" title="${esc(groupLabel(g))}">${esc(g.join('/'))}</span>`).join('');

  function card(s) {
    const cat = catOf(s), c = chance(s), on = favs.has(s.name);
    return `<article class="card">
      <div class="card-top">
        <span class="tag tag-${esc(s.type)}">${s.isVuz ? 'Вуз' : 'Колледж'}</span>
        <span class="card-cat">${icon(cat.icon)}${esc(cat.label)}</span>
        <button type="button" class="fav-btn" data-fav="${s.idx}" aria-pressed="${on}" aria-label="${favLabel(s, on)}">${icon('star')}</button>
      </div>
      <h3><button type="button" class="card-open" data-open="${s.idx}">${esc(s.name)}</button></h3>
      <p class="card-city">${icon('pin')}${esc(s.city)}</p>
      <p class="card-desc">${esc(s.desc)}</p>
      <dl class="facts">
        <div><dt>${s.isVuz ? 'Проходной ЕГЭ' : 'Балл аттестата'}</dt>
          <dd class="score">${scoreText(s)}${s.isVuz ? `<small> / ${s.max}</small>` : ''}</dd></div>
        <div><dt>Предметы</dt><dd>${subjTags(s)}</dd></div>
      </dl>
      ${c ? `<p class="chance chance-${c.level}">${esc(chanceText(s, c))}</p>` : ''}
    </article>`;
  }

  const isFiltered = () => Boolean(state.q.trim() || state.type !== 'all' || state.cat || state.subj.size || state.fav);

  function syncControls() {
    els.type.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.type === state.type));
    els.cats.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === state.cat));
    els.subjs.querySelectorAll('[data-subj]').forEach(b => b.setAttribute('aria-pressed', state.subj.has(b.dataset.subj)));
    if (els.q.value !== state.q) els.q.value = state.q;
    els.sort.value = state.sort;
    els.favToggle.setAttribute('aria-pressed', state.fav);
    els.favCount.textContent = favs.size;
    els.reset.hidden = !isFiltered();
  }

  function render() {
    const items = getList();
    els.found.textContent = items.length;
    els.cards.innerHTML = items.length
      ? items.map(card).join('')
      : `<div class="empty"><p><b>Ничего не найдено</b></p>
         <p>Измени запрос или <button type="button" class="link-btn" data-reset>сбрось фильтры</button>.</p></div>`;
    syncControls();
    syncURL();
  }

  /* --- избранное --- */
  function syncFavButtons() {
    document.querySelectorAll('[data-fav]').forEach(b => {
      const s = SCHOOLS[b.dataset.fav], on = favs.has(s.name);
      b.setAttribute('aria-pressed', on);
      if (b.classList.contains('fav-btn')) b.setAttribute('aria-label', `${on ? 'Убрать из избранного' : 'Добавить в избранное'}: ${s.name}`);
      const label = b.querySelector('.fav-label');
      if (label) label.textContent = on ? 'В избранном' : 'В избранное';
    });
    els.favCount.textContent = favs.size;
  }

  function toggleFav(s) {
    if (favs.has(s.name)) favs.delete(s.name); else favs.add(s.name);
    store.set('nav_favs', [...favs]);
    if (state.fav) render();
    syncFavButtons();
  }

  /* --- модальное окно --- */
  function openDialog(s) {
    const cat = catOf(s), c = chance(s), on = favs.has(s.name);
    const yours = s.isVuz ? (c && 'total' in c ? `${c.total} <small>/ ${s.max}</small>` : '—') : (my.gpa ?? '—');
    const rows = s.groups.map(g => {
      const vals = g.map(k => my[k] || 0).filter(Boolean);
      return `<tr><td>${esc(groupLabel(g))}</td><td>${vals.length ? Math.max(...vals) : '—'}</td></tr>`;
    }).join('');
    const query = encodeURIComponent(`${s.name} ${s.city} приёмная комиссия`);

    els.dialogBody.innerHTML = `
      <button type="button" class="dialog-close" data-close aria-label="Закрыть">${icon('x')}</button>
      <p class="card-top"><span class="tag tag-${esc(s.type)}">${s.isVuz ? 'Вуз' : 'Колледж'}</span>
        <span class="card-cat">${icon(cat.icon)}${esc(cat.label)}</span></p>
      <h2 id="dlgTitle">${esc(s.name)}</h2>
      <p class="card-city">${icon('pin')}${esc(s.city)}</p>
      <p class="dialog-desc">${esc(s.desc)}</p>
      <dl class="d-grid">
        <div class="d-cell"><dt>${s.isVuz ? 'Проходной балл' : 'Средний балл аттестата'}</dt>
          <dd>${scoreText(s)}${s.isVuz ? ` <small>/ ${s.max}</small>` : ''}</dd></div>
        <div class="d-cell"><dt>${s.isVuz ? 'Твоя сумма' : 'Твой балл'}</dt><dd>${yours}</dd></div>
      </dl>
      ${s.isVuz
        ? `<table class="d-table"><caption>Вступительные испытания</caption>
            <thead><tr><th scope="col">Предмет</th><th scope="col">Твой балл</th></tr></thead>
            <tbody>${rows}</tbody></table>`
        : `<p class="dialog-desc"><b>Профильные предметы:</b> ${esc(s.flat.map(subjName).join(', '))}. В колледжи обычно принимают по среднему баллу аттестата.</p>`}
      ${c ? `<p class="chance chance-${c.level}">${esc(chanceText(s, c))}</p>`
          : `<p class="fine">Введи свои баллы в блоке «Мои баллы», и здесь появится оценка шансов.</p>`}
      <div class="dialog-actions">
        <button type="button" class="btn" data-fav="${s.idx}" aria-pressed="${on}">${icon('star')}<span class="fav-label">${on ? 'В избранном' : 'В избранное'}</span></button>
        <a class="btn" href="https://yandex.ru/search/?text=${query}" target="_blank" rel="noopener noreferrer">Правила приёма ${icon('ext')}</a>
      </div>
      <p class="fine">Баллы ориентировочные, по прошлым годам. Точные условия смотри на официальном сайте заведения.</p>`;
    els.dialog.showModal();
  }

  /* --- события --- */
  els.q.addEventListener('input', () => { state.q = els.q.value; render(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
  els.type.addEventListener('click', e => {
    const b = e.target.closest('[data-type]');
    if (b) { state.type = b.dataset.type; render(); }
  });
  els.cats.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) { state.cat = state.cat === b.dataset.cat ? '' : b.dataset.cat; render(); }
  });
  els.subjs.addEventListener('click', e => {
    const b = e.target.closest('[data-subj]');
    if (!b) return;
    const k = b.dataset.subj;
    if (state.subj.has(k)) state.subj.delete(k); else state.subj.add(k);
    render();
  });
  els.favToggle.addEventListener('click', () => { state.fav = !state.fav; render(); });

  function resetFilters() {
    Object.assign(state, { q: '', type: 'all', cat: '', fav: false });
    state.subj.clear();
    render();
    els.q.focus();
  }
  els.reset.addEventListener('click', resetFilters);

  els.cards.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) return resetFilters();
    const fav = e.target.closest('[data-fav]');
    if (fav) return toggleFav(SCHOOLS[fav.dataset.fav]);
    const open = e.target.closest('[data-open]');
    if (open) openDialog(SCHOOLS[open.dataset.open]);
  });

  els.dialog.addEventListener('click', e => {
    if (e.target === els.dialog || e.target.closest('[data-close]')) return els.dialog.close();
    const fav = e.target.closest('[data-fav]');
    if (fav) toggleFav(SCHOOLS[fav.dataset.fav]);
  });

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !els.dialog.open && !e.target.closest('input, textarea, select, [contenteditable]')) {
      e.preventDefault();
      els.q.focus();
    }
  });

  updateSummary();
  render();
}

/* ================= Подготовка к экзаменам ================= */
const EXAM_META = {
  inf:  { subj: 'Инф.',  site: 'inf-ege'  },
  math: { subj: 'Мат.',  site: 'math-ege' },
  rus:  { subj: 'Рус.',  site: 'rus-ege'  },
  phys: { subj: 'Физ.',  site: 'phys-ege' },
  chem: { subj: 'Хим.',  site: 'chem-ege' },
  bio:  { subj: 'Био.',  site: 'bio-ege'  },
  soc:  { subj: 'Общ.',  site: 'soc-ege'  },
  hist: { subj: 'Ист.',  site: 'hist-ege' },
  eng:  { subj: 'Англ.', site: 'en-ege'   }
};

function initExams() {
  const nav = $('#subjectNav'), panel = $('#subjectPanel');
  const keys = Object.keys(subjectsData);
  const KEY = k => 'exam_progress_' + k; // тот же ключ, что раньше: старый прогресс сохранится

  const getDone = k => {
    const valid = new Set(subjectsData[k].topics.map(t => t.id));
    const arr = store.get(KEY(k), []);
    return Array.isArray(arr) ? arr.filter(id => valid.has(id)) : [];
  };
  const setDone = (k, ids) => store.set(KEY(k), ids);

  const fromHash = decodeURIComponent(location.hash.slice(1));
  const saved = store.get('nav_exam_subject', '');
  let current = keys.includes(fromHash) ? fromHash : keys.includes(saved) ? saved : keys[0];

  nav.innerHTML = keys.map(k => `
    <button type="button" class="subject-btn" data-key="${k}">
      <span>${esc(subjectsData[k].title)}</span><span class="cnt"></span>
    </button>`).join('');

  function updateCounts() {
    let all = 0, total = 0;
    keys.forEach(k => {
      const d = getDone(k).length, t = subjectsData[k].topics.length;
      all += d; total += t;
      const btn = nav.querySelector(`[data-key="${k}"]`);
      btn.querySelector('.cnt').textContent = `${d}/${t}`;
      btn.classList.toggle('done', t > 0 && d === t);
      if (k === current) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
    });
    const pct = total ? Math.round((all / total) * 100) : 0;
    $('#overallPct').textContent = `${pct}%`;
    $('#overallBar').style.width = `${pct}%`;
    $('#overallText').textContent = `Изучено ${all} из ${total} тем`;

    const d = getDone(current).length, t = subjectsData[current].topics.length;
    $('#subjCount').textContent = `${d} из ${t}`;
    $('#subjBar').style.width = `${t ? (d / t) * 100 : 0}%`;
    $('#toggleAll').textContent = d === t ? 'Снять все отметки' : 'Отметить все';
  }

  function renderPanel() {
    const subj = subjectsData[current], meta = EXAM_META[current] || {};
    const done = new Set(getDone(current));
    const n = meta.subj ? SCHOOLS.filter(s => s.flat.includes(meta.subj)).length : 0;

    panel.innerHTML = `
      <div class="panel-head"><h2>${esc(subj.title)}</h2><span class="muted" id="subjCount"></span></div>
      <div class="bar" aria-hidden="true"><span id="subjBar"></span></div>
      <ul class="topics">${subj.topics.map((t, i) => `
        <li><label class="topic">
          <input type="checkbox" data-id="${esc(t.id)}" ${done.has(t.id) ? 'checked' : ''}>
          <span class="box">${icon('check')}</span>
          <span class="topic-name">${esc(t.name)}</span>
          <span class="topic-num">${String(i + 1).padStart(2, '0')}</span>
        </label></li>`).join('')}
      </ul>
      <div class="panel-links">
        <button type="button" class="btn" id="toggleAll"></button>
        ${meta.site ? `<a class="btn" href="https://${meta.site}.sdamgia.ru/" target="_blank" rel="noopener noreferrer">Задания на «Решу ЕГЭ» ${icon('ext')}</a>` : ''}
        ${n ? `<a class="btn" href="vuzi.html?subj=${encodeURIComponent(meta.subj)}">Где нужен этот предмет: ${n}</a>` : ''}
      </div>`;
    updateCounts();
  }

  function select(k) {
    if (!keys.includes(k) || k === current) return;
    current = k;
    store.set('nav_exam_subject', k);
    history.replaceState(null, '', `#${k}`);
    renderPanel();
  }

  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-key]');
    if (b) select(b.dataset.key);
  });

  panel.addEventListener('change', e => {
    const cb = e.target.closest('input[data-id]');
    if (!cb) return;
    const ids = new Set(getDone(current));
    if (cb.checked) ids.add(cb.dataset.id); else ids.delete(cb.dataset.id);
    setDone(current, [...ids]);
    updateCounts();
  });

  panel.addEventListener('click', e => {
    if (!e.target.closest('#toggleAll')) return;
    const all = subjectsData[current].topics.map(t => t.id);
    const allDone = getDone(current).length === all.length;
    setDone(current, allDone ? [] : all);
    panel.querySelectorAll('input[data-id]').forEach(cb => { cb.checked = !allDone; });
    updateCounts();
  });

  $('#resetAll').addEventListener('click', () => {
    if (!confirm('Сбросить отметки по всем предметам? Это нельзя отменить.')) return;
    keys.forEach(k => { try { localStorage.removeItem(KEY(k)); } catch { /* ignore */ } });
    renderPanel();
  });

  window.addEventListener('hashchange', () => select(decodeURIComponent(location.hash.slice(1))));

  $('#resources').innerHTML = RESOURCES.map(r => `
    <li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
      <b>${esc(r.name)} ${icon('ext')}</b><span>${esc(r.desc)}</span>
    </a></li>`).join('');

  renderPanel();
}

/* ================= Запуск ================= */
fillStats();
const page = document.body.dataset.page;
if (page === 'home') initHome();
else if (page === 'vuzi') initVuzi();
else if (page === 'exams') initExams();
