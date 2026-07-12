# Vantage email templates

Transactional HTML for Supabase Auth (via Resend SMTP) and the Resend API.

## Confirm signup

| File | Purpose |
|------|---------|
| `templates/confirm-signup.html` | HTML body (paste into Supabase) |
| `templates/confirm-signup.txt` | Plain-text fallback (Resend multipart / reference) |
| `templates/confirm-signup.subject.txt` | Suggested subject line |

### Supabase setup

1. **Authentication → URL configuration** — set **Site URL** to `https://your-domain.com` (or `http://localhost:3000` in dev).
2. **Authentication → SMTP** — Resend:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: your `RESEND_API_KEY`
   - Sender: same as `RESEND_FROM_EMAIL` (e.g. `Vantage <noreply@yourdomain.com>`)
3. **Authentication → Email templates → Confirm signup**
   - **Subject:** `Confirm your Vantage account` (from `confirm-signup.subject.txt`)
   - **Body:** paste contents of `confirm-signup.html`

Variables used (Supabase Go templates):

- `{{ .ConfirmationURL }}` — primary confirm link
- `{{ .Token }}` — 6-digit OTP fallback (recommended when link prefetch breaks)
- `{{ .Email }}` — recipient
- `{{ .SiteURL }}` — app base URL

### Deliverability checklist

- **Domain:** verify your domain in Resend (SPF, DKIM, DMARC).
- **From address:** use a subdomain you control (`noreply@`, `auth@`).
- **Transactional vs marketing:** this template is **account security** — do not mix promo content.
- **Unsubscribe:** security emails are exempt from marketing unsubscribe rules; the footer links to **product updates** only (`/unsubscribe`, `/settings/notifications`).
- **Physical address:** replace the placeholder in the HTML/text footer with your legal business address (CAN-SPAM / GDPR).
- **List-Unsubscribe header:** for marketing sends via `POST /api/v1/email/send`, add headers in Resend (not available in Supabase template UI).
- **Plain text:** Supabase sends HTML only; Resend SMTP still benefits from a clean HTML/text ratio in the template (mostly text, one CTA).
- **Link prefetch:** enterprise filters may consume `ConfirmationURL` before the user clicks — OTP block `{{ .Token }}` is included as fallback.

### Footer links to implement in the app

| Path | Purpose |
|------|---------|
| `/settings/notifications` | Email preference center |
| `/unsubscribe?email=` | One-click unsubscribe from product updates |

Account security emails (confirm, reset password) must still be sent regardless of marketing opt-out.

### Support reply bridge (official From)

When a user submits **Support** in the app:

1. API emails `SUPPORT_INBOX_EMAIL` from `RESEND_FROM_EMAIL`.
2. **Reply-To** is `support+{user_id}@{SUPPORT_REPLY_DOMAIN}` (Resend Receiving).
3. Reply in Gmail as usual — Resend webhook receives it and relays the body to the user **from** `RESEND_FROM_EMAIL` (official Vantage).
4. If the user replies again, the same address forwards back to the support inbox.

**Resend setup required**

1. Verify domain `vantageserch.app` (SPF/DKIM) and set:
   - `RESEND_FROM_EMAIL=Vantage <noreply@vantageserch.app>`
   - `SUPPORT_INBOX_EMAIL=f62688798@gmail.com`
   - `SUPPORT_REPLY_DOMAIN=vantageserch.app`
2. Enable **Receiving** / MX for that domain in Resend.
3. Webhook URL: `POST {API_URL}/api/v1/email/webhook` — event `email.received` (+ keep `RESEND_WEBHOOK_SECRET`).

Agent tip: always use **Reply** on the ticket email so the `support+…` address is preserved.

### Send via API (multipart)

```python
from app.services.email_templates import render_supabase_template

html = render_supabase_template(
    "confirm-signup",
    ConfirmationURL="https://...",
    Token="482910",
    Email="user@example.com",
    SiteURL="https://your-domain.com",
)
```

### Preview

Open `preview/confirm-signup-preview.html` in a browser (static iframe; replace `{{ .… }}` manually for a full visual check).

