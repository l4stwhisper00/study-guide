# Study Guide — Supabase production setup

The production identity provider and account database are isolated in the **Study Guide** Supabase project:

- Project: `study-guide`
- Region: `eu-west-1`
- Project ref: `wedtrxpibedovdiwdoor`
- Website: `https://navigator.devs.li`

This is separate from GameClub. Do not copy keys, SQL or data between the projects.

## What is implemented

- Email/password registration and login using Supabase Auth.
- Email verification and resend-confirmation flow.
- Password reset by email, password update, and email-change confirmation.
- Persistent Supabase sessions across the site's static pages.
- Per-user profile, notes, exam scores, exam-topic progress and generated study plans.
- Private avatar bucket with a per-user folder policy.
- Legacy browser demo profile/note import on the first successful login with the same email. The old browser password hash is removed only after the profile and notes have been copied successfully. Passwords themselves are never migrated from browser storage.

The browser contains only the project's public publishable key. A publishable key is expected in a browser app; it is not a secret. Never add a service-role or secret key to repository files.

## Required Supabase Dashboard settings

These settings cannot be verified or changed through the connected database interface and must be confirmed in the Supabase Dashboard before relying on email flows in production.

1. **Authentication → Providers → Email**
   - Keep Email enabled.
   - Keep **Confirm email** enabled.
   - Set the minimum password length to 6 characters (matching the site forms).
   - Enable leaked-password protection if available on the project's plan.

2. **Authentication → URL Configuration**
   - Site URL: `https://navigator.devs.li`
   - Add this Redirect URL: `https://navigator.devs.li/account.html`
   - If a staging domain is used, add only that exact staging callback too. Avoid a broad wildcard unless it is required.

3. **Authentication → SMTP Settings**
   - Configure a custom SMTP sender and verify the sending domain (SPF/DKIM/DMARC).
   - The built-in Supabase email sender is only suitable for testing and has a strict sending limit. Do not launch public registration with the default sender.

4. **Project Settings → API → Data API**
   - Enable the Data API.
   - Expose the `public` schema.
   - The project has explicit RLS and grants for browser-accessible tables.

5. **Storage**
   - Confirm that the private `study-avatars` bucket exists.
   - Do not make it public. Policies restrict every object operation to the folder named after the authenticated user's UUID.

## Account bootstrap

The site is ready for users to self-register. No owner email has been hard-coded and no account has been granted admin rights automatically.

After the owner has registered and confirmed the email address, give the owner author access with this SQL (replace the address):

```sql
insert into public.site_admins(user_id)
select id
from auth.users
where lower(email) = lower('OWNER_EMAIL')
on conflict (user_id) do nothing;
```

Never expose insert/update/delete access to `site_admins` through the browser API. Only the trusted project owner should be added.

## Data protection

- `study_profiles`: RLS restricts every row to its owner.
- `study_notes`: RLS restricts every row to its owner.
- `lesson_progress` and `course_enrollments`: existing ownership policies remain in place.
- `study-avatars`: private bucket; users can read, upload, update and delete only files under their own UUID folder.
- Correct exercise answers remain in the private schema and are checked through authenticated Edge Functions.
- Do not use user-editable `user_metadata` for admin or access-control decisions.

## Verification checklist

After Dashboard setup:

1. Register a new test account and confirm the email arrives.
2. Confirm the link returns to `/account.html` and the account becomes signed in.
3. Sign out, sign back in, and refresh the page; the session should be restored.
4. Request password reset and confirm the link opens the new-password form.
5. Change the email and confirm the new address according to the configured confirmation flow.
6. Add a note and edit the profile; sign in from another browser and verify that data appears.
7. Upload an avatar; check that its storage object is private and that a different user cannot read or delete it.
8. Create a second test user and verify that the first user's profile, notes, progress, and avatar are not accessible to the second user.
9. Run Supabase Security and Health Advisors after any further RLS/storage change.

The repository's automated checks do not replace these email-delivery, browser-session and cross-account isolation tests. No end-to-end test using a real mailbox has been completed yet.
