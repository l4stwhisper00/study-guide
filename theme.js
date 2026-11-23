/* Per-account theme settings and shared site appearance controls. */
(() => {
  'use strict';

  const client = window.studyGuideSupabase || null;
  const STORAGE_GUEST = 'nav_theme_guest';
  const userKey = (id) => 'nav_theme_user_' + id;
  const defaults = { preset: 'midnight', accent: '#8b7cf6', background: '#0b0d12' };
  const presets = [
    { id: 'midnight', name: 'Полночь', accent: '#9b8cff', background: '#0b0d12' },
    { id: 'indigo', name: 'Индиго', accent: '#6d75ff', background: '#101126' },
    { id: 'ocean', name: 'Океан', accent: '#36b9d8', background: '#071923' },
    { id: 'emerald', name: 'Изумруд', accent: '#39c98a', background: '#091b16' },
    { id: 'rose', name: 'Роза', accent: '#f178ad', background: '#21111c' },
    { id: 'sunset', name: 'Закат', accent: '#ff936b', background: '#21140f' },
    { id: 'amber', name: 'Янтарь', accent: '#e9b84f', background: '#1d190e' },
    { id: 'violet', name: 'Фиолет', accent: '#bd83ff', background: '#191025' },
    { id: 'light', name: 'Светлая', accent: '#6555d9', background: '#f1f2f8' },
    { id: 'graphite', name: 'Графит', accent: '#aab4c7', background: '#171b24' }
  ];
  let currentUserId = null;
  let settings = readLocal(STORAGE_GUEST) || defaults;
  let saveTimer = null;
  let panel, trigger, overlay, status;

  function validHex(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  }
  function normalize(value) {
    const source = value && typeof value === 'object' ? value : defaults;
    return {
      preset: presets.some((p) => p.id === source.preset) ? source.preset : 'custom',
      accent: validHex(source.accent) ? source.accent : defaults.accent,
      background: validHex(source.background) ? source.background : defaults.background
    };
  }
  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch { return null; }
  }
  function writeLocal() {
    try {
      localStorage.setItem(currentUserId ? userKey(currentUserId) : STORAGE_GUEST, JSON.stringify(settings));
    } catch {}
  }
  function rgb(hex) {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  }
  function luminance(hex) {
    const channels = rgb(hex).map((v) => {
      const c = v / 255;
      return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
    });
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  }
  function rgba(hex, alpha) {
    const [r, g, b] = rgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }
  function apply() {
    const root = document.documentElement;
    const light = luminance(settings.background) > .48;
    const ink = light ? '#171923' : '#f1f2f8';
    const muted = light ? '#596071' : '#a7adbf';
    const faint = light ? '#737b8d' : '#737b8d';
    const accent2 = shift(settings.accent, -.16);
    root.style.setProperty('--bg', settings.background);
    root.style.setProperty('--ink', ink);
    root.style.setProperty('--muted', muted);
    root.style.setProperty('--faint', faint);
    root.style.setProperty('--accent', settings.accent);
    root.style.setProperty('--accent-2', accent2);
    root.style.setProperty('--grad', 'linear-gradient(135deg, ' + settings.accent + ', ' + accent2 + ')');
    root.style.setProperty('--surface', rgba(ink, light ? .055 : .045));
    root.style.setProperty('--surface-2', rgba(ink, light ? .085 : .075));
    root.style.setProperty('--border', rgba(ink, light ? .12 : .10));
    root.style.setProperty('--border-strong', rgba(ink, light ? .22 : .19));
    root.style.setProperty('--theme-glow', rgba(settings.accent, light ? .11 : .19));
    root.style.setProperty('--theme-glow-soft', rgba(settings.accent, light ? .06 : .10));
    root.style.colorScheme = light ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.background);
    document.querySelectorAll('.theme-preset').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === settings.preset));
    });
    const accentInput = document.getElementById('themeAccent');
    const backgroundInput = document.getElementById('themeBackground');
    if (accentInput) accentInput.value = settings.accent;
    if (backgroundInput) backgroundInput.value = settings.background;
  }
  function shift(hex, amount) {
    const [r, g, b] = rgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amount < 0 ? v * amount : (255 - v) * amount))));
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function setStatus(message) {
    if (status) status.textContent = message;
  }
  function persist() {
    writeLocal();
    clearTimeout(saveTimer);
    if (!currentUserId || !client) {
      setStatus('Сохранено на этом устройстве');
      return;
    }
    setStatus('Сохраняем в аккаунт…');
    const userId = currentUserId;
    const snapshot = { ...settings };
    saveTimer = setTimeout(async () => {
      const { error } = await client.from('study_profiles').upsert({
        user_id: userId,
        theme_settings: snapshot,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (userId !== currentUserId) return;
      setStatus(error ? 'Не удалось синхронизировать. Локальная тема сохранена.' : 'Тема сохранена в аккаунте');
      if (error) console.warn('Theme sync failed:', error.message);
    }, 350);
  }
  function choose(next) {
    settings = normalize(next);
    apply();
    persist();
  }
  function openPanel(open) {
    panel?.classList.toggle('is-open', open);
    overlay?.classList.toggle('is-visible', open);
    trigger?.setAttribute('aria-expanded', String(open));
    if (open) panel?.querySelector('button, input')?.focus();
  }
  function buildUi() {
    const header = document.querySelector('.header-in');
    if (!header || document.getElementById('themeTrigger')) return;
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'themeTrigger';
    trigger.className = 'theme-trigger';
    trigger.setAttribute('aria-label', 'Открыть настройки внешнего вида');
    trigger.setAttribute('aria-controls', 'themePanel');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="theme-trigger-dot" aria-hidden="true"></span><span>Цвета</span>';
    const logo = header.querySelector('.logo');
    if (logo?.nextSibling) header.insertBefore(trigger, logo.nextSibling);
    else header.appendChild(trigger);

    overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'theme-overlay';
    overlay.setAttribute('aria-label', 'Закрыть настройки темы');
    overlay.addEventListener('click', () => openPanel(false));
    panel = document.createElement('aside');
    panel.id = 'themePanel';
    panel.className = 'theme-panel';
    panel.setAttribute('aria-label', 'Настройки внешнего вида');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<div class="theme-panel-head"><div><span class="theme-eyebrow">ПЕРСОНАЛИЗАЦИЯ</span><h2>Внешний вид</h2><p>Выбери настроение сайта</p></div><button type="button" class="theme-close" aria-label="Закрыть">×</button></div><div class="theme-panel-content"><section class="theme-section"><h3>Готовые темы</h3><div class="theme-presets">' +
      presets.map((p) => '<button type="button" class="theme-preset" data-preset="' + p.id + '" aria-pressed="false"><span class="theme-swatch" style="--swatch-bg:' + p.background + ';--swatch-accent:' + p.accent + '"></span><span>' + p.name + '</span><span class="theme-check" aria-hidden="true">✓</span></button>').join('') +
      '</div></section><section class="theme-section"><h3>Своя тема</h3><label class="theme-color-row"><span><b>Акцентный цвет</b><small>Кнопки, ссылки и выделения</small></span><input id="themeAccent" type="color" value="#8b7cf6"></label><label class="theme-color-row"><span><b>Цвет фона</b><small>Основной фон страниц</small></span><input id="themeBackground" type="color" value="#0b0d12"></label><button type="button" class="theme-reset">Вернуть стандартную тему</button></section><p class="theme-save-status" role="status" aria-live="polite"></p><p class="theme-account-note">Тема сохраняется в твоём аккаунте после входа. До этого — на устройстве.</p></div>';
    document.body.append(overlay, panel);
    status = panel.querySelector('.theme-save-status');
    trigger.addEventListener('click', () => openPanel(!panel.classList.contains('is-open')));
    panel.querySelector('.theme-close').addEventListener('click', () => openPanel(false));
    panel.querySelectorAll('.theme-preset').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = presets.find((p) => p.id === button.dataset.preset);
        if (preset) choose(preset);
      });
    });
    panel.querySelector('#themeAccent').addEventListener('input', (event) => choose({ ...settings, preset: 'custom', accent: event.target.value }));
    panel.querySelector('#themeBackground').addEventListener('input', (event) => choose({ ...settings, preset: 'custom', background: event.target.value }));
    panel.querySelector('.theme-reset').addEventListener('click', () => choose(defaults));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        openPanel(false);
        trigger.focus();
      }
    });
    apply();
  }
  async function loadUserTheme(user) {
    if (!user?.id) return;
    currentUserId = user.id;
    const cached = readLocal(userKey(user.id));
    const { data, error } = await client.from('study_profiles')
      .select('theme_settings').eq('user_id', user.id).maybeSingle();
    if (currentUserId !== user.id) return;
    settings = normalize(data?.theme_settings || cached || settings || defaults);
    apply();
    if (!data?.theme_settings && !error) persist();
    else setStatus(error ? 'Локальная тема; синхронизация ожидает соединения' : 'Тема аккаунта загружена');
  }
  function useGuestTheme() {
    currentUserId = null;
    settings = readLocal(STORAGE_GUEST) || defaults;
    apply();
    setStatus('Выбери тему для этого устройства');
  }

  buildUi();
  apply();
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        window.setTimeout(() => loadUserTheme(session.user), 0);
      } else if (event === 'SIGNED_OUT') {
        useGuestTheme();
      }
    });
    Promise.resolve(window.studyGuideAuthReady).then(async (sessionOrUser) => {
      const session = sessionOrUser?.user ? sessionOrUser : (await client.auth.getSession()).data?.session;
      if (session?.user) await loadUserTheme(session.user);
    }).catch((error) => console.warn('Theme initialization failed:', error));
  }
})();