# Фирменные письма «Школьного навигатора»

Готовые HTML-шаблоны для Supabase Auth. Они не меняют механику авторизации и используют штатные защищённые ссылки/токены Supabase.

## Что настроить в Supabase

1. Открой **Authentication → Email Templates**.
2. Вставь содержимое соответствующего HTML-файла в шаблон:
   - **Confirm signup** → `confirmation.html`
   - **Reset password** → `recovery.html`
   - **Change email address** → `email_change.html`
   - **Magic Link** → `magic_link.html`
   - **Reauthentication** → `reauthentication.html`
3. В **Authentication → URL Configuration** проверь Site URL: `https://navigator.devs.li`. Redirect URLs должны включать нужные страницы сайта.
4. В **Authentication → SMTP Settings** включи Custom SMTP после создания и проверки отправляющего домена в Resend.
5. В настройках SMTP укажи имя отправителя **Школьный навигатор** и адрес вида `no-reply@navigator.devs.li` (только после верификации домена).
6. Включи security notifications и используй:
   - **Password changed** → `password_changed_notification.html`
   - **Email changed** → `email_changed_notification.html`

## Важные ограничения

- HTML-шаблоны сами по себе не меняют имя отправителя и не настраивают доставку. Это отдельные настройки SMTP.
- Не вставляй API key Resend, SMTP password или Supabase service-role key в репозиторий, HTML или клиентский JavaScript.
- DNS-записи SPF/DKIM/DMARC нужно добавить у DNS-провайдера домена по точным значениям, которые покажет Resend. Не угадывай и не заменяй существующие MX/SPF-записи без проверки.
- После настройки протестируй регистрацию, восстановление пароля и смену почты на отдельном тестовом адресе.
