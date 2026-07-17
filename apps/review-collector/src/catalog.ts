import type { ScrapedReview, Source } from "./config.js";
import { config } from "./config.js";
import { getPool } from "./db.js";
import { computeContentHash } from "./hash.js";
import type { ProductRef } from "./product.js";

export type CatalogProduct = {
  id: string;
  source: Source;
  productKey: string;
  url: string;
  name: string | null;
  lastScrapedAt: Date | null;
};

export async function upsertProduct(ref: ProductRef): Promise<CatalogProduct> {
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    source: Source;
    product_key: string;
    url: string;
    name: string | null;
    last_scraped_at: Date | null;
  }>(
    `INSERT INTO public.review_products (source, product_key, url, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source, product_key) DO UPDATE SET
       url = EXCLUDED.url,
       name = COALESCE(EXCLUDED.name, public.review_products.name)
     RETURNING id, source, product_key, url, name, last_scraped_at`,
    [ref.source, ref.productKey, ref.url, ref.nameHint],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    source: row.source,
    productKey: row.product_key,
    url: row.url,
    name: row.name,
    lastScrapedAt: row.last_scraped_at,
  };
}

/**
 * Fresh cache is served even when partial (< maxReviews) or empty (negative cache).
 * Empty + fresh means we already crawled recently and found nothing — skip recrawl.
 */
export async function getCachedReviews(
  productId: string,
  opts: { maxReviews: number; maxRating: number },
): Promise<{ count: number; reviews: ScrapedReview[]; fresh: boolean }> {
  const { maxReviews, maxRating } = opts;
  const pool = getPool();
  const ttlMs = config.cacheTtlHours * 60 * 60 * 1000;

  const meta = await pool.query<{ last_scraped_at: Date | null; source: Source }>(
    `SELECT last_scraped_at, source FROM public.review_products WHERE id = $1`,
    [productId],
  );
  const product = meta.rows[0];
  if (!product) return { count: 0, reviews: [], fresh: false };

  const lastScraped = product.last_scraped_at ? new Date(product.last_scraped_at).getTime() : 0;
  const fresh = lastScraped > 0 && Date.now() - lastScraped < ttlMs;

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM public.catalog_reviews
     WHERE product_id = $1
       AND (rating IS NULL OR rating <= $2)`,
    [productId, maxRating],
  );
  const count = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

  if (!fresh) {
    return { count, reviews: [], fresh: false };
  }

  // Fresh empty = negative cache (do not recrawl within TTL).
  if (count === 0) {
    return { count: 0, reviews: [], fresh: true };
  }

  const rows = await pool.query<{
    text: string;
    rating: number | null;
    title: string | null;
    author: string | null;
    review_date: Date | null;
    language: string | null;
  }>(
    `SELECT text, rating, title, author, review_date, language
     FROM public.catalog_reviews
     WHERE product_id = $1
       AND (rating IS NULL OR rating <= $2)
     ORDER BY rating ASC NULLS LAST, review_date DESC NULLS LAST
     LIMIT $3`,
    [productId, maxRating, maxReviews],
  );

  return {
    count,
    fresh: true,
    reviews: rows.rows.map((r) => ({
      source: product.source,
      text: r.text,
      rating: r.rating,
      title: r.title,
      author: r.author,
      reviewDate: r.review_date ? new Date(r.review_date).toISOString() : null,
      language: r.language,
    })),
  };
}

export async function saveReviews(
  product: CatalogProduct,
  reviews: ScrapedReview[],
): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query("BEGIN");
    if (reviews.length > 0) {
      // Bulk insert via unnest for speed when many reviews land at once.
      const productIds: string[] = [];
      const hashes: string[] = [];
      const ratings: Array<number | null> = [];
      const titles: Array<string | null> = [];
      const texts: string[] = [];
      const languages: Array<string | null> = [];
      const authors: Array<string | null> = [];
      const dates: Array<string | null> = [];

      for (const review of reviews) {
        const text = review.text.trim();
        if (text.length < config.minReviewLength) continue;
        productIds.push(product.id);
        hashes.push(computeContentHash(product.productKey, product.source, text));
        ratings.push(review.rating);
        titles.push(review.title);
        texts.push(text);
        languages.push(review.language);
        authors.push(review.author);
        dates.push(review.reviewDate);
      }

      if (texts.length > 0) {
        const result = await client.query(
          `INSERT INTO public.catalog_reviews
             (product_id, content_hash, rating, title, text, language, author, review_date)
           SELECT * FROM UNNEST(
             $1::uuid[], $2::text[], $3::int[], $4::text[], $5::text[], $6::text[], $7::text[], $8::timestamptz[]
           )
           ON CONFLICT (product_id, content_hash) DO NOTHING`,
          [productIds, hashes, ratings, titles, texts, languages, authors, dates],
        );
        inserted = result.rowCount ?? 0;
      }
    }

    // Always stamp last_scraped_at — even on empty crawl (negative cache).
    await client.query(`UPDATE public.review_products SET last_scraped_at = NOW() WHERE id = $1`, [
      product.id,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return inserted;
}

/** After scrape (or when cache was partial), return normalized slice for the caller. */
export async function listReviews(
  productId: string,
  source: Source,
  opts: { maxReviews: number; maxRating: number },
): Promise<ScrapedReview[]> {
  const { maxReviews, maxRating } = opts;
  const pool = getPool();
  const rows = await pool.query<{
    text: string;
    rating: number | null;
    title: string | null;
    author: string | null;
    review_date: Date | null;
    language: string | null;
  }>(
    `SELECT text, rating, title, author, review_date, language
     FROM public.catalog_reviews
     WHERE product_id = $1
       AND (rating IS NULL OR rating <= $2)
     ORDER BY rating ASC NULLS LAST, review_date DESC NULLS LAST
     LIMIT $3`,
    [productId, maxRating, maxReviews],
  );
  return rows.rows.map((r) => ({
    source,
    text: r.text,
    rating: r.rating,
    title: r.title,
    author: r.author,
    reviewDate: r.review_date ? new Date(r.review_date).toISOString() : null,
    language: r.language,
  }));
}
