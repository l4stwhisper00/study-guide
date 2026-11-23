CREATE TABLE IF NOT EXISTS public.study_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 80),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
  avatar_path text,
  cover_index smallint NOT NULL DEFAULT 0 CHECK (cover_index BETWEEN 0 AND 5),
  course_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  exam_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  exam_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.study_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.study_profiles TO authenticated;

CREATE POLICY "Users read own study profile"
ON public.study_profiles
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users create own study profile"
ON public.study_profiles
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own study profile"
ON public.study_profiles
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-avatars',
  'study-avatars',
  false,
  409600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 409600,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

CREATE POLICY "Users read own study avatar"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'study-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users upload own study avatar"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'study-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users update own study avatar"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'study-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'study-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users delete own study avatar"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'study-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
