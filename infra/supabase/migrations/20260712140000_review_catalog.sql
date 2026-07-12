-- Shared review catalog for Crawlee collector (cross-project reuse).
-- Keyed by (source, product_key) so the same G2/Capterra product is scraped once.

CREATE TABLE IF NOT EXISTS public.review_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('g2', 'capterra')),
  product_key TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_products_source_key_unique UNIQUE (source, product_key)
);

CREATE INDEX IF NOT EXISTS idx_review_products_source_key
  ON public.review_products (source, product_key);

CREATE TABLE IF NOT EXISTS public.catalog_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.review_products(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  rating INTEGER,
  title TEXT,
  text TEXT NOT NULL,
  language TEXT,
  author TEXT,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_reviews_product_hash_unique UNIQUE (product_id, content_hash)
);

-- Fast cache lookups: enough low-rated reviews for a product?
CREATE INDEX IF NOT EXISTS idx_catalog_reviews_product_rating
  ON public.catalog_reviews (product_id, rating ASC NULLS LAST, review_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_catalog_reviews_product_id
  ON public.catalog_reviews (product_id);

ALTER TABLE public.review_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_reviews ENABLE ROW LEVEL SECURITY;

-- Catalog is shared infrastructure; access via service role / backend only.
-- No end-user policies — intentional.
