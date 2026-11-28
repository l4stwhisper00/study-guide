# Username/password authentication

The public account form uses a nickname and password only. Users are never asked for a real email address and the application does not send confirmation, recovery, or email-change messages.

## How identity works

Supabase Auth's password provider requires an email or phone identifier. To preserve Supabase's password hashing, session issuance, refresh tokens, and account isolation without collecting a real address, the server derives a non-deliverable address in the reserved \`.invalid\` domain from the normalized nickname. It is generated and used only inside the trusted Edge Function; it is never shown in the UI or sent by email.

Nicknames are stored in \`public.account_usernames\`, with a unique normalized value. The Edge Function sets the canonical nickname in \`app_metadata.username\`; user-editable metadata is not used as the source of truth for the displayed account nickname.

## Abuse protection

- Nicknames are 3–24 Unicode letters/digits plus \`_\`, \`-\`, or \`.\`.
- Passwords are 8–128 characters.
- Registration is limited to five accounts per IP hash per hour.
- Failed logins are counted per normalized nickname and IP hash in a 15-minute window.
- Starting with the third incorrect password, every subsequent login requires a fresh arithmetic challenge.
- CAPTCHA answers are stored only as hashes, expire after five minutes, and are consumed once.
- Login attempt tables and functions are inaccessible to \`anon\` and \`authenticated\`; only the Edge Function's service role can use them.
- The Edge Function accepts requests only from \`https://navigator.devs.li\` in browser contexts and does not expose a service-role key.

The arithmetic CAPTCHA is a lightweight anti-automation layer, not a guarantee against a determined attacker. Supabase Auth's own protections and password hashing remain enabled.

## Password recovery limitation

There is no email address or other recovery channel. A user who forgets their password cannot self-recover the account. Users can change their password while signed in from the account security section. Do not promise email-based recovery.

## Supabase setup

- Keep the Supabase Email password provider enabled: it is used internally with the non-deliverable identifier.
- The Edge Function \`username-auth\` must be deployed with JWT verification disabled because registration and login are public actions. It performs input validation, origin checks, rate limiting, CAPTCHA validation, and all privileged database operations server-side.
- Do not expose \`service_role\` or secret keys in browser code.
- The \`public.account_usernames\`, \`public.auth_login_attempts\`, \`public.auth_login_captchas\`, and \`public.auth_signup_attempts\` tables have RLS enabled and no browser-role grants.
- The owner bootstrap query is:

\`\`\`sql
insert into public.site_admins(user_id)
select user_id
from public.account_usernames
where username_normalized = lower('OWNER_USERNAME')
on conflict (user_id) do nothing;
\`\`\`

Replace \`OWNER_USERNAME\` with the owner's chosen nickname. Never grant admin rights automatically during public registration.
