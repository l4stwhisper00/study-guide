import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const siteOrigin = "https://navigator.devs.li";
const corsHeaders = {
  "Access-Control-Allow-Origin": siteOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 8192) return null;
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json") || !req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8192) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUsername(value: unknown): { display: string; normalized: string } | null {
  if (typeof value !== "string") return null;
  const display = value.trim().normalize("NFC");
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]{2,23}$/u.test(display)) return null;
  return { display, normalized: display.toLowerCase().normalize("NFC") };
}

function validPassword(value: unknown, forRegistration = false): value is string {
  if (typeof value !== "string") return false;
  const length = Array.from(value).length;
  return length > 0 && length <= 128 && (!forRegistration || length >= 8);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip")?.trim() || forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    if (origin && origin !== siteOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Метод не поддерживается." }, 405);

  const origin = req.headers.get("Origin");
  if (origin && origin !== siteOrigin) return json({ error: "Источник запроса не разрешён." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Сервер авторизации пока не настроен." }, 500);

  const body = await readJsonBody(req);
  if (!body) return json({ error: "Некорректный запрос." }, 400);

  const action = body.action;
  const username = normalizeUsername(body.username);
  if (!username) {
    return json({ error: "Ник: от 3 до 24 символов. Используй буквы, цифры, точку, дефис или подчёркивание." }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = getClientIp(req);
  const ipHash = await sha256(serviceKey + ":" + ip);

  if (action === "challenge") {
    const recentCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentChallenges, error: challengeRateError } = await admin
      .from("auth_login_captchas")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", recentCutoff);
    if (challengeRateError) {
      console.error("Challenge rate-limit check failed", challengeRateError.code || "unknown");
      return json({ error: "Проверка временно недоступна." }, 503);
    }
    if ((recentChallenges || 0) >= 20) {
      return json({ error: "Слишком много проверок. Подожди несколько минут." }, 429);
    }
    await admin.from("auth_login_captchas").delete().lt("expires_at", new Date().toISOString());

    const a = 12 + crypto.getRandomValues(new Uint32Array(1))[0] % 78;
    const b = 12 + crypto.getRandomValues(new Uint32Array(1))[0] % 78;
    const challengeId = crypto.randomUUID();
    const answerHash = await sha256(challengeId + "|" + username.normalized + "|" + ipHash + "|" + (a + b));
    const { error } = await admin.from("auth_login_captchas").insert({
      id: challengeId,
      username_normalized: username.normalized,
      ip_hash: ipHash,
      answer_hash: answerHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error("Login challenge creation failed", error.code || "unknown");
      return json({ error: "Не удалось создать проверку. Попробуй ещё раз." }, 503);
    }
    return json({ captcha_required: true, challenge_id: challengeId, question: a + " + " + b + " = ?" });
  }

  if (action === "register") {
    if (!validPassword(body.password, true)) {
      return json({ error: "Пароль должен содержать от 8 до 128 символов." }, 400);
    }

    const { data: signupAllowed, error: signupRateError } = await admin.rpc("consume_auth_signup_slot", {
      p_ip_hash: ipHash,
    });
    if (signupRateError) {
      console.error("Signup rate-limit check failed", signupRateError.code || "unknown");
      return json({ error: "Регистрация временно недоступна." }, 503);
    }
    if (signupAllowed !== true) return json({ error: "Слишком много регистраций с этого подключения. Попробуй через час." }, 429);

    const { data: existing, error: lookupError } = await admin
      .from("account_usernames")
      .select("user_id")
      .eq("username_normalized", username.normalized)
      .maybeSingle();
    if (lookupError) {
      console.error("Username lookup failed", lookupError.code || "unknown");
      return json({ error: "Не удалось проверить ник. Попробуй позже." }, 503);
    }
    if (existing) return json({ error: "Этот ник уже занят. Выбери другой." }, 409);

    const syntheticEmail = crypto.randomUUID() + "@accounts.navigator.invalid";
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: body.password,
      email_confirm: true,
      app_metadata: { username: username.display },
      user_metadata: { username: username.display },
    });
    if (createError || !created.user) {
      if (/already|exists|duplicate/i.test(createError?.message || "")) {
        return json({ error: "Этот ник уже занят. Выбери другой." }, 409);
      }
      console.error("Account creation failed", createError?.code || "unknown");
      return json({ error: "Не удалось создать аккаунт. Попробуй ещё раз." }, 500);
    }

    const userId = created.user.id;
    const { error: usernameError } = await admin.from("account_usernames").insert({
      user_id: userId,
      username: username.display,
      username_normalized: username.normalized,
      auth_email: syntheticEmail,
    });
    if (usernameError) {
      await admin.auth.admin.deleteUser(userId);
      if (usernameError.code === "23505") return json({ error: "Этот ник уже занят. Выбери другой." }, 409);
      console.error("Username reservation failed", usernameError.code || "unknown");
      return json({ error: "Не удалось сохранить ник. Попробуй ещё раз." }, 500);
    }

    const { error: profileError } = await admin.from("study_profiles").upsert({
      user_id: userId,
      display_name: username.display,
    }, { onConflict: "user_id" });
    if (profileError) {
      await admin.from("account_usernames").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      console.error("Initial profile creation failed", profileError.code || "unknown");
      return json({ error: "Не удалось создать профиль. Попробуй ещё раз." }, 500);
    }

    const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({
      email: syntheticEmail,
      password: body.password as string,
    });
    if (signInError || !signedIn.session || !signedIn.user) {
      await admin.from("account_usernames").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      console.error("New account sign-in failed", signInError?.code || "unknown");
      return json({ error: "Аккаунт создан не полностью. Попробуй зарегистрироваться ещё раз." }, 500);
    }
    return json({ session: signedIn.session, user: signedIn.user }, 201);
  }

  if (action === "login") {
    if (!validPassword(body.password)) return json({ error: "Введи пароль." }, 400);

    const { data: attempts, error: attemptsError } = await admin.rpc("get_auth_login_attempts", {
      p_username_normalized: username.normalized,
      p_ip_hash: ipHash,
    });
    if (attemptsError) {
      console.error("Login attempt lookup failed", attemptsError.code || "unknown");
      return json({ error: "Вход временно недоступен." }, 503);
    }

    if (Number(attempts) >= 3) {
      const challengeId = typeof body.challenge_id === "string" ? body.challenge_id : "";
      const answer = typeof body.captcha_answer === "string" ? body.captcha_answer.trim() : "";
      if (!challengeId || !/^\d{1,3}$/.test(answer)) {
        return json({ error: "Для следующей попытки сначала пройди проверку.", captcha_required: true }, 428);
      }
      const answerHash = await sha256(challengeId + "|" + username.normalized + "|" + ipHash + "|" + Number(answer));
      const { data: captchaValid, error: captchaError } = await admin.rpc("consume_auth_login_captcha", {
        p_challenge_id: challengeId,
        p_username_normalized: username.normalized,
        p_ip_hash: ipHash,
        p_answer_hash: answerHash,
      });
      if (captchaError) {
        console.error("Login CAPTCHA verification failed", captchaError.code || "unknown");
        return json({ error: "Проверка временно недоступна. Попробуй ещё раз." }, 503);
      }
      if (captchaValid !== true) return json({ error: "Ответ на проверку неверный или время проверки истекло.", captcha_invalid: true }, 400);
    }

    const { data: account, error: accountLookupError } = await admin
      .from("account_usernames")
      .select("auth_email")
      .eq("username_normalized", username.normalized)
      .maybeSingle();
    if (accountLookupError) {
      console.error("Username auth lookup failed", accountLookupError.code || "unknown");
      return json({ error: "Вход временно недоступен." }, 503);
    }
    const syntheticEmail = account?.auth_email || (crypto.randomUUID() + "@accounts.navigator.invalid");

    const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({
      email: syntheticEmail,
      password: body.password as string,
    });
    if (signInError || !signedIn.session || !signedIn.user) {
      const { data: nextAttempts, error: recordError } = await admin.rpc("record_auth_login_failure", {
        p_username_normalized: username.normalized,
        p_ip_hash: ipHash,
      });
      if (recordError) {
        console.error("Login failure counter update failed", recordError.code || "unknown");
        return json({ error: "Не удалось проверить вход. Попробуй позже." }, 503);
      }
      return json({
        error: "Неверный ник или пароль.",
        attempts: Number(nextAttempts) || 0,
        captcha_required: Number(nextAttempts) >= 3,
      }, 401);
    }

    const { error: resetError } = await admin.rpc("reset_auth_login_attempts", {
      p_username_normalized: username.normalized,
      p_ip_hash: ipHash,
    });
    if (resetError) console.warn("Could not clear login attempt counter", resetError.code || "unknown");
    return json({ session: signedIn.session, user: signedIn.user });
  }

  return json({ error: "Неизвестное действие." }, 400);
});
