import { Hono } from "hono";
import { z } from "zod";
import { upsertProduct, getCachedReviews, saveReviews, listReviews } from "../catalog.js";
import { config, type Source } from "../config.js";
import { crawlProductReviews } from "../crawl/reviews.js";
import { resolveProductRef } from "../product.js";

const collectBodySchema = z.object({
  query: z.string().min(1),
  source: z.enum(["g2", "capterra"]),
  maxReviews: z.number().int().min(1).max(500).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  forceRefresh: z.boolean().optional(),
});

export const collectRoutes = new Hono();

collectRoutes.post("/", async (c) => {
  let body: z.infer<typeof collectBodySchema>;
  try {
    body = collectBodySchema.parse(await c.req.json());
  } catch (err) {
    return c.json({ error: "invalid_body", details: String(err) }, 400);
  }

  const maxReviews = body.maxReviews ?? 100;
  const maxRating = body.maxRating ?? config.maxNegativeRating;
  const source = body.source as Source;

  let ref = resolveProductRef(body.query, source);
  let product = await upsertProduct(ref);

  if (!body.forceRefresh) {
    const cached = await getCachedReviews(product.id, { maxReviews, maxRating });
    // Fresh cache (full, partial, or empty/negative) — skip recrawl within TTL.
    if (cached.fresh) {
      return c.json({
        cached: true,
        status: cached.reviews.length > 0 ? "ok" : "empty",
        blocked: false,
        product: {
          id: product.id,
          source: product.source,
          productKey: product.productKey,
          url: product.url,
          name: product.name,
        },
        reviews: cached.reviews.slice(0, maxReviews),
        stats: {
          fromCache: cached.reviews.length,
          scraped: 0,
          inserted: 0,
          pagesFetched: 0,
          returned: Math.min(maxReviews, cached.reviews.length),
          cacheCount: cached.count,
        },
        errors: cached.count === 0 ? ["fresh_negative_cache"] : [],
      });
    }
  }

  const crawl = await crawlProductReviews(ref, { maxReviews, maxRating });

  // Capterra/G2 name search may resolve a concrete product key/url
  if (crawl.productKey !== ref.productKey || crawl.resolvedUrl !== ref.url) {
    ref = {
      ...ref,
      productKey: crawl.productKey,
      url: crawl.resolvedUrl,
    };
    product = await upsertProduct(ref);
  }

  const inserted = await saveReviews(product, crawl.reviews);
  const reviews = await listReviews(product.id, source, { maxReviews, maxRating });

  const status = crawl.status;
  const blocked = status === "blocked";
  // not_found / empty are definitive — return 200 so API can skip Apify.
  // blocked / error with zero reviews → 502 only when nothing usable returned.
  const httpStatus = reviews.length === 0 && (status === "blocked" || status === "error") ? 502 : 200;

  return c.json(
    {
      cached: false,
      status,
      blocked,
      product: {
        id: product.id,
        source: product.source,
        productKey: product.productKey,
        url: product.url,
        name: product.name,
      },
      reviews,
      stats: {
        fromCache: 0,
        scraped: crawl.reviews.length,
        inserted,
        pagesFetched: crawl.pagesFetched,
        returned: reviews.length,
      },
      errors: crawl.errors,
    },
    httpStatus,
  );
});
