# Study Guide — Supabase setup

The Study Guide backend is isolated in the Supabase project `study-guide` (region `eu-west-1`). It is separate from the GameClub project.

## Public browser configuration

`supabase-config.js` contains only the project URL and publishable key. Never put a Supabase secret or service-role key in browser files.

## Required Dashboard settings

1. In **Project Settings → API → Data API**, enable the Data API and include the `public` schema in exposed schemas. New projects may not expose public tables by default.
2. In **Authentication → URL Configuration**, set the Site URL to `https://navigator.devs.li` and add `https://navigator.devs.li/**` to Redirect URLs.
3. Keep email confirmation enabled. For reliable production delivery, configure a custom SMTP provider under **Authentication → SMTP Settings**. Do not commit SMTP credentials to Git.
4. After the owner has registered and confirmed their email, grant author access by running this in the SQL Editor, replacing the email with the owner's address:

```sql
insert into public.site_admins(user_id)
select id from auth.users where lower(email) = lower('OWNER_EMAIL')
on conflict (user_id) do nothing;
```

Only the site owner should be added to `site_admins`. The table has RLS enabled and users cannot grant themselves author rights.

## Data model

- `exam_courses`: versioned OGE/EGE subject catalogue; public can read published courses.
- `course_modules`: course syllabus outline.
- `course_lessons`: theory, definitions, worked examples, formulas and step-by-step solutions.
- `lesson_exercises`: public exercise prompts and answer options.
- `private.exercise_answer_keys`: private correct answers and explanations. Never expose this schema.
- `course_enrollments`, `lesson_progress`, `study_notes`: per-user learning data protected by RLS.
- `site_admins`: trusted author allowlist.

The Edge Functions `save-exercise-answer` and `check-exercise-answer` require a valid JWT. The save function additionally verifies membership in `site_admins`. Correct answers and explanations are stored privately and are returned only after a submitted answer is checked.

## Exam-year policy

The initial catalogue is versioned for 2027, based on the approved FIPI demo materials, specifications and codifiers. Update the year and source links when FIPI publishes the next approved set. Do not copy third-party exam variants into the site; link to external practice platforms such as Reshu OGE/EGE instead.
