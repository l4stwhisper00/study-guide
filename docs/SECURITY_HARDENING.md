# Security and production-readiness review

Last reviewed: 2026-11-23

## What has been checked

- Supabase is a separate project from GameClub. Browser configuration contains a publishable key only; no service-role key was found in the public repository search.
- RLS is enabled on the eight public application tables and the private exercise-answer table.
- Course read policies restrict learners to published courses, modules, lessons, and exercises. Admin writes are checked against the `site_admins` allowlist.
- Correct exercise answers are stored in the private schema. The answer-key RPCs are executable only by `service_role`.
- Public table grants have been reduced to the minimum required: anonymous users can read the public course catalogue only; signed-in users can perform the learning operations required by the site; only the backend role can manage private answer keys.
- Answer checking now has a per-user limit of 30 requests per 60-second window, bounded request bodies, UUID and answer-size validation, published-content checks, and non-cacheable responses.
- Saving answer keys checks the JWT and server-side admin allowlist, enforces request limits, validates input, and avoids returning raw database errors.
- Supabase Security and Health Advisors returned no remaining lints after the final policy adjustment.

## Important limits

This is a source-code and managed-database review, not a penetration test or a certification. The live site's HTTP response headers, DNS, TLS, hosting account, backups, email delivery, and browser behaviour have not been independently verified from this environment.

The repository contains a custom-domain `CNAME` and is structured as a GitHub Pages static site. GitHub Pages is intended for static project sites, not a paid SaaS or online business service. Before commercial operation, move the customer-facing application to a commercial host that supports server-side response headers, observability, deployment controls, and an appropriate service agreement. Do not treat a meta tag as a substitute for HTTP security headers. See GitHub's Pages terms: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Production blockers to resolve before taking money

1. The current `main` account page remains a browser-only demo: identity, profile and notes are stored in localStorage, with no server-side identity or access control. New demo passwords are now derived with PBKDF2-HMAC-SHA-256 (600,000 iterations, random 16-byte salt); legacy SHA-256 demo records are upgraded after a successful login. This only improves the local demo's resistance to offline guessing. It does not make localStorage private or tamper-proof, and it is not suitable for real customer accounts or sensitive personal data. See the [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The Supabase-backed implementation exists on a separate draft pull request and is not yet the live site.
2. The Supabase Auth Site URL, redirect allowlist, custom SMTP, Data API exposure, owner account and owner-admin grant must be configured and tested in the Dashboard.
3. The new course pages and backend remain in an unmerged draft pull request. Complete browser-based end-to-end tests against staging before merging or publishing.
4. Configure GitHub branch protection/rulesets, require successful checks before merging, and require review for production changes. The connected GitHub integration could read the repository rulesets (none were returned) but could not read the branch-protection endpoint, so protection status is not confirmed.
5. Configure tested database backups/PITR, perform a restore drill, and keep an incident-response and key-rotation procedure.
6. Add production monitoring, error tracking, uptime alerts, privacy/terms/cookie notices as applicable, and a documented data-retention/deletion process.
7. Obtain an independent security review before accepting substantial payments or storing sensitive learner information.

## Deploying changes safely

- Keep the production branch protected.
- Use pull requests and run CodeQL plus the repository validation workflow.
- Keep service keys only in Supabase-managed secrets or a trusted server secret store.
- Re-run Supabase Security and Health Advisors after every schema/policy change.
- Never merge an untested migration or deploy a new auth flow directly to paying users.
