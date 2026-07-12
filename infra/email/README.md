# Vantage email templates

Transactional HTML for Supabase Auth (via Resend SMTP) and the Resend API.

Auth emails (confirm signup, reset password) go through **Supabase → Resend SMTP**.
App emails (support, product) go through **`POST /api/v1/email/send` → Resend API**.

## Confirm signup

| File | Purpose |
|------|---------|
| `templates/confirm-signup.html` | HTML body (paste into Supabase) |
| `templates/confirm-signup.txt` | Plain-text fallback (Resend multipart / reference) |
| `templates/confirm-signup.subject.txt` | Suggested subject line |

## Reset password

| File | Purpose |
|------|---------|
| `templates/reset-password.html` | HTML body (paste into Supabase → Reset password) |
| `templates/reset-password.txt` | Plain-text fallback |
| `templates/reset-password.subject.txt` | Suggested subject: `Reset your Vantage password` |

App flow:

1. User clicks **Forgot password?** on `/login` → `/forgot-password`
2. Supabase `resetPasswordForEmail` sends email via Resend SMTP
3. Link hits `/auth/callback?flow=recovery` → `/reset-password`
4. User sets a new password with `updateUser({ password })`

### Supabase setup

1. **Authentication → URL configuration**
   - **Site URL:** `https://your-domain.com` (or `http://localhost:3000` in dev)
   - **Redirect URLs** must include:
     - `https://your-domain.com/auth/callback`
     - `https://your-domain.com/auth/callback?flow=confirm`
     - `https://your-domain.com/auth/callback?flow=recovery`
     - `http://localhost:3000/auth/callback**` (dev)
2. **Authentication → SMTP** — Resend:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: your `RESEND_API_KEY`
   - Sender: same as `RESEND_FROM_EMAIL` (e.g. `Vantage <noreply@vantageserch.app>`)
3. **Authentication → Email templates → Confirm signup**
   - **Subject:** `Confirm your Vantage account`
   - **Body:** paste `confirm-signup.html`
4. **Authentication → Email templates → Reset password**
   - **Subject:** `Reset your Vantage password`
   - **Body:** paste `reset-password.html`

Variables used (Supabase Go templates):

- `{{ .ConfirmationURL }}` — primary action link
- `{{ .Token }}` — 6-digit OTP fallback (recommended when link prefetch breaks)
- `{{ .Email }}` — recipient
- `{{ .SiteURL }}` — app base URL

### Deliverability checklist (avoid spam)

- **Domain in Resend:** verify `vantageserch.app` (or your domain) with **SPF + DKIM**. Add **DMARC** (`p=none` → `quarantine`) at your DNS host.
- **From address:** use a mailbox on the verified domain (`noreply@…` / `auth@…`). Never send auth from `@gmail.com` or `resend.dev` in production.
- **Consistency:** `RESEND_FROM_EMAIL` must match the Supabase SMTP sender name/address.
- **Warm-up:** don’t blast marketing from a brand-new domain; keep volume low at first.
- **Transactional vs marketing:** auth/support are **security / transactional** — no promo copy, no tracking pixels in auth templates.
- **Multipart:** Resend API always sends **HTML + plain text** (`apps/api/app/services/resend_email.py`). For Supabase SMTP, paste a clean HTML template and keep the matching `.txt` as the reference text part if you send via API.
- **Headers (API sends):**
  - transactional → `Auto-Submitted`, `X-Auto-Response-Suppress`, tags `category=transactional`
  - marketing → `List-Unsubscribe` + `List-Unsubscribe-Post`, tags `category=marketing`
- **Unsubscribe:** security emails are exempt; footer links go to product updates only (`/unsubscribe`, `/settings/notifications`).
- **Physical address:** put a real postal address in templates when you send marketing (CAN-SPAM).
- **Link prefetch:** enterprise filters may consume `ConfirmationURL` — keep `{{ .Token }}` as OTP fallback.
- **Test:** use Resend’s “delivered / bounced / complained” webhooks and send yourself a confirm + reset before launch.

### Footer links to implement in the app

| Path | Purpose |
|------|---------|
| `/settings/notifications` | Email preference center |
| `/unsubscribe?email=` | One-click unsubscribe from product updates |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password after recovery link |

Account security emails (confirm, reset password) must still be sent regardless of marketing opt-out.

### Support reply bridge (official From)

When a user submits **Support** in the app:

1. API emails `SUPPORT_INBOX_EMAIL` from `RESEND_FROM_EMAIL`.
2. **Reply-To** is `support+{user_id}@{SUPPORT_REPLY_DOMAIN}` (Resend Receiving).
3. Reply in Gmail as usual — Resend webhook receives it and relays the body to the user **from** `RESEND_FROM_EMAIL` (official Vantage).
4. If the user replies again, the same address forwards back to the support inbox.

**Resend setup required**

1. Verify domain `vantageserch.app` (SPF/DKIM/DMARC) and set:
   - `RESEND_FROM_EMAIL=Vantage <noreply@vantageserch.app>`
   - `SUPPORT_INBOX_EMAIL=…`
   - `SUPPORT_REPLY_DOMAIN=vantageserch.app`
   - `APP_WEB_URL=https://your-domain.com` (used for List-Unsubscribe URLs)
2. Enable **Receiving** / MX for that domain in Resend.
3. Webhook URL: `POST {API_URL}/api/v1/email/webhook` — event `email.received` (+ keep `RESEND_WEBHOOK_SECRET`).

Agent tip: always use **Reply** on the ticket email so the `support+…` address is preserved.

### Send via API (multipart)

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

### Preview

Open `preview/confirm-signup-preview.html` in a browser (static iframe; replace `{{ .… }}` manually for a full visual check).
