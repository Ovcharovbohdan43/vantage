# Review Collector (Crawlee + Webshare)

Drop-in replacement for Apify `zen-studio/software-review-scraper`.
Scrapes G2 / Capterra via Crawlee Playwright + Webshare rotating residential proxies,
and caches reviews in Postgres (`review_products` / `catalog_reviews`).

## Endpoints

- `GET /health` — liveness
- `POST /v1/collect` — collect reviews (requires `Authorization: Bearer <COLLECTOR_API_KEY>`)

### Request

```json
{
  "query": "https://www.g2.com/products/slack/reviews",
  "source": "g2",
  "maxReviews": 100,
  "maxRating": 3,
  "forceRefresh": false
}
```

### Response

```json
{
  "cached": true,
  "product": { "id": "...", "source": "g2", "productKey": "slack", "url": "...", "name": null },
  "reviews": [{ "source": "g2", "text": "...", "rating": 2, "title": "...", "author": "...", "reviewDate": "...", "language": null }],
  "stats": { "fromCache": 100, "scraped": 0, "inserted": 0, "pagesFetched": 0, "returned": 100 },
  "errors": []
}
```

Cache hit requires: `last_scraped_at` within `CACHE_TTL_HOURS` **and** enough rows with `rating <= maxRating`.

## Webshare

Prefer **Username / Password** auth (Railway egress IPs change). Set:

```
WEBSHARE_PROXY_USERNAME=...
WEBSHARE_PROXY_PASSWORD=...
WEBSHARE_PROXY_HOST=p.webshare.io
WEBSHARE_PROXY_PORT=80
```

Authorized IP mode only works with a fixed egress IP.

## Local

```bash
cd apps/review-collector
cp .env.example .env
npm install
npx playwright install chromium
npm run dev
```

Apply migration `infra/supabase/migrations/20260712140000_review_catalog.sql` before first run.

## Railway

- Root directory / Dockerfile: `apps/review-collector/Dockerfile` (build context = repo root)
- Port: `8080`
- Env: `DATABASE_URL`, `COLLECTOR_API_KEY`, Webshare vars
