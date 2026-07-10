# ReserchMarket — Phase 0 (Foundation)

UI-прототип мигрирован на **Next.js 15** (App Router). Mock-данные удалены.

## Запуск (одной командой)

Из корня репозитория:

```bash
npm run setup   # первый раз
npm run dev     # frontend :3000 + backend :8000
```

PowerShell: `.\scripts\dev.ps1`

## Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Примени миграцию: `infra/supabase/migrations/20260708120000_initial_schema.sql`
3. Скопируй URL + anon key в `apps/web/.env.local`
4. Скопируй JWT secret в `apps/api/.env`

## Экраны

| Route | Описание |
|-------|----------|
| `/login`, `/signup` | Supabase Auth |
| `/dashboard` | Пустой workspace (exit criteria Phase 0) |
| `/research/new` | Форма без mock submit |
| `/research/[id]` | Placeholder до Phase 1 |

## Phase 0 checklist

- [x] Next.js 15 + Tailwind v4
- [x] Supabase Auth + protected routes
- [x] Empty dashboard (no mocks)
- [x] FastAPI health + JWT middleware
- [x] DB migration (profiles, projects, pgvector, RLS)
- [x] Loading/skeleton UI foundation
- [ ] Railway / Vercel deploy (manual)
- [ ] Sentry DSN (optional)
