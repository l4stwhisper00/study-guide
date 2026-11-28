create table if not exists public.auth_signup_attempts (
  ip_hash text primary key,
  signup_count integer not null default 0 check (signup_count >= 0),
  window_started_at timestamptz not null default now()
);

alter table public.auth_signup_attempts enable row level security;
revoke all on table public.auth_signup_attempts from public, anon, authenticated;
grant all on table public.auth_signup_attempts to service_role;

create or replace function public.consume_auth_signup_slot(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.auth_signup_attempts (ip_hash, signup_count, window_started_at)
  values (p_ip_hash, 1, now())
  on conflict (ip_hash) do update
    set signup_count = case
          when public.auth_signup_attempts.window_started_at <= now() - interval '1 hour' then 1
          else public.auth_signup_attempts.signup_count + 1
        end,
        window_started_at = case
          when public.auth_signup_attempts.window_started_at <= now() - interval '1 hour' then now()
          else public.auth_signup_attempts.window_started_at
        end
  returning signup_count into v_count;

  return v_count <= 5;
end;
$$;

revoke all on function public.consume_auth_signup_slot(text) from public, anon, authenticated;
grant execute on function public.consume_auth_signup_slot(text) to service_role;
