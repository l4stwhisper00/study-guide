-- Each nickname maps to a random, opaque Auth email identifier.
-- This prevents clients from deriving the Auth identifier and bypassing the
-- server-side CAPTCHA gate by calling Supabase Auth directly.
alter table public.account_usernames
  add column if not exists auth_email text;

create unique index if not exists account_usernames_auth_email_uidx
  on public.account_usernames (auth_email);

alter table public.account_usernames
  alter column auth_email set not null;
