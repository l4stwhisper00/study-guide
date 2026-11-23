CREATE TABLE IF NOT EXISTS private.exercise_check_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
);

ALTER TABLE private.exercise_check_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE private.exercise_check_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_exercise_check_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_now timestamptz := now();
  v_attempts integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO private.exercise_check_rate_limits AS rate_limit
    (user_id, window_started_at, attempt_count)
  VALUES
    (p_user_id, v_now, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN rate_limit.window_started_at <= v_now - interval '60 seconds'
      THEN v_now
      ELSE rate_limit.window_started_at
    END,
    attempt_count = CASE
      WHEN rate_limit.window_started_at <= v_now - interval '60 seconds'
      THEN 1
      ELSE rate_limit.attempt_count + 1
    END
  RETURNING attempt_count INTO v_attempts;

  RETURN v_attempts <= 30;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_exercise_check_rate_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_exercise_check_rate_limit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.check_exercise_answer(p_exercise_id uuid, p_answer jsonb)
RETURNS TABLE(is_correct boolean, explanation_md text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT (k.correct_answer = p_answer), k.explanation_md
  FROM private.exercise_answer_keys AS k
  JOIN public.lesson_exercises AS e ON e.id = k.exercise_id
  JOIN public.course_lessons AS l ON l.id = e.lesson_id
  JOIN public.course_modules AS m ON m.id = l.module_id
  JOIN public.exam_courses AS c ON c.id = m.course_id
  WHERE k.exercise_id = p_exercise_id
    AND l.is_published = true
    AND c.status = 'published';
$function$;

REVOKE ALL ON FUNCTION public.check_exercise_answer(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_exercise_answer(uuid, jsonb) TO service_role;
