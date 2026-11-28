-- Username-only account identities with server-validated login CAPTCHA.
create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  created_at timestamptz not null default now(),
  constraint account_usernames_username_length check (char_length(username) between 3 and 24)
);

create table if not exists public.auth_login_attempts (
  username_normalized text not null,
  ip_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  window_started_at timestamptz not null default now(),
  primary key (username_normalized, ip_hash)
);

create table if not exists public.auth_login_captchas (
  id uuid primary key default gen_random_uuid(),
  username_normalized text not null,
  ip_hash text not null,
  answer_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_login_captchas_expiry_idx
  on public.auth_login_captchas (expires_at);

alter table public.account_usernames enable row level security;
alter table public.auth_login_attempts enable row level security;
alter table public.auth_login_captchas enable row level security;

revoke all on table public.account_usernames, public.auth_login_attempts, public.auth_login_captchas
  from public, anon, authenticated;
grant all on table public.account_usernames, public.auth_login_attempts, public.auth_login_captchas
  to service_role;

create or replace function public.get_auth_login_attempts(
  p_username_normalized text,
  p_ip_hash text
) returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce((
    select a.failed_attempts
    from public.auth_login_attempts as a
    where a.username_normalized = p_username_normalized
      and a.ip_hash = p_ip_hash
      and a.window_started_at > now() - interval '15 minutes'
  ), 0);
$$;

create or replace function public.record_auth_login_failure(
  p_username_normalized text,
  p_ip_hash text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  insert into public.auth_login_attempts (
    username_normalized, ip_hash, failed_attempts, window_started_at
  ) values (
    p_username_normalized, p_ip_hash, 1, now()
  )
  on conflict (username_normalized, ip_hash) do update
    set failed_attempts = case
          when public.auth_login_attempts.window_started_at <= now() - interval '15 minutes' then 1
          else public.auth_login_attempts.failed_attempts + 1
        end,
        window_started_at = case
          when public.auth_login_attempts.window_started_at <= now() - interval '15 minutes' then now()
          else public.auth_login_attempts.window_started_at
        end
  returning failed_attempts into v_attempts;

  return v_attempts;
end;
$$;

create or replace function public.reset_auth_login_attempts(
  p_username_normalized text,
  p_ip_hash text
) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.auth_login_attempts
  where username_normalized = p_username_normalized
    and ip_hash = p_ip_hash;
$$;

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
  v_consumed uuid;
begin
  update public.auth_login_captchas
     set consumed_at = now()
   where id = p_challenge_id
     and username_normalized = p_username_normalized
     and ip_hash = p_ip_hash
     and answer_hash = p_answer_hash
     and expires_at > now()
     and consumed_at is null
  returning id into v_consumed;

  return v_consumed is not null;
end;
$$;

revoke all on function public.get_auth_login_attempts(text, text) from public, anon, authenticated;
revoke all on function public.record_auth_login_failure(text, text) from public, anon, authenticated;
revoke all on function public.reset_auth_login_attempts(text, text) from public, anon, authenticated;
revoke all on function public.consume_auth_login_captcha(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.get_auth_login_attempts(text, text) to service_role;
grant execute on function public.record_auth_login_failure(text, text) to service_role;
grant execute on function public.reset_auth_login_attempts(text, text) to service_role;
grant execute on function public.consume_auth_login_captcha(uuid, text, text, text) to service_role;
