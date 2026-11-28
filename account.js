/* Study Guide: настоящая авторизация и облачный личный кабинет через Supabase Auth. */
'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const supabase = window.studyGuideSupabase;
  const COVERS = [
    'linear-gradient(135deg,#6c5ce7,#a29bfe)',
    'linear-gradient(135deg,#0f766e,#5fcf8a)',
    'linear-gradient(135deg,#b42318,#f0b35a)',
    'linear-gradient(135deg,#1d4ed8,#60a5fa)',
    'linear-gradient(135deg,#7c3aed,#ec4899)',
    'linear-gradient(135deg,#334155,#94a3b8)'
  ];
  const AVATAR_BUCKET = 'study-avatars';
  const MAX_AVATAR_BYTES = 400 * 1024;
  const MAX_NOTE_LENGTH = 10000;
  const MAX_NOTES_TO_IMPORT = 100;

  let currentUser = null;
  let profile = null;
  let notes = [];
  let avatarUrl = '';
  let initTask = null;
  let initializingUserId = null;
  let coursePlan = [];
  let authMode = 'login';

  const parseStored = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const getLegacyUsers = () => {
    const data = parseStored('nav_users', {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  };

  const setMessage = (selector, message, type = '') => {
    const node = $(selector);
    if (!node) return;
    node.textContent = message;
    node.className = 'drill-msg' + (type ? ' ' + type : '');
  };

  const setBusy = (button, busy, busyText) => {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText || 'Подождите…';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  };

  const friendlyError = (error, fallback) => {
    const message = String(error?.message || '');
    if (/Invalid login credentials/i.test(message)) return 'Неверный ник или пароль.';
    if (/Email not confirmed/i.test(message)) return 'Не удалось подтвердить внутренний идентификатор аккаунта. Обратись к администратору.';
    if (/Password should be at least/i.test(message)) return 'Supabase отклонил пароль. Проверь минимальную длину в настройках Auth.';
    if (/User already registered/i.test(message)) return 'Этот ник уже занят. Выбери другой.';
    if (/rate limit|too many requests/i.test(message)) return 'Слишком много запросов. Подожди немного и попробуй снова.';
    if (/redirect.*not allowed|not allowed.*redirect/i.test(message)) {
      return 'Supabase отклонил адрес возврата. Проверь Redirect URLs в настройках Auth.';
    }
    return fallback || 'Не удалось выполнить действие. Проверь соединение и попробуй ещё раз.';
  };

  function showAuth() {
    $('#authView').hidden = false;
    $('#dashView').hidden = true;
  }

  function showDashboard() {
    $('#authView').hidden = true;
    $('#dashView').hidden = false;
  }

  function validatePassword(password) {
    if (Array.from(password).length < 8) return 'Нужно минимум 8 символов.';
    if (password.length > 128) return 'Максимум 128 символов.';
    return '';
  }

  async function uploadAvatarBlob(blob, mimeType, userId) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    if (!extensions[mimeType]) throw new Error('Поддерживаются только JPG, PNG, WebP и GIF.');
    if (!blob || blob.size > MAX_AVATAR_BYTES) throw new Error('Аватар должен быть не больше 400 КБ.');

    const path = userId + '/' + crypto.randomUUID() + '.' + extensions[mimeType];
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    return data.path;
  }

  async function signedAvatar(path) {
    if (!path) return '';
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
    if (error) {
      console.warn('Не удалось открыть аватар:', error.message);
      return '';
    }
    return data?.signedUrl || '';
  }

  async function uploadLegacyAvatar(dataUrl, userId) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return uploadAvatarBlob(blob, blob.type, userId);
  }

  function removeLegacyUser(email) {
    const users = getLegacyUsers();
    if (!Object.prototype.hasOwnProperty.call(users, email)) return;
    delete users[email];
    if (Object.keys(users).length) localStorage.setItem('nav_users', JSON.stringify(users));
    else localStorage.removeItem('nav_users');
    if (localStorage.getItem('nav_session') === email) localStorage.removeItem('nav_session');
  }

  async function loadNotesAndImportLegacy(legacyUser, userId) {
    let { data: rows, error } = await supabase
      .from('study_notes')
      .select('id,title,body,created_at,updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (Array.isArray(legacyUser?.notes) && legacyUser.notes.length) {
      const signature = (body, date) => body + '|' + new Date(date).getTime();
      const known = new Set((rows || []).map((note) => signature(note.body || '', note.created_at)));
      const imported = legacyUser.notes.slice(0, MAX_NOTES_TO_IMPORT).map((note) => {
        const createdAt = Number.isFinite(Number(note?.at)) ? new Date(Number(note.at)).toISOString() : new Date().toISOString();
        return {
          user_id: userId,
          title: 'Заметка',
          body: String(note?.text || '').slice(0, MAX_NOTE_LENGTH),
          created_at: createdAt
        };
      }).filter((note) => {
        if (!note.body.trim()) return false;
        const key = signature(note.body, note.created_at);
        if (known.has(key)) return false;
        known.add(key);
        return true;
      });

      if (imported.length) {
        const inserted = await supabase.from('study_notes').insert(imported);
        if (inserted.error) throw inserted.error;
        const refreshed = await supabase
          .from('study_notes')
          .select('id,title,body,created_at,updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (refreshed.error) throw refreshed.error;
        rows = refreshed.data || [];
      }
    }

    notes = rows || [];
  }

  async function ensureProfile(user) {
    const { data: existing, error } = await supabase
      .from('study_profiles')
      .select('user_id,display_name,bio,avatar_path,cover_index,course_plan,exam_scores,exam_progress,theme_settings,created_at,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    const localUsers = getLegacyUsers();
    const legacy = localUsers[String(user.email || '').toLowerCase()] || null;
    let avatarPath = existing?.avatar_path || null;
    let createdProfile = existing;
    let legacyAvatarFailed = false;

    if (legacy?.profile?.avatar && !avatarPath) {
      try {
        avatarPath = await uploadLegacyAvatar(legacy.profile.avatar, user.id);
      } catch (error) {
        legacyAvatarFailed = true;
        console.warn('Старый аватар не удалось перенести:', error.message);
      }
    }

    if (!existing) {
      const draft = {
        user_id: user.id,
        display_name: String(legacy?.profile?.display_name || '').slice(0, 80),
        bio: String(legacy?.profile?.bio || '').slice(0, 500),
        avatar_path: avatarPath,
        cover_index: Math.max(0, Math.min(5, Number(legacy?.profile?.cover) || 0)),
        course_plan: Array.isArray(legacy?.courses) ? legacy.courses : [],
        exam_scores: parseStored('nav_scores', {}),
        exam_progress: parseStored('nav_done', {}),
        updated_at: new Date().toISOString()
      };
      const saved = await supabase.from('study_profiles').upsert(draft, { onConflict: 'user_id' }).select().single();
      if (saved.error) throw saved.error;
      createdProfile = saved.data;
    } else if (avatarPath && avatarPath !== existing.avatar_path) {
      const saved = await supabase.from('study_profiles')
        .update({ avatar_path: avatarPath, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      if (saved.error) throw saved.error;
      createdProfile = saved.data;
    }

    if (!createdProfile) throw new Error('Не удалось создать профиль пользователя.');
    await loadNotesAndImportLegacy(legacy, user.id);

    if (legacy && !legacyAvatarFailed) {
      // Remove the obsolete browser password hash only after cloud profile and notes are safe.
      removeLegacyUser(String(user.email || '').toLowerCase());
    }

    profile = createdProfile;
    coursePlan = Array.isArray(profile.course_plan) ? profile.course_plan : [];
    return profile;
  }

  async function saveProfilePatch(patch) {
    const next = {
      ...profile,
      ...patch,
      user_id: currentUser.id,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('study_profiles')
      .upsert(next, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    profile = data;
    coursePlan = Array.isArray(profile.course_plan) ? profile.course_plan : [];
    renderProfile();
    return data;
  }

  async function openDashboard(user) {
    if (!user?.id) {
      showAuth();
      return;
    }
    if (initializingUserId === user.id && initTask) return initTask;
    if (currentUser?.id === user.id && profile) {
      showDashboard();
      return;
    }

    initializingUserId = user.id;
    initTask = (async () => {
      currentUser = user;
      profile = null;
      setMessage('#dashboardStatus', 'Загружаем твои данные…');
      showDashboard();
      try {
        await ensureProfile(user);
        renderProfile();
        renderNotes();
        renderProgress();
        initCalc();
        initCourse();
        $('#currentAccountUsername').textContent = user.app_metadata?.username || user.user_metadata?.username || '—';
        $('#dashboardStatus').textContent = '';
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        $('#dashboardStatus').textContent = friendlyError(error, 'Не удалось загрузить профиль. Проверь доступ к схеме public в настройках Supabase Data API.');
        $('#dashboardStatus').className = 'drill-msg bad';
      }
    })();
    try {
      await initTask;
    } finally {
      initTask = null;
      initializingUserId = null;
    }
  }

  function renderProfile() {
    if (!profile) return;
    $('#profileUsername').textContent = profile.display_name || currentUser.app_metadata?.username || currentUser.user_metadata?.username || 'Ученик';
    $('#profileBio').textContent = profile.bio || 'Расскажи о себе в настройках профиля.';
    $('#displayNameInput').value = profile.display_name || '';
    $('#bioInput').value = profile.bio || '';
    $('#currentAccountUsername').textContent = currentUser.app_metadata?.username || currentUser.user_metadata?.username || '—';
    $('#profileHero').style.background = COVERS[profile.cover_index || 0];
    $('#coverPicker').innerHTML = COVERS.map((cover, index) =>
      '<button type="button" class="cover ' + (index === (profile.cover_index || 0) ? 'sel' : '') +
      '" data-c="' + index + '" style="background:' + cover + '" aria-label="Фон ' + (index + 1) + '"></button>'
    ).join('');
    void signedAvatar(profile.avatar_path).then((url) => {
      avatarUrl = url;
      $('#avatarImg').src = url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%236c5ce7%22/%3E%3Ctext x=%2220%22 y=%2226%22 font-size=%2218%22 fill=%22white%22 text-anchor=%22middle%22%3E:)%3C/text%3E%3C/svg%3E';
    });
  }

  function renderProgress() {
    const done = parseStored('nav_done', {});
    $('#progressList').innerHTML = Object.entries(EXAM_TOPICS).map(([key, subject]) => {
      const completed = subject.topics.filter((topic) => done[key + ':' + topic]).length;
      const percent = Math.round(completed / subject.topics.length * 100);
      return '<div class="prog-row"><span>' + subject.name + '</span><b>' + completed + '/' + subject.topics.length +
        '</b><div class="bar"><span style="transform:scaleX(' + percent / 100 + ')"></span></div></div>';
    }).join('');
  }

  function renderNotes() {
    const list = $('#notesList');
    list.replaceChildren();
    if (!notes.length) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'Пока пусто.';
      list.appendChild(empty);
      return;
    }
    for (const note of notes) {
      const item = document.createElement('li');
      const text = document.createElement('span');
      const remove = document.createElement('button');
      text.textContent = note.body || '';
      remove.type = 'button';
      remove.className = 'link-btn danger';
      remove.textContent = 'удалить';
      remove.dataset.del = note.id;
      item.append(text, remove);
      list.appendChild(item);
    }
  }

  const RAW = { rus: 50, math: 32, phys: 32, inf: 27, soc: 29, hist: 25, eng: 58, chem: 34, bio: 28 };

  function initCalc() {
    const select = $('#calcSubj');
    select.innerHTML = Object.keys(RAW).map((key) => '<option value="' + key + '">' + SUBJECTS[key] + '</option>').join('');

    // Native OS dropdowns ignore option colors in some browsers. Reuse the
    // site's custom dark dropdown so the subject list remains readable.
    const wrapper = document.createElement('div');
    wrapper.className = 'cselect calc-subject-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cselect-btn';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'calcSubjOptions');

    const list = document.createElement('div');
    list.className = 'cselect-list';
    list.id = 'calcSubjOptions';
    list.setAttribute('role', 'listbox');
    list.innerHTML = Array.from(select.options).map((option) =>
      '<button type="button" role="option" data-v="' + option.value +
      '" aria-selected="' + String(option.value === select.value) + '">' + option.textContent + '</button>'
    ).join('');
    wrapper.append(trigger, list);

    const syncSubjectSelect = () => {
      const selected = select.options[select.selectedIndex];
      trigger.textContent = selected ? selected.textContent : 'Выбери предмет';
      list.querySelectorAll('[role="option"]').forEach((option) =>
        option.setAttribute('aria-selected', String(option.dataset.v === select.value)));
    };
    const closeSubjectSelect = () => {
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };
    trigger.addEventListener('click', () => {
      const isOpen = wrapper.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) list.querySelector('[aria-selected="true"]')?.focus();
    });
    list.addEventListener('click', (event) => {
      const option = event.target.closest('[data-v]');
      if (!option) return;
      select.value = option.dataset.v;
      syncSubjectSelect();
      closeSubjectSelect();
      trigger.focus();
      update();
    });
    list.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSubjectSelect();
        trigger.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!wrapper.contains(event.target)) closeSubjectSelect();
    });

    const update = () => {
      const key = select.value;
      const maxRaw = RAW[key];
      const input = $('#calcRaw');
      input.min = '0';
      input.max = String(maxRaw);
      input.step = '1';
      const entered = input.value === '' ? 0 : Number(input.value);
      const raw = Number.isFinite(entered) ? Math.max(0, Math.min(entered, maxRaw)) : 0;
      const score = Math.round(raw / maxRaw * 100);
      $('#calcTest').textContent = input.value.trim() ? score : '—';
      const scores = parseStored('nav_scores', {});
      const sum = Object.keys(RAW).reduce((total, subject) => total + (Number(scores[subject]) || 0), 0);
      $('#calcSum').textContent = sum
        ? 'Сумма твоих сохранённых баллов ЕГЭ: ' + sum + '.'
        : 'Сохранённых баллов пока нет — впиши их на странице «Вузы».';
    };
    select.addEventListener('change', update);
    $('#calcRaw').addEventListener('input', update);
    syncSubjectSelect();
    update();
  }

  function renderCoursePlan() {
    const output = $('#courseOut');
    output.replaceChildren();
    if (!coursePlan.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Пока нет сохранённого курса. Выбери предметы и составь план.';
      output.appendChild(empty);
      return;
    }
    const saved = coursePlan[coursePlan.length - 1];
    const heading = document.createElement('h3');
    heading.textContent = 'Твой сохранённый план подготовки';
    output.appendChild(heading);
    (saved.plan || []).forEach((week, index) => {
      const card = document.createElement('div');
      card.className = 'week-card';
      const title = document.createElement('b');
      title.textContent = 'Неделя ' + (index + 1);
      const list = document.createElement('ul');
      (week || []).forEach((entry) => {
        const item = document.createElement('li');
        const subject = EXAM_TOPICS[entry.k]?.name || entry.k;
        item.textContent = subject + ': ' + entry.t + (entry.done ? ' (уже пройдено)' : '');
        list.appendChild(item);
      });
      card.append(title, list);
      output.appendChild(card);
    });
  }

  function initCourse() {
    const box = $('#courseSubjs');
    box.innerHTML = Object.entries(EXAM_TOPICS).map(([key, subject]) =>
      '<button type="button" class="chip" data-cs="' + key + '" aria-pressed="false">' + subject.name + '</button>'
    ).join('');
    box.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cs]');
      if (button) button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    });
    $('#buildCourse').addEventListener('click', async () => {
      const subjects = [...box.querySelectorAll('[aria-pressed="true"]')].map((button) => button.dataset.cs);
      const weeks = Math.max(1, Math.min(24, Number($('#courseWeeks').value) || 8));
      if (!subjects.length) {
        setMessage('#courseStatus', 'Выбери хотя бы один предмет.', 'bad');
        return;
      }
      const done = parseStored('nav_done', {});
      const items = [];
      subjects.forEach((key) => EXAM_TOPICS[key].topics.forEach((topic) => {
        items.push({ k: key, t: topic, done: !!done[key + ':' + topic] });
      }));
      items.sort((a, b) => Number(a.done) - Number(b.done));
      const perWeek = Math.ceil(items.length / weeks);
      const plan = [];
      for (let index = 0; index < items.length; index += perWeek) plan.push(items.slice(index, index + perWeek));
      coursePlan = [{ created: Date.now(), plan }];
      try {
        await saveProfilePatch({ course_plan: coursePlan });
        renderCoursePlan();
        setMessage('#courseStatus', 'План сохранён в облачном профиле.', 'ok');
      } catch (error) {
        setMessage('#courseStatus', friendlyError(error, 'Не удалось сохранить план.'), 'bad');
      }
    });
    renderCoursePlan();
  }

  async function changeAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) throw new Error('Выбери файл изображения.');
    if (file.size > MAX_AVATAR_BYTES) throw new Error('Файл больше 400 КБ.');
    const oldPath = profile.avatar_path;
    const newPath = await uploadAvatarBlob(file, file.type, currentUser.id);
    try {
      await saveProfilePatch({ avatar_path: newPath });
      if (oldPath) {
        const removed = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
        if (removed.error) console.warn('Старый аватар не удалось удалить:', removed.error.message);
      }
    } catch (error) {
      await supabase.storage.from(AVATAR_BUCKET).remove([newPath]);
      throw error;
    }
  }

  function initAuth() {
    let captchaChallenge = null;

    async function callAuthGateway(payload) {
      const { data, error } = await supabase.functions.invoke('username-auth', { body: payload });
      if (error) {
        let details = {};
        try {
          if (error.context?.json) details = await error.context.json();
        } catch {}
        const failure = new Error(details.error || error.message || 'Ошибка авторизации.');
        failure.payload = details;
        failure.status = error.context?.status || 0;
        throw failure;
      }
      return data;
    }

    async function requestCaptcha(username) {
      const challenge = await callAuthGateway({ action: 'challenge', username });
      captchaChallenge = challenge;
      $('#captchaWrap').hidden = false;
      $('#captchaQuestion').textContent = challenge.question;
      $('#captchaAnswer').value = '';
      $('#captchaAnswer').focus();
    }

    $('#authSeg').addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]');
      if (!button) return;
      authMode = button.dataset.mode;
      $('#authSeg').querySelectorAll('[data-mode]').forEach((item) =>
        item.setAttribute('aria-pressed', String(item === button)));
      $('#pass2Wrap').hidden = authMode !== 'reg';
      $('#authPass').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
      $('#authSubmit').textContent = authMode === 'login' ? 'Войти' : 'Создать аккаунт';
      captchaChallenge = null;
      $('#captchaWrap').hidden = true;
      setMessage('#authMsg', '');
    });

    $('#authForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('#authSubmit');
      const username = $('#authUsername').value.trim().normalize('NFC');
      const password = $('#authPass').value;
      setMessage('#authMsg', '');

      if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]{2,23}$/u.test(username)) {
        setMessage('#authMsg', 'Ник должен содержать от 3 до 24 символов: буквы, цифры, точку, дефис или подчёркивание.', 'bad');
        $('#authUsername').focus();
        return;
      }
      if (!password) {
        setMessage('#authMsg', 'Введи пароль.', 'bad');
        return;
      }
      if (authMode === 'reg') {
        const validation = validatePassword(password);
        if (validation) {
          setMessage('#authMsg', validation, 'bad');
          return;
        }
        if (password !== $('#authPass2').value) {
          setMessage('#authMsg', 'Пароли не совпадают.', 'bad');
          return;
        }
      }

      setBusy(button, true, authMode === 'login' ? 'Входим…' : 'Создаём аккаунт…');
      try {
        const payload = {
          action: authMode === 'reg' ? 'register' : 'login',
          username,
          password
        };
        if (authMode === 'login' && captchaChallenge) {
          payload.challenge_id = captchaChallenge.challenge_id;
          payload.captcha_answer = $('#captchaAnswer').value.trim();
        }

        const result = await callAuthGateway(payload);
        if (!result?.session?.access_token || !result?.session?.refresh_token) {
          throw new Error('Сервер не вернул сессию. Попробуй войти ещё раз.');
        }
        captchaChallenge = null;
        $('#captchaWrap').hidden = true;
        const { data, error } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });
        if (error) throw error;
        await openDashboard(data.user || result.user);
      } catch (error) {
        const details = error.payload || {};
        if (details.captcha_required) {
          try {
            await requestCaptcha(username);
            setMessage('#authMsg', details.attempts
              ? 'Три неверные попытки. Перед следующим входом реши пример.'
              : 'Для продолжения реши пример.', 'bad');
          } catch (captchaError) {
            setMessage('#authMsg', captchaError.message || 'Не удалось загрузить проверку. Попробуй ещё раз.', 'bad');
          }
        } else if (details.captcha_invalid) {
          try {
            await requestCaptcha(username);
            setMessage('#authMsg', 'Ответ неверный. Реши новый пример.', 'bad');
          } catch (captchaError) {
            setMessage('#authMsg', captchaError.message || 'Не удалось загрузить проверку.', 'bad');
          }
        } else {
          setMessage('#authMsg', error.message || 'Не удалось выполнить вход.', 'bad');
        }
      } finally {
        setBusy(button, false);
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      // Defer dashboard work until Supabase finishes its auth callback.
      setTimeout(() => {
        if (session?.user) {
          if (event === 'USER_UPDATED' && currentUser?.id === session.user.id) {
            currentUser = session.user;
            $('#currentAccountUsername').textContent = currentUser.app_metadata?.username || currentUser.user_metadata?.username || '—';
            if (profile) renderProfile();
          }
          void openDashboard(session.user);
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          profile = null;
          notes = [];
          coursePlan = [];
          initializingUserId = null;
          initTask = null;
          showAuth();
        }
      }, 0);
    });
  }

  function initDashboard() {
    $('#logoutBtn').addEventListener('click', async () => {
      const button = $('#logoutBtn');
      setBusy(button, true, 'Выходим…');
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        currentUser = null;
        profile = null;
        showAuth();
      } catch (error) {
        setMessage('#dashboardStatus', friendlyError(error, 'Не удалось завершить сеанс.'), 'bad');
      } finally {
        setBusy(button, false);
      }
    });

    $('#accTabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      $('#accTabs').querySelectorAll('[data-tab]').forEach((item) =>
        item.setAttribute('aria-pressed', String(item === button)));
      document.querySelectorAll('.acc-pane').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== button.dataset.tab;
      });
    });

    $('#saveProfile').addEventListener('click', async () => {
      const button = $('#saveProfile');
      const displayName = $('#displayNameInput').value.trim();
      const bio = $('#bioInput').value.trim();
      if (displayName.length > 80 || bio.length > 500) {
        setMessage('#profileStatus', 'Имя — до 80 символов, описание — до 500.', 'bad');
        return;
      }
      setBusy(button, true, 'Сохраняем…');
      try {
        await saveProfilePatch({ display_name: displayName, bio, cover_index: profile.cover_index || 0 });
        setMessage('#profileStatus', 'Профиль сохранён и доступен после входа с других устройств.', 'ok');
      } catch (error) {
        setMessage('#profileStatus', friendlyError(error, 'Не удалось сохранить профиль.'), 'bad');
      } finally {
        setBusy(button, false);
      }
    });

    $('#avatarInput').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await changeAvatar(file);
        setMessage('#profileStatus', 'Аватар загружен в приватное хранилище.', 'ok');
      } catch (error) {
        setMessage('#profileStatus', friendlyError(error, 'Не удалось загрузить аватар.'), 'bad');
      } finally {
        event.target.value = '';
      }
    });

    $('#coverPicker').addEventListener('click', (event) => {
      const button = event.target.closest('[data-c]');
      if (!button || !profile) return;
      profile.cover_index = Number(button.dataset.c);
      renderProfile();
    });

    $('#addNote').addEventListener('click', async () => {
      const body = $('#noteInput').value.trim();
      if (!body) return;
      if (body.length > MAX_NOTE_LENGTH) {
        setMessage('#notesStatus', 'Заметка должна быть не длиннее 10 000 символов.', 'bad');
        return;
      }
      const button = $('#addNote');
      setBusy(button, true, 'Сохраняем…');
      try {
        const { data, error } = await supabase
          .from('study_notes')
          .insert({ user_id: currentUser.id, title: 'Заметка', body })
          .select('id,title,body,created_at,updated_at')
          .single();
        if (error) throw error;
        notes.unshift(data);
        $('#noteInput').value = '';
        renderNotes();
        setMessage('#notesStatus', 'Заметка сохранена в аккаунте.', 'ok');
      } catch (error) {
        setMessage('#notesStatus', friendlyError(error, 'Не удалось сохранить заметку.'), 'bad');
      } finally {
        setBusy(button, false);
      }
    });

    $('#notesList').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-del]');
      if (!button) return;
      const id = button.dataset.del;
      button.disabled = true;
      try {
        const { error } = await supabase.from('study_notes').delete().eq('id', id).eq('user_id', currentUser.id);
        if (error) throw error;
        notes = notes.filter((note) => note.id !== id);
        renderNotes();
        setMessage('#notesStatus', 'Заметка удалена.', 'ok');
      } catch (error) {
        button.disabled = false;
        setMessage('#notesStatus', friendlyError(error, 'Не удалось удалить заметку.'), 'bad');
      }
    });

    $('#changePasswordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = $('#currentPassword').value;
      const newPassword = $('#newPassword').value;
      const confirmation = $('#confirmNewPassword').value;
      const validation = validatePassword(newPassword);
      if (!currentPassword) {
        setMessage('#securityStatus', 'Введи текущий пароль.', 'bad');
        return;
      }
      if (validation) {
        setMessage('#securityStatus', validation, 'bad');
        return;
      }
      if (newPassword !== confirmation) {
        setMessage('#securityStatus', 'Новые пароли не совпадают.', 'bad');
        return;
      }
      const button = $('#changePasswordSubmit');
      setBusy(button, true, 'Обновляем…');
      try {
        const reauth = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword
        });
        if (reauth.error) throw reauth.error;
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          current_password: currentPassword
        });
        if (error) throw error;
        event.target.reset();
        setMessage('#securityStatus', 'Пароль изменён. Другие активные сеансы будут защищены политиками Supabase Auth.', 'ok');
      } catch (error) {
        setMessage('#securityStatus', friendlyError(error, 'Не удалось изменить пароль. Проверь текущий пароль и попробуй снова.'), 'bad');
      } finally {
        setBusy(button, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!supabase) {
      setMessage('#authMsg', 'Не загрузился клиент Supabase. Обнови страницу или сообщи владельцу сайта.', 'bad');
      return;
    }
    initAuth();
    initDashboard();

    const restored = await (window.studyGuideAuthReady || Promise.resolve(null));
    if (restored?.user) {
      await openDashboard(restored.user);
    } else {
      showAuth();
    }

  });
})();
