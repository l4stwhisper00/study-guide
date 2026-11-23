/* Личный кабинет: Supabase Auth + локальные настройки интерфейса */
'use strict';
const $a = s => document.querySelector(s);
const authClient = window.supabase.createClient(window.STUDY_GUIDE_SUPABASE.url, window.STUDY_GUIDE_SUPABASE.publishableKey);
const users = () => JSON.parse(localStorage.getItem('nav_users') || '{}');
const saveUsers = u => localStorage.setItem('nav_users', JSON.stringify(u));
const session = () => localStorage.getItem('nav_session');
const setSession = e => e ? localStorage.setItem('nav_session', e) : localStorage.removeItem('nav_session');
const ensureLocalUser = email => {
  const u=users();
  if(!u[email]) u[email]={profile:{avatar:'',cover:0,bio:''},notes:[],courses:[]};
  saveUsers(u);
  return u[email];
};
const me = () => ensureLocalUser(session());
const patchMe = patch => { const u=users(); u[session()]=Object.assign(ensureLocalUser(session()),patch); saveUsers(u); };

let mode = 'login';
function initAuth() {
  $a('#authSeg').addEventListener('click', e => {
    const b=e.target.closest('[data-mode]'); if(!b)return;
    mode=b.dataset.mode;
    $a('#authSeg').querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    $a('#pass2Wrap').hidden=mode==='login';
    $a('#authSubmit').textContent=mode==='login'?'Войти':'Создать аккаунт';
    $a('#authPass').autocomplete=mode==='login'?'current-password':'new-password';
  });
  $a('#authForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const msg=$a('#authMsg');msg.className='drill-msg';msg.textContent='';
    const fail=t=>{msg.textContent=t;msg.className='drill-msg bad';};
    const email=$a('#authEmail').value.trim().toLowerCase(),password=$a('#authPass').value;
    if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email))return fail('Проверь адрес электронной почты.');
    if(password.length<8)return fail('Пароль должен содержать не менее 8 символов.');
    try{
      if(mode==='reg'){
        if(password!==$a('#authPass2').value)return fail('Пароли не совпадают.');
        const {data,error}=await authClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/account.html'}});
        if(error)throw error;
        if(data.session){setSession(email);ensureLocalUser(email);enter();}
        else{msg.textContent='Письмо для подтверждения отправлено на '+email+'. Открой ссылку в письме, затем вернись сюда и войди.';msg.className='drill-msg good';}
      }else{
        const {data,error}=await authClient.auth.signInWithPassword({email,password});
        if(error)throw error;
        setSession(data.user.email.toLowerCase());ensureLocalUser(data.user.email.toLowerCase());enter();
      }
    }catch(err){fail(err.message||'Не удалось выполнить запрос. Попробуй ещё раз.');}
  });
  $a('#forgotPassword').addEventListener('click',async()=>{
    const email=$a('#authEmail').value.trim().toLowerCase(),msg=$a('#authMsg');
    if(!email){msg.textContent='Сначала укажи почту.';msg.className='drill-msg bad';return;}
    const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/account.html'});
    msg.textContent=error?error.message:'Если аккаунт существует, письмо для сброса пароля отправлено.';msg.className='drill-msg';
  });
  authClient.auth.onAuthStateChange((event,sessionData)=>{
    if(sessionData?.user?.email){const email=sessionData.user.email.toLowerCase();setSession(email);ensureLocalUser(email);$a('#authView').hidden=true;$a('#dashView').hidden=false;renderProfile();renderProgress();renderNotes();}
    else if(event==='SIGNED_OUT'){setSession(null);}
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
  $a('#logoutBtn').addEventListener('click', async () => { await authClient.auth.signOut(); setSession(null); location.reload(); });
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
