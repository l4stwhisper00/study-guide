create or replace function public.consume_auth_login_captcha(
  p_challenge_id uuid,
  p_username_normalized text,
  p_ip_hash text,
  p_answer_hash text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stored_hash text;
begin
  -- Consume the challenge on the first submitted answer, even when it is wrong.
  -- This prevents trying every possible answer against the same challenge.
  update public.auth_login_captchas
     set consumed_at = now()
   where id = p_challenge_id
     and username_normalized = p_username_normalized
     and ip_hash = p_ip_hash
     and expires_at > now()
     and consumed_at is null
  returning answer_hash into v_stored_hash;

  return v_stored_hash is not null and v_stored_hash = p_answer_hash;
end;
$$;

revoke all on function public.consume_auth_login_captcha(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.consume_auth_login_captcha(uuid, text, text, text) to service_role;
