/* Shared Supabase browser client for authentication and per-user study progress. */
(() => {
  'use strict';
  const cfg = window.STUDY_GUIDE_SUPABASE;
  if (!cfg || !window.supabase?.createClient) {
    console.error('Study Guide: Supabase client configuration is missing.');
    window.studyGuideAuthReady = Promise.resolve(null);
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    }
  });

  window.studyGuideSupabase = client;

  let activeUserId = null;
  let isHydrating = false;
  const syncState = async (session) => {
    const user = session?.user;
    if (!user) {
      activeUserId = null;
      isHydrating = true;
      localStorage.removeItem('nav_scores');
      localStorage.removeItem('nav_done');
      isHydrating = false;
      window.dispatchEvent(new CustomEvent('study-guide-auth-state', { detail: { user: null } }));
      return null;
    }

    if (activeUserId === user.id) return user;
    activeUserId = user.id;

    const { data, error } = await client
      .from('study_profiles')
      .select('exam_scores, exam_progress')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Study Guide profile state could not be synchronized:', error.message);
    } else if (data) {
      isHydrating = true;
      localStorage.setItem('nav_scores', JSON.stringify(data.exam_scores || {}));
      localStorage.setItem('nav_done', JSON.stringify(data.exam_progress || {}));
      isHydrating = false;
    }

    window.dispatchEvent(new CustomEvent('study-guide-auth-state', { detail: { user } }));
    return user;
  };

  let authQueue = Promise.resolve(null);
  const queueSync = (session) => {
    authQueue = authQueue.then(() => syncState(session)).catch((error) => {
      console.warn('Study Guide session synchronization failed:', error);
      return null;
    });
    return authQueue;
  };

  client.auth.onAuthStateChange((_event, session) => {
    // Defer database work until after Supabase finishes its auth callback.
    setTimeout(() => { void queueSync(session); }, 0);
  });

  window.studyGuideAuthReady = client.auth.getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;
      await queueSync(data.session);
      return data.session;
    })
    .catch((error) => {
      console.warn('Study Guide could not restore the saved session:', error);
      return null;
    });

  window.studyGuidePersist = async (key, value) => {
    const column = key === 'scores' ? 'exam_scores' : key === 'done' ? 'exam_progress' : null;
    if (!column || !activeUserId || isHydrating) return;
    const { error } = await client
      .from('study_profiles')
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('user_id', activeUserId);
    if (error) console.warn('Study Guide cloud progress was not saved:', error.message);
  };
})();
