CREATE POLICY "Service role manages exercise check rate limits"
ON private.exercise_check_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
