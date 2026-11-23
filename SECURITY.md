# Security policy

## Reporting a vulnerability

Please report suspected security issues privately through GitHub Security Advisories. The repository owner must enable **Private vulnerability reporting** in GitHub Settings → Security & analysis for this link to accept private reports:

https://github.com/l4stwhisper00/study-guide/security/advisories/new

Do not publish exploit steps, personal data, access tokens, passwords, or database contents in a public issue.

Include the affected page or endpoint, impact, reproduction steps, and (when possible) a minimal proof of concept that does not access another person's data.

## Scope

This policy covers the source code and services operated for the Study Guide project, including the public website, Supabase API, database policies, and Edge Functions.

Only test accounts and data you own or have explicit permission to use. Do not perform denial-of-service tests, phishing, credential stuffing, destructive tests, or access other users' records.

## Handling and disclosure

The maintainer will review reports and may request reasonable clarification. There is no guaranteed response time or bug-bounty programme. Please allow time for a fix before publicly disclosing a confirmed vulnerability.

## Security baseline

- Never commit Supabase service-role or secret API keys.
- Keep user data protected by Row Level Security and least-privilege SQL grants.
- Keep authoring operations behind the server-verified admin allowlist.
- Treat all browser-provided content as untrusted.
- Test restore procedures before relying on backups.
