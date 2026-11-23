/* Личный кабинет: локальная авторизация, профиль, заметки, калькулятор, курс */
'use strict';
const $a = s => document.querySelector(s);
const users = () => JSON.parse(localStorage.getItem('nav_users') || '{}');
const saveUsers = u => localStorage.setItem('nav_users', JSON.stringify(u));
const session = () => localStorage.getItem('nav_session');
const setSession = e => e ? localStorage.setItem('nav_session', e) : localStorage.removeItem('nav_session');

// Legacy SHA-256 is kept only to upgrade existing demo accounts at their next login.
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

const PBKDF2_ITERATIONS = 600000;

function bytesToHex(bytes) {
  return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function deriveDemoPasswordHash(password, saltHex) {
  if (!/^(?:[0-9a-f]{2}){16}$/i.test(saltHex)) {
    throw new Error('Некорректная локальная запись аккаунта.');
  }
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: PBKDF2_ITERATIONS,
    hash: 'SHA-256'
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}
const COVERS = [
  'linear-gradient(135deg,#6c5ce7,#a29bfe)', 'linear-gradient(135deg,#0f766e,#5fcf8a)',
  'linear-gradient(135deg,#b42318,#f0b35a)', 'linear-gradient(135deg,#1d4ed8,#60a5fa)',
  'linear-gradient(135deg,#7c3aed,#ec4899)', 'linear-gradient(135deg,#334155,#94a3b8)'];

let mode = 'login';
const me = () => users()[session()];
const patchMe = patch => { const u = users(); Object.assign(u[session()], patch); saveUsers(u); };

/* ---------- Вход / регистрация ---------- */
function initAuth() {
  $a('#authSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    mode = b.dataset.mode;
    $a('#authSeg').querySelectorAll('[data-mode]').forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)));
    $a('#pass2Wrap').hidden = mode === 'login';
    $a('#authSubmit').textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
  });
  $a('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $a('#authMsg'); msg.className = 'drill-msg'; msg.textContent = '';
    const fail = t => { msg.textContent = t; msg.className = 'drill-msg bad'; };
    const email = $a('#authEmail').value.trim().toLowerCase();
    const pass = $a('#authPass').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Похоже, в почте опечатка.');
    if (pass.length < 6) return fail('Пароль короче 6 символов.');
    const u = users();
    if (mode === 'reg') {
      if (u[email]) return fail('Такая почта уже зарегистрирована.');
      if (pass.length < 12) return fail('Для нового демо-профиля задай пароль минимум из 12 символов.');
      if (pass.length > 128) return fail('Пароль должен быть не длиннее 128 символов.');
      if (pass !== $a('#authPass2').value) return fail('Пароли не совпадают.');
      if (!crypto.subtle || !crypto.getRandomValues) return fail('Безопасное хеширование недоступно в этом браузере.');
      const salt = createSalt();
      const hash = await deriveDemoPasswordHash(pass, salt);
      u[email] = { hashVersion: 2, salt, hash, profile: { avatar: '', cover: 0, bio: '' }, notes: [], courses: [] };
      saveUsers(u); setSession(email);
      return enter();
    }
    if (!u[email]) return fail('Аккаунт не найден — зарегистрируйся.');
    if (!crypto.subtle) return fail('Безопасная проверка пароля недоступна в этом браузере.');

    let passwordValid = false;
    if (u[email].hashVersion === 2) {
      passwordValid = u[email].hash === await deriveDemoPasswordHash(pass, u[email].salt);
    } else {
      // Backward-compatible check for old browser-only demo accounts.
      passwordValid = u[email].hash === await sha256(String(u[email].salt || '') + pass);
      if (passwordValid) {
        const salt = createSalt();
        u[email] = { ...u[email], hashVersion: 2, salt, hash: await deriveDemoPasswordHash(pass, salt) };
        saveUsers(u);
      }
    }
    if (!passwordValid) return fail('Неверный пароль.');
    setSession(email); enter();
  });
}

/* ---------- Кабинет ---------- */
function enter() {
  $a('#authView').hidden = true;
  $a('#dashView').hidden = false;
  renderProfile(); renderProgress(); renderNotes(); initCalc(); initCourse();
}

function renderProfile() {
  const p = me().profile;
  $a('#profileEmail').textContent = session();
  $a('#profileBio').textContent = p.bio || 'Расскажи о себе в настройках профиля.';
  $a('#bioInput').value = p.bio || '';
  const img = $a('#avatarImg');
  img.src = p.avatar || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%236c5ce7%22/%3E%3Ctext x=%2220%22 y=%2226%22 font-size=%2218%22 fill=%22white%22 text-anchor=%22middle%22%3E:)%3C/text%3E%3C/svg%3E';
  $a('#profileHero').style.background = COVERS[p.cover || 0];
  $a('#coverPicker').innerHTML = COVERS.map((c, i) =>
    `<button type="button" class="cover ${i === (p.cover || 0) ? 'sel' : ''}" data-c="${i}" style="background:${c}" aria-label="Фон ${i + 1}"></button>`).join('');
}

