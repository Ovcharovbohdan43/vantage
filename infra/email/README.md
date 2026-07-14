# Vantage email templates

Transactional HTML styled like GitHub account emails: light canvas, bordered card,
system fonts, green/dark CTAs, security notices, and a full professional footer.

Auth emails (confirm signup, reset password) go through **Supabase → Resend SMTP**.
App emails (welcome, support) go through **Resend API** (`apps/api`).

## Templates

| File | Purpose |
|------|---------|
| `templates/confirm-signup.html` | Confirm signup (paste into Supabase) |
| `templates/confirm-signup.txt` | Plain-text fallback |
| `templates/confirm-signup.subject.txt` | `Confirm your Vantage account` |
| `templates/magic-link.html` | Login OTP / magic link (paste into Supabase → Magic Link) |
| `templates/magic-link.txt` | Plain-text fallback |
| `templates/magic-link.subject.txt` | `Your Vantage sign-in code` |
| `templates/reset-password.html` | Reset password (paste into Supabase) |
| `templates/reset-password.txt` | Plain-text fallback |
| `templates/reset-password.subject.txt` | `Reset your Vantage password` |
| `templates/welcome-credits.html` | Signup welcome + credits (API) |
| `templates/welcome-credits.txt` | Plain-text fallback |
| `templates/welcome-credits.subject.txt` | Subject with `{{ .Credits }}` |

### Variables (Supabase Go / API renderer)

| Token | Used in | Meaning |
|-------|---------|---------|
| `{{ .ConfirmationURL }}` | confirm, reset | Primary action link |
| `{{ .Token }}` | confirm, reset, magic link | 6-digit OTP |
| `{{ .Email }}` | all | Recipient address |
| `{{ .SiteURL }}` | all | App base URL |
| `{{ .Credits }}` | welcome | Credit grant amount |

### Links included in every footer / body

- Site home: `{{ .SiteURL }}`
- Sign in / Forgot password / Dashboard / Account / Research / Library / Support
- Email preferences: `/settings/notifications`
- Unsubscribe (product updates only): `/unsubscribe?email=`

Security emails note that they cannot be unsubscribed.

## Sign-in email code (password + OTP)

Login requires password **and** a one-time code from email:

1. User enters email + password on `/login`
2. App verifies password, signs out the interim session, then calls `signInWithOtp`
3. Supabase sends the **Magic Link** template (code + optional link)
4. User enters the code on `/login` (or opens the link → `/auth/callback?type=email`)

Paste `templates/magic-link.*` into **Authentication → Email → Magic Link** in Supabase.

Magic link URL format:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard
```

## Confirm signup / Reset password

Email templates use **token_hash links** into the app (not Site URL alone):

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

`/auth/callback` calls `verifyOtp` / `exchangeCodeForSession`, then sends recovery to `/reset-password`.

1. User signs up or clicks **Forgot password?** → Supabase sends via Resend SMTP
2. Link hits `/auth/callback?token_hash=…&type=recovery|signup`
3. Recovery continues to `/reset-password`

### Supabase setup

1. **Authentication → URL configuration**
   - **Site URL:** your app origin (e.g. `https://your-domain.com` or `http://localhost:3000`) — not a blank path that drops users on marketing home without auth handling
   - **Redirect URLs** must include:
     - `https://your-domain.com/auth/callback`
     - `https://your-domain.com/auth/callback?flow=confirm`
     - `https://your-domain.com/auth/callback?flow=recovery`
     - `https://your-domain.com/auth/callback?next=/dashboard`
2. **Authentication → SMTP** — Resend (`smtp.resend.com`, user `resend`, password = API key)
3. Paste HTML bodies into **Email templates → Confirm signup**, **Magic Link**, and **Reset password** (use the files in `templates/`)

### Deliverability

- Verify domain SPF + DKIM + DMARC in Resend
- From mailbox on that domain (`noreply@…`)
- Auth/support are **transactional** — no promo, no tracking pixels
- Keep `{{ .Token }}` as OTP fallback for link-prefetching filters

## Welcome credits (API)

Rendered by `app.services.welcome_email` from `welcome-credits.*` on first successful profile touch. No vendor/tool brand names in copy.

## Support tickets (API)

Inbox emails use the same GitHub card layout with user id, email, deep links, and reply instructions.

## Preview

Open `preview/index.html` in a browser, or open `*-filled.html` directly.

## Send via API

```python
from app.services.email_templates import render_supabase_template
from app.services.resend_email import send_email

subject, html, text = render_supabase_template(
    "confirm-signup",
    ConfirmationURL="https://...",
    Token="482910",
    Email="user@example.com",
    SiteURL="https://your-domain.com",
)

await send_email(
    db,
    to=["user@example.com"],
    subject=subject,
    html=html,
    text=text,
    category="transactional",
    tags=[{"name": "type", "value": "confirm_signup"}],
)
```
