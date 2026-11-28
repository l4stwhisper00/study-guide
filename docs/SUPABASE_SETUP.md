# School Navigator — Supabase production setup

The production identity provider and account database are isolated in the **School Navigator** Supabase project:

- Project: \`study-guide\`
- Region: \`eu-west-1\`
- Project ref: \`wedtrxpibedovdiwdoor\`
- Website: \`https://navigator.devs.li\`

This project is separate from GameClub. Do not copy keys, SQL, or data between projects.

## Authentication

The website's public registration and login forms use **nickname + password only**. Users are not asked for an email address, and the account flow does not send confirmation, recovery, or email-change messages.

Supabase Auth's password provider still requires an email or phone identifier internally. The trusted \`username-auth\` Edge Function therefore generates a random, opaque address under the reserved \`.invalid\` domain for each account. It is stored in the protected \`account_usernames\` table and is never displayed to users or used to send mail. The random alias prevents a visitor from deriving another user's Auth identifier from their nickname and calling the password endpoint directly to bypass the CAPTCHA.

Required settings:

1. Keep **Authentication → Providers → Email** enabled, because Supabase Auth uses the internal opaque identifier for password hashing and session issuance.
2. Disable public self-service signups in Supabase Auth settings. The Edge Function creates nickname accounts through the Admin API, so website registration continues to work; this prevents direct email-based signup through the public Auth endpoint.
3. Email confirmation can remain enabled globally: the trusted Edge Function creates users as already confirmed. No confirmation mail is needed.
4. Set the minimum password length to at least 8 characters (the site enforces 8–128).
5. Enable leaked-password protection if available on the project's plan. The current Supabase Security Advisor reports this protection as disabled.
6. Do not configure SMTP for account authentication. It is not used by this flow.
7. The public Edge Function \`username-auth\` must have JWT verification disabled because registration and login are public actions. It validates input and origin, applies rate limits, validates CAPTCHA challenges, and uses the service role only on the server.
8. Never expose the service-role key or other secret keys in browser code.

Protection:
- Nicknames are case-insensitive and unique; 3–24 Unicode letters/digits plus \`_\`, \`-\`, or \`.\`.
- Registration is limited to five accounts per IP hash per hour.
- Failed logins are counted per nickname and IP hash over 15 minutes.
- Starting with the third incorrect password, every further attempt requires a fresh server-validated arithmetic CAPTCHA.
- CAPTCHA challenges expire after five minutes and can be used once.
- Authentication tracking tables have RLS enabled and no grants to \`anon\` or \`authenticated\`.

**Password recovery limitation:** no real email or recovery channel is collected. Users can change their password while signed in. If they forget it, self-service recovery is unavailable.

## Browser configuration and data access

The browser contains only the project's public publishable key. This key is designed for public clients; it is not a secret.

- Expose the \`public\` schema in Project Settings → API → Data API.
- Keep RLS enabled on all public application tables.
- The private \`study-avatars\` Storage bucket must remain private. Policies restrict each object to the folder named after the authenticated user's UUID.
- Correct exercise answers remain in the private schema and are checked through authenticated Edge Functions.
- Do not use user-editable \`user_metadata\` for authorization decisions. The nickname displayed by the account page comes from server-controlled \`app_metadata.username\`.

## Owner account bootstrap

Register the owner's account normally using the chosen nickname. Then grant author access in the Supabase SQL editor:

\`\`\`sql
insert into public.site_admins(user_id)
select user_id
from public.account_usernames
where username_normalized = lower('OWNER_USERNAME')
on conflict (user_id) do nothing;
\`\`\`

Replace \`OWNER_USERNAME\` with the exact chosen nickname. Never grant admin rights automatically during public registration. Never expose write access to \`site_admins\` through the browser API.

## Existing learning data

The following content is independent of authentication and must be preserved:

- 30 exam courses
- 207 course modules
- 30 course lessons

User profiles, notes, scores, progress, and course plans remain scoped by \`auth.uid()\` through their existing RLS policies. The new username tables do not grant browser access to those records.

## Verification checklist

After the username-auth changes are published:

1. Register with a nickname and password; no email field or email should appear.
2. Register the same nickname with different letter casing and verify it is rejected as already taken.
3. Sign out, sign in with the nickname, and refresh the page; the session should restore.
4. Enter an incorrect password three times and verify a CAPTCHA appears before the next attempt.
5. Submit an incorrect CAPTCHA and verify the login is rejected; solve a fresh CAPTCHA and verify the next password attempt is processed.
6. Change the password while signed in, then verify the new password works.
7. Create a second test user and verify that the first user's profile, notes, progress, and avatar are inaccessible to the second user.
8. Run Supabase Security and Performance Advisors after schema changes.

No real-browser end-to-end test has been completed yet. Do not claim the flow is production-verified until these checks pass.
