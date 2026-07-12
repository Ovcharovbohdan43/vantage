# Security notes (Vantage)

## What is public by design (browser)

| Value | Why |
|-------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon JWT — **must** rely on RLS |
| `NEXT_PUBLIC_API_URL` | Backend origin |

Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, or `COLLECTOR_API_KEY` in `apps/web` or any `NEXT_PUBLIC_*` var.

## Apply after deploy

1. Run migration `infra/supabase/migrations/20260712180000_security_harden_rls.sql` on Supabase.
2. Confirm `DEBUG=false` and `RESEND_WEBHOOK_SECRET` set on Railway API.
3. Keep `CORS_ORIGINS` to exact production domains (no `*`).
4. Prefer private networking between API ↔ review-collector; do not expose collector publicly if avoidable.

## Remaining hardening (ops)

- Add edge rate limits (Cloudflare / Railway / API gateway) on `/projects`, `/support`, auth.
- Rotate keys if `apps/web/.env` ever held API secrets and was shared.
- Verify DMARC/SPF/DKIM for email deliverability (not authz, but abuse surface).
