create policy "Deny browser access to account usernames"
  on public.account_usernames
  for all to anon, authenticated
  using (false)
  with check (false);

create policy "Deny browser access to login attempts"
  on public.auth_login_attempts
  for all to anon, authenticated
  using (false)
  with check (false);

create policy "Deny browser access to login CAPTCHAs"
  on public.auth_login_captchas
  for all to anon, authenticated
  using (false)
  with check (false);

create policy "Deny browser access to signup attempts"
  on public.auth_signup_attempts
  for all to anon, authenticated
  using (false)
  with check (false);
