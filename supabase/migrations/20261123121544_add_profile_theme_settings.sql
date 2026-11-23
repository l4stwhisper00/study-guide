ALTER TABLE public.study_profiles
  ADD COLUMN IF NOT EXISTS theme_settings jsonb NOT NULL
  DEFAULT '{"preset":"midnight","accent":"#8b7cf6","background":"#0b0d12"}'::jsonb;

ALTER TABLE public.study_profiles
  DROP CONSTRAINT IF EXISTS study_profiles_theme_settings_object_check;

ALTER TABLE public.study_profiles
  ADD CONSTRAINT study_profiles_theme_settings_object_check
  CHECK (jsonb_typeof(theme_settings) = 'object');
