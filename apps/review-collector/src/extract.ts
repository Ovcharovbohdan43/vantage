import type { ScrapedReview, Source } from "./config.js";

const TEXT_KEYS = ["review_text", "reviewText", "comment", "body", "text", "content", "description"] as const;
const TITLE_KEYS = ["title", "review_title", "reviewTitle", "headline", "subject"] as const;
const RATING_KEYS = ["rating", "star_rating", "stars", "score", "starRating"] as const;
const AUTHOR_KEYS = ["author", "author_name", "authorName", "reviewer", "user_name", "userName"] as const;
const DATE_KEYS = [
  "review_date",
  "reviewDate",
  "date",
  "published_at",
  "publishedAt",
  "created_at",
  "createdAt",
] as const;

function firstStr(data: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseRating(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const rating = Math.round(value);
    return rating >= 1 && rating <= 5 ? rating : null;
  }
  if (typeof value === "string") {
    const match = value.match(/([1-5])/);
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    try {
      return new Date(value * (value < 1e12 ? 1000 : 1)).toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === "string" && value.trim()) {
    const cleaned = value.trim().endsWith("Z") ? value.trim().replace("Z", "+00:00") : value.trim();
    const d = new Date(cleaned);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function looksLikeReviewDict(data: Record<string, unknown>): boolean {
  const text = firstStr(data, TEXT_KEYS);
  if (!text || text.length < 20) return false;
  return (
    RATING_KEYS.some((k) => k in data) ||
    DATE_KEYS.some((k) => k in data) ||
    TITLE_KEYS.some((k) => k in data)
  );
}

function normalizeReviewDict(data: Record<string, unknown>, source: Source): ScrapedReview | null {
  const text = firstStr(data, TEXT_KEYS);
  if (!text) return null;

  let rating: number | null = null;
  for (const key of RATING_KEYS) {
    if (key in data) {
      rating = parseRating(data[key]);
      if (rating != null) break;
    }
  }

  let reviewDate: string | null = null;
  for (const key of DATE_KEYS) {
    if (key in data) {
      reviewDate = parseDate(data[key]);
      if (reviewDate) break;
    }
  }

  return {
    source,
    text,
    rating,
    title: firstStr(data, TITLE_KEYS),
    author: firstStr(data, AUTHOR_KEYS),
    reviewDate,
    language: null,
  };
}

function findReviewsInJson(payload: unknown, source: Source): ScrapedReview[] {
  const found: ScrapedReview[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (looksLikeReviewDict(obj)) {
        const review = normalizeReviewDict(obj, source);
        if (review && !seen.has(review.text)) {
          seen.add(review.text);
          found.push(review);
        }
      }
      for (const value of Object.values(obj)) walk(value);
    }
  };

  walk(payload);
  return found;
}

function extractJsonScript(html: string, scriptId: string): unknown | null {
  const re = new RegExp(
    `<script[^>]+id=["']${scriptId}["'][^>]*>([\\s\\S]*?)</script>`,
    "i",
  );
  const match = re.exec(html);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractLdJsonBlocks(html: string): unknown[] {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      /* skip */
    }
  }
  return blocks;
}

function schemaAuthor(value: unknown): string | null {
  if (value && typeof value === "object") {
    const name = (value as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function schemaRating(value: unknown): number | null {
  if (value && typeof value === "object") {
    return parseRating((value as Record<string, unknown>).ratingValue);
  }
  return parseRating(value);
}

function normalizeSchemaReview(node: Record<string, unknown>, source: Source): ScrapedReview | null {
  const body = node.reviewBody;
  if (typeof body !== "string" || !body.trim()) return null;

  const titleRaw = node.name;
  const title =
    typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : null;

  return {
    source,
    text: body.trim(),
    rating: schemaRating(node.reviewRating),
    title,
    author: schemaAuthor(node.author),
    reviewDate: parseDate(node.datePublished ?? node.dateModified),
    language: null,
  };
}

function findSchemaReviews(payload: unknown, source: Source): ScrapedReview[] {
  const found: ScrapedReview[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const nodeType = obj["@type"];
      const isReview =
        nodeType === "Review" || (Array.isArray(nodeType) && nodeType.includes("Review"));
      if (isReview && "reviewBody" in obj) {
        const review = normalizeSchemaReview(obj, source);
        if (review && !seen.has(review.text)) {
          seen.add(review.text);
          found.push(review);
        }
      }
      for (const value of Object.values(obj)) walk(value);
    }
  };

  walk(payload);
  return found;
}

export function extractReviewsFromHtml(html: string, source: Source): ScrapedReview[] {
  const reviews: ScrapedReview[] = [];
  const seen = new Set<string>();

  const add = (review: ScrapedReview) => {
    if (review.text && !seen.has(review.text)) {
      seen.add(review.text);
      reviews.push(review);
    }
  };

  for (const block of extractLdJsonBlocks(html)) {
    for (const review of findSchemaReviews(block, source)) add(review);
  }

  for (const scriptId of ["__NEXT_DATA__", "__NUXT__"] as const) {
    const payload = extractJsonScript(html, scriptId);
    if (payload) {
      for (const review of findReviewsInJson(payload, source)) add(review);
    }
  }

  // Always merge article Q&A — page 2+ often has no reviewBody in JSON-LD.
  for (const review of extractG2ArticleReviews(html, source)) add(review);

  if (reviews.length > 0) return reviews;

  const cardPattern =
    /class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|section)>/gi;
  let cardMatch: RegExpExecArray | null;
  while ((cardMatch = cardPattern.exec(html)) !== null) {
    const chunk = cardMatch[1];
    const textMatch = />([^<]{50,})</.exec(chunk);
    if (!textMatch) continue;
    const text = textMatch[1].replace(/\s+/g, " ").trim();
    if (seen.has(text)) continue;
    seen.add(text);
    const ratingMatch = /([1-5])\s*(?:\/5|stars?)/i.exec(chunk);
    reviews.push({
      source,
      text,
      rating: ratingMatch ? parseRating(ratingMatch[1]) : null,
      title: null,
      author: null,
      reviewDate: null,
      language: null,
    });
  }

  return reviews;
}

/** G2 page 2+ often omits JSON-LD Review bodies — parse article Q&A blocks. */
function extractG2ArticleReviews(html: string, source: Source): ScrapedReview[] {
  if (source !== "g2") return [];
  const found: ScrapedReview[] = [];
  const seen = new Set<string>();
  const articleRe =
    /<article\b[^>]*(?:survey_response|elv-bg-neutral-0)[^>]*>([\s\S]*?)<\/article>/gi;
  let match: RegExpExecArray | null;
  while ((match = articleRe.exec(html)) !== null) {
    const chunk = match[1];
    if (!/What do you (?:like best|dislike)/i.test(chunk)) continue;

    const parts: string[] = [];
    const qaRe =
      /What do you (?:like best|dislike|recommend)[^<]{0,120}<\/[^>]+>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let qa: RegExpExecArray | null;
    while ((qa = qaRe.exec(chunk)) !== null) {
      const text = qa[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/Review collected by and hosted on G2\.com\.?/gi, "")
        .trim();
      if (text.length >= 20) parts.push(text);
    }
    if (parts.length === 0) continue;

    const titleMatch =
      /<(?:h[1-6]|div)[^>]*class="[^"]*elv-font-bold[^"]*"[^>]*>([\s\S]*?)<\//i.exec(chunk) ||
      /itemprop="name"[^>]*>([\s\S]*?)<\//i.exec(chunk);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;

    const starsMatch = /stars-(\d+)/i.exec(chunk);
    let rating: number | null = null;
    if (starsMatch) {
      const half = Number.parseInt(starsMatch[1], 10);
      if (Number.isFinite(half)) rating = Math.max(1, Math.min(5, Math.round(half / 2)));
    }

    const text = parts.join(" ");
    if (seen.has(text)) continue;
    seen.add(text);
    found.push({
      source,
      text,
      rating,
      title: title && title.length > 3 ? title : null,
      author: null,
      reviewDate: null,
      language: null,
    });
  }
  return found;
}

export function isHardRestriction(html: string, title: string): boolean {
  const blob = `${title}\n${html}`.toLowerCase();
  return (
    blob.includes("access is temporarily restricted") ||
    blob.includes("unusual activity from your device") ||
    blob.includes("unusual activity from your network") ||
    blob.includes("automated (bot) activity") ||
    blob.includes("inspection tools") ||
    blob.includes("enable javascript and cookies")
  );
}

export function isNotFoundPage(html: string, title: string): boolean {
  const t = title.toLowerCase().trim();
  if (t === "not found" || t.includes("page not found") || t.includes("404")) return true;
  const h = html.toLowerCase();
  return h.includes("error-text-number") && h.includes(">404<");
}

/** Real review listing markers — missing on soft interstitials / empty shells. */
export function looksLikeReviewListing(html: string): boolean {
  return (
    /survey_response/i.test(html) ||
    /"reviewBody"\s*:/i.test(html) ||
    /application\/ld\+json/i.test(html) ||
    /What do you like best/i.test(html) ||
    /class="[^"]*review-card/i.test(html)
  );
}

export function isBlockedContent(html: string, title: string): boolean {
  if (isHardRestriction(html, title)) return true;
  if (isNotFoundPage(html, title)) return true;
  const t = title.toLowerCase();
  const h = html.toLowerCase();
  if (
    t.includes("just a moment") ||
    t.includes("attention required") ||
    t.includes("access denied") ||
    t.includes("cf-browser-verification") ||
    t === "g2.com" ||
    t === "capterra.com"
  ) {
    return true;
  }
  if (h.includes("cf-challenge") && html.length < 8000) return true;
  if (html.length < 5000) return true;
  // Large enough shell but no review payload → treat as soft block / wrong page.
  if (html.length < 80_000 && !looksLikeReviewListing(html)) return true;
  return false;
}
