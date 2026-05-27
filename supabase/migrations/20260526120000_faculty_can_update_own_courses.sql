-- Allow faculty to update their own courses (PATCH /faculty/courses/:id).
-- Without this policy, authenticated faculty updates return 0 rows and
-- PostgREST responds with "Cannot coerce the result to a single JSON object".
CREATE POLICY "Faculty can update own courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());