function renderProgress() {
  const done = JSON.parse(localStorage.getItem('nav_done') || '{}');
  $a('#progressList').innerHTML = Object.entries(EXAM_TOPICS).map(([k, s]) => {
    const n = s.topics.filter(t => done[k + ':' + t]).length;
    const pct = Math.round(n / s.topics.length * 100);
    return `<div class="prog-row"><span>${s.name}</span><b>${n}/${s.topics.length}</b>
      <div class="bar"><span style="transform:scaleX(${pct / 100})"></span></div></div>`;
  }).join('');
}

function renderNotes() {
  const notes = me().notes;
  $a('#notesList').innerHTML = notes.length
    ? notes.map((n, i) => `<li><span>${n.text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</span>
        <button type="button" class="link-btn danger" data-del="${i}">удалить</button></li>`).join('')
    : '<li class="muted">Пока пусто.</li>';
}

function initCalc() {
  const RAW = { rus: 50, math: 32, phys: 32, inf: 27, soc: 29, hist: 25, eng: 58, chem: 34, bio: 28 };
  const sel = $a('#calcSubj');
  sel.innerHTML = Object.keys(RAW).map(k => `<option value="${k}">${SUBJECTS[k]}</option>`).join('');
  const upd = () => {
    const k = sel.value, raw = Number($a('#calcRaw').value) || 0;
    const test = Math.round(Math.min(raw, RAW[k]) / RAW[k] * 100);
    $a('#calcTest').textContent = raw ? test : '—';
    const s = JSON.parse(localStorage.getItem('nav_scores') || '{}');
    const sum = ['rus', 'math', 'phys', 'inf', 'soc', 'hist', 'eng', 'chem', 'bio']
      .reduce((n, x) => n + (Number(s[x]) || 0), 0);
    $a('#calcSum').textContent = sum ? `Сумма твоих сохранённых баллов ЕГЭ: ${sum}.` : 'Сохранённых баллов пока нет — впиши их на странице «Вузы».';
  };
  sel.addEventListener('change', upd);
  $a('#calcRaw').addEventListener('input', upd);
  upd();
}

function initCourse() {
  const box = $a('#courseSubjs');
  box.innerHTML = Object.entries(EXAM_TOPICS).map(([k, s]) =>
    `<button type="button" class="chip" data-cs="${k}" aria-pressed="false">${s.name}</button>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-cs]');
    if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  $a('#buildCourse').addEventListener('click', () => {
    const subs = [...box.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.cs);
    const weeks = Math.max(1, Math.min(24, Number($a('#courseWeeks').value) || 8));
    if (!subs.length) { $a('#courseOut').innerHTML = '<p class="drill-msg bad">Выбери хотя бы один предмет.</p>'; return; }
    const done = JSON.parse(localStorage.getItem('nav_done') || '{}');
    const items = [];
    subs.forEach(k => EXAM_TOPICS[k].topics.forEach(t =>
      items.push({ k, t, done: !!done[k + ':' + t] })));
    items.sort((a, b) => a.done - b.done);
    const per = Math.ceil(items.length / weeks);
    const plan = [];
    for (let i = 0; i < items.length; i += per) plan.push(items.slice(i, i + per));
    patchMe({ courses: [{ created: Date.now(), plan }] });
    $a('#courseOut').innerHTML = '<h3>Твой план готов и сохранён в кабинете</h3>' + plan.map((w, i) =>
      `<div class="week-card"><b>Неделя ${i + 1}</b><ul>${w.map(x =>
        `<li>${EXAM_TOPICS[x.k].name}: ${x.t}${x.done ? ' <span class="muted">(уже пройдено)</span>' : ''}</li>`).join('')}</ul></div>`).join('');
  });
}

/* ---------- Слушатели кабинета ---------- */
function initDash() {
  $a('#logoutBtn').addEventListener('click', () => { setSession(null); location.reload(); });
  $a('#accTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    $a('#accTabs').querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll('.acc-pane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  });
  $a('#saveProfile').addEventListener('click', () => {
    patchMe({ profile: Object.assign(me().profile, { bio: $a('#bioInput').value.trim() }) });
    renderProfile();
  });
  $a('#avatarInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 400 * 1024) { alert('Файл больше 400 КБ — возьми картинку поменьше.'); return; }
    const r = new FileReader();
    r.onload = () => { patchMe({ profile: Object.assign(me().profile, { avatar: r.result }) }); renderProfile(); };
    r.readAsDataURL(f);
  });
  $a('#coverPicker').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    patchMe({ profile: Object.assign(me().profile, { cover: Number(b.dataset.c) }) });
    renderProfile();
  });
  $a('#addNote').addEventListener('click', () => {
    const t = $a('#noteInput').value.trim();
    if (!t) return;
    const notes = me().notes; notes.push({ text: t, at: Date.now() });
    patchMe({ notes }); $a('#noteInput').value = ''; renderNotes();
  });
  $a('#notesList').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const notes = me().notes; notes.splice(Number(b.dataset.del), 1);
    patchMe({ notes }); renderNotes();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth(); initDash();
  if (session() && users()[session()]) enter();
});
