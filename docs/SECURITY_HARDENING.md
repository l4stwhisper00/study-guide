# Security and production-readiness review

Last reviewed: 2026-11-28

## Authentication architecture

The username-only authentication implementation is being introduced on the \`feature/username-password-captcha\` branch. Its additive database schema and the \`username-auth\` Edge Function have been deployed to the School Navigator Supabase project; the website files are staged on the feature branch pending review and publication.

The public account UI asks only for a nickname and password. Supabase Auth still provides password hashing, access/refresh tokens, and session handling. The Edge Function assigns a random opaque identifier under the reserved \`.invalid\` domain internally; the identifier is not derived from the nickname and is never shown or used for mail. The nickname-to-identifier mapping is stored in a table inaccessible to browser roles.

The Edge Function validates requests, restricts browser origins to the production site, rate-limits registrations, tracks failed login attempts by nickname and IP hash, and requires a one-time server-validated CAPTCHA after three incorrect passwords. CAPTCHA answers are stored as hashes and expire after five minutes. The Edge Function is public by design (\`verify_jwt=false\`) because it handles registration and login; privileged operations use the service-role key only server-side.

**Important limitation:** there is no email address or other account-recovery channel. A user who forgets their password cannot self-recover the account. Users can change their password while signed in.

## Other application protections

- The browser contains only the public Supabase publishable key; no service-role key is present in public client code.
- User profiles and notes have owner-only RLS.
- The private \`study-avatars\` Storage bucket restricts each user's objects to their own UUID folder.
- Course read policies restrict learners to published courses, modules, lessons, and exercises. Admin writes are checked against the \`site_admins\` allowlist.
- Correct exercise answers remain in the private schema and are checked through authenticated Edge Functions.
- Exercise answer checking has a per-user request limit, bounded request bodies, UUID and answer-size validation, published-content checks, and non-cacheable responses.
- Future public-schema objects created by the migration role have restrictive default privileges.

## Important limits

This is a source-code and managed-database review, not a penetration test or certification. The live site's HTTP response headers, DNS, TLS, hosting account, backups, and browser behavior have not been independently verified from this environment.

The repository contains a custom-domain \`CNAME\` and is structured as a GitHub Pages static site. Before commercial operation, consider a commercial host that supports server-side response headers, observability, deployment controls, and an appropriate service agreement. Do not treat a meta tag as a substitute for HTTP security headers.

## Remaining production checks

1. Publish the username-auth website files only after static validation and review.
2. Complete real-browser tests for registration, duplicate nicknames, sign-in, CAPTCHA after three failures, password change, session restore, and cross-account isolation.
3. Run Supabase Security and Performance Advisors after the new schema changes and remediate any findings.
4. Configure GitHub branch protection/rulesets and require successful checks before merging production changes.
5. Configure tested database backups/PITR, perform a restore drill, and keep an incident-response and key-rotation procedure.
6. Add production monitoring, error tracking, uptime alerts, privacy/terms notices as applicable, and a documented data-retention/deletion process.
7. Obtain an independent security review before accepting substantial payments or storing sensitive learner information.

## Deploying changes safely

- Keep production changes in pull requests.
- Run repository validation and syntax checks before merging.
- Keep service keys only in Supabase-managed secrets or a trusted server secret store.
- Re-run Supabase Security and Performance Advisors after schema/policy changes.
- Never merge an untested migration or deploy an untested authentication flow to users.
