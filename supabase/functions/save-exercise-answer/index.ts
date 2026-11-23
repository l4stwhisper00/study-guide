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

async function readJsonBody(req: Request, maxBytes: number): Promise<{ body?: unknown; error?: "too_large" | "invalid" }> {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > maxBytes) return { error: "too_large" };
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json") || !req.body) return { error: "invalid" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { error: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { error: "invalid" };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { error: "invalid" };
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const origin = req.headers.get("Origin");
  if (origin && origin !== siteOrigin) return json({ error: "Origin not allowed" }, 403);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData.user) return json({ error: "Invalid session" }, 401);

  const { data: grant, error: grantError } = await admin
    .from("site_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (grantError || !grant) return json({ error: "Author access required" }, 403);

  const parsed = await readJsonBody(req, 16384);
  if (parsed.error === "too_large") return json({ error: "Request body is too large" }, 413);
  if (parsed.error || !parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) {
    return json({ error: "Invalid JSON request" }, 400);
  }

  const body = parsed.body as { exercise_id?: unknown; correct_answer?: unknown; explanation_md?: unknown };
  if (typeof body.exercise_id !== "string" || !uuidPattern.test(body.exercise_id) ||
      !Object.prototype.hasOwnProperty.call(body, "correct_answer")) {
    return json({ error: "A valid exercise_id and correct_answer are required" }, 400);
  }
  if (body.explanation_md !== undefined &&
      (typeof body.explanation_md !== "string" || body.explanation_md.length > 10000)) {
    return json({ error: "Explanation must be text of at most 10000 characters" }, 400);
  }

  let answerSize = 0;
  try {
    answerSize = new TextEncoder().encode(JSON.stringify(body.correct_answer)).byteLength;
  } catch {
    return json({ error: "Invalid answer format" }, 400);
  }
  if (answerSize > 2048) return json({ error: "Correct answer is too large" }, 413);

  const { error } = await admin.rpc("set_exercise_answer", {
    p_exercise_id: body.exercise_id,
    p_correct_answer: body.correct_answer,
    p_explanation_md: body.explanation_md || "",
  });
  if (error) {
    console.error("Saving exercise answer failed", error.code || "unknown");
    return json({ error: "Unable to save this answer key right now" }, 500);
  }
  return json({ success: true });
});
