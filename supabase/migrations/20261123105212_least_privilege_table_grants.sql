REVOKE ALL PRIVILEGES ON TABLE
  public.exam_courses,
  public.course_modules,
  public.course_lessons,
  public.lesson_exercises,
  public.course_enrollments,
  public.lesson_progress,
  public.study_notes,
  public.site_admins
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.exam_courses,
  public.course_modules,
  public.course_lessons,
  public.lesson_exercises
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.exam_courses,
  public.course_modules,
  public.course_lessons,
  public.lesson_exercises
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.course_enrollments,
  public.lesson_progress,
  public.study_notes
TO authenticated;

GRANT SELECT ON TABLE public.site_admins TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE private.exercise_answer_keys FROM anon, authenticated;
