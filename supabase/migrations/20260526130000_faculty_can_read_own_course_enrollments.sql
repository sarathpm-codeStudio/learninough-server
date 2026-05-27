-- Faculty dashboard and student lists query enrollments for courses they own.
-- Without this policy, authenticated faculty SELECT returns 0 rows (RLS).
CREATE POLICY "Faculty can read enrollments for own courses"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courses
    WHERE courses.id = enrollments.course_id
      AND courses.faculty_id = auth.uid()
  )
);
