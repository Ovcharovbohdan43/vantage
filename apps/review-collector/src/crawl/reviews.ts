import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { firefox, type Browser, type BrowserContext, type Page } from "playwright-core";
import type { ScrapedReview, Source } from "../config.js";
import { config } from "../config.js";
import {
  extractReviewsFromHtml,
  isBlockedContent,
  isHardRestriction,
  isNotFoundPage,
  looksLikeReviewListing,
} from "../extract.js";
import {
  withNegativeReviewFilters,
  withPageQuery,
  type ProductRef,
} from "../product.js";
import {
  buildSessionProxyUrl,
  getCachedWebshareCredentials,
  pickProxyCountry,
  type WebshareCredentials,
} from "../webshare.js";

export type CrawlStatus = "ok" | "blocked" | "not_found" | "empty" | "error";

export type CrawlResult = {
  reviews: ScrapedReview[];
  pagesFetched: number;
  resolvedUrl: string;
  productKey: string;
  errors: string[];
  status: CrawlStatus;
};

type ProxyParts = {
  server: string;
  username?: string;
  password?: string;
};

type Session = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  country: string;
  attempt: number;
};

/**
 * Bounded concurrency for Camoufox crawls.
 * Lock(1) serialized everything; semaphore(2) roughly halves wall time without thrashing proxies.
 */
class CrawlSemaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }
}

const crawlSemaphore = new CrawlSemaphore(config.crawlConcurrency);

function proxyPartsFromUrl(proxyUrl: string): ProxyParts {
  const u = new URL(proxyUrl);
  return {
    server: `${u.protocol}//${u.hostname}:${u.port || "80"}`,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

function nextProxyUrl(
  creds: WebshareCredentials | null,
  attempt = 1,
  opts?: { rotate?: boolean },
): string | null {
  if (creds) {
    const country = pickProxyCountry(attempt);
    const rotate = opts?.rotate || attempt >= 3;
    return buildSessionProxyUrl(creds, randomInt(10000, 99_999_999), {
      country,
      rotate,
      attempt,
    });
  }
  if (config.proxyUrls.length === 0) return null;
  return config.proxyUrls[randomInt(0, config.proxyUrls.length)];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function softPause(page: Page, heavy = false): Promise<void> {
  const base = heavy
    ? Math.max(2500, config.requestDelayMs)
    : Math.max(1200, Math.min(2500, Math.floor(config.requestDelayMs / 2)));
  const jitter = Math.floor(Math.random() * (heavy ? config.delayJitterMs : 800));
  try {
    await page.waitForTimeout(base + jitter);
    await page.mouse.wheel(0, 300 + Math.floor(Math.random() * 400));
    await page.waitForTimeout(300 + Math.floor(Math.random() * 400));
  } catch {
    /* ignore */
  }
}

async function waitPastChallenge(page: Page): Promise<{ html: string; title: string }> {
  const deadline = Date.now() + Math.min(config.pageTimeoutMs, 60_000);
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 25_000 });
  } catch {
    /* continue */
  }

  while (Date.now() < deadline) {
    let title = "";
    let html = "";
    try {
      title = await page.title();
      html = await page.content();
    } catch {
      return { html: "", title: "" };
    }

    if (isHardRestriction(html, title) || isNotFoundPage(html, title)) {
      return { html, title };
    }

    if (!isBlockedContent(html, title) && html.length >= 10_000) {
      return { html, title };
    }

    try {
      await page.mouse.move(80 + Math.random() * 600, 100 + Math.random() * 400);
      await page.waitForTimeout(1800 + Math.floor(Math.random() * 1200));
    } catch {
      return { html, title };
    }
  }

  try {
    return { html: await page.content(), title: await page.title() };
  } catch {
    return { html: "", title: "" };
  }
}

function filterByRating(reviews: ScrapedReview[], maxRating: number): ScrapedReview[] {
  return reviews.filter((r) => r.rating == null || r.rating <= maxRating);
}

async function extractReviewsFromDom(page: Page, source: Source): Promise<ScrapedReview[]> {
  try {
    const rows = await page.evaluate(() => {
      const articles = Array.from(
        document.querySelectorAll(
          'article[data-track-in-viewport-options*="survey_response"], article.elv-bg-neutral-0',
        ),
      );
      return articles
        .map((article) => {
          const titleEl =
            article.querySelector("h3, h4") ||
            article.querySelector(".elv-font-bold") ||
            article.querySelector('a[href*="/reviews/"]');
          const title = titleEl?.textContent?.replace(/\s+/g, " ").trim() || null;
          const bodyBits: string[] = [];
          const paragraphs = Array.from(article.querySelectorAll("p"));
          for (const p of paragraphs) {
            const prev = p.previousElementSibling;
            const label = prev?.textContent?.trim() || "";
            if (!/What do you (like best|dislike|recommend)/i.test(label)) continue;
            const text = p.textContent
              ?.replace(/Review collected by and hosted on G2\.com\.?/gi, "")
              .replace(/\s+/g, " ")
              .trim();
            if (text && text.length > 15) bodyBits.push(text);
          }
          if (bodyBits.length === 0) return null;
          const starsClass =
            Array.from(article.querySelectorAll("[class*='stars-']"))
              .map((el) => el.className)
              .find((c) => /stars-\d+/.test(c)) || "";
          const starsMatch = /stars-(\d+)/.exec(starsClass);
          const rating = starsMatch ? Math.round(Number(starsMatch[1]) / 2) : null;
          return {
            title,
            text: bodyBits.join(" ").trim(),
            rating: rating && rating >= 1 && rating <= 5 ? rating : null,
          };
        })
        .filter(Boolean) as Array<{ title: string | null; text: string; rating: number | null }>;
    });

    return rows
      .filter((r) => r.text && r.text.length >= 20)
      .map((r) => ({
        source,
        text: r.text,
        rating: r.rating,
        title: r.title,
        author: null,
        reviewDate: null,
        language: null,
      }));
  } catch {
    return [];
  }
}

/** Image-baked path. Prefer over CAMOUFOX_INSTALL_DIR (/opt is often an empty Railway volume). */
const IMAGE_CAMOUFOX_DIR = "/app/camoufox";

async function launchCamoufox(proxyUrl: string | null): Promise<Browser> {
  const proxy = proxyUrl ? proxyPartsFromUrl(proxyUrl) : undefined;
  const executable_path = resolveCamoufoxBinary();
  const installDir = path.dirname(executable_path);

  // camoufox-js freezes INSTALL_DIR at first import from process.env — set it
  // before the dynamic import so geoip/version.json resolve next to the binary.
  process.env.CAMOUFOX_INSTALL_DIR = installDir;
  console.log(`[camoufox] executable=${executable_path} installDir=${installDir}`);

  const { launchOptions } = await import("camoufox-js");
  const opts = await launchOptions({
    executable_path,
    headless: config.headless,
    humanize: true,
    geoip: Boolean(proxy),
    block_webrtc: true,
    os: "windows",
    locale: ["en-US"],
    ...(proxy
      ? {
          proxy: {
            server: proxy.server,
            username: proxy.username,
            password: proxy.password,
          },
        }
      : {}),
  });
  return firefox.launch({
    ...opts,
    executablePath: executable_path,
    headless: config.headless,
  });
}

function resolveCamoufoxBinary(): string {
  const dirs = [IMAGE_CAMOUFOX_DIR];
  const envDir = process.env.CAMOUFOX_INSTALL_DIR?.trim();
  // Never prefer /opt — historical Railway volume mounts an empty dir there.
  if (envDir && envDir !== "/opt/camoufox" && envDir !== IMAGE_CAMOUFOX_DIR) {
    dirs.push(envDir);
  }
  for (const dir of dirs) {
    const bin = path.join(dir, "camoufox-bin");
    if (existsSync(bin)) return bin;
  }
  throw new Error(
    `Camoufox binary missing (tried ${dirs.map((d) => path.join(d, "camoufox-bin")).join(", ")}). Rebuild image.`,
  );
}

async function closeSession(session: Session | null): Promise<void> {
  if (!session) return;
  try {
    await session.browser.close();
  } catch {
    /* ignore */
  }
}

async function openSession(attempt: number): Promise<Session> {
  const creds = getCachedWebshareCredentials();
  const country = pickProxyCountry(attempt);
  const proxyUrl = nextProxyUrl(creds, attempt, { rotate: attempt >= 3 });
  console.log(`[camoufox] open session attempt=${attempt} country=${country}`);
  const browser = await launchCamoufox(proxyUrl);
  const context = await browser.newContext({ viewport: null, locale: "en-US" });
  const page = await context.newPage();
  // Camoufox typings diverge from Playwright event names; swallow via untyped hook.
  const sink = () => undefined;
  (context as unknown as { on(event: string, listener: () => void): void }).on("pageerror", sink);
  (page as unknown as { on(event: string, listener: () => void): void }).on("pageerror", sink);
  (page as unknown as { on(event: string, listener: () => void): void }).on("crash", sink);
  return { browser, context, page, country, attempt };
}

type PageFetch = {
  reviews: ScrapedReview[];
  htmlLen: number;
  title: string;
  hardRestricted: boolean;
  softBlocked: boolean;
  notFound: boolean;
  error?: string;
};

async function fetchReviewsOnPage(
  page: Page,
  url: string,
  source: Source,
  maxRating: number,
): Promise<PageFetch> {
  try {
    console.log(`[camoufox] goto ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.pageTimeoutMs });
    const { html, title } = await waitPastChallenge(page);

    if (isHardRestriction(html, title)) {
      return {
        reviews: [],
        htmlLen: html.length,
        title,
        hardRestricted: true,
        softBlocked: true,
        notFound: false,
      };
    }
    if (isNotFoundPage(html, title)) {
      return {
        reviews: [],
        htmlLen: html.length,
        title,
        hardRestricted: false,
        softBlocked: true,
        notFound: true,
      };
    }
    if (isBlockedContent(html, title) || html.length < 10_000) {
      return {
        reviews: [],
        htmlLen: html.length,
        title,
        hardRestricted: false,
        softBlocked: true,
        notFound: false,
      };
    }

    await softPause(page, false);
    const finalHtml = await page.content();
    let batch = extractReviewsFromHtml(finalHtml, source);
    if (batch.length === 0) {
      batch = await extractReviewsFromDom(page, source);
    }

    if (batch.length === 0 && source === "capterra") {
      const loadMore = page
        .locator('button:has-text("Load more"), button:has-text("Show more")')
        .first();
      if ((await loadMore.count()) > 0) {
        try {
          await loadMore.click({ timeout: 5000 });
          await page.waitForTimeout(2000);
          batch = extractReviewsFromHtml(await page.content(), "capterra");
          if (batch.length === 0) batch = await extractReviewsFromDom(page, "capterra");
        } catch {
          /* ignore */
        }
      }
    }

    if (batch.length === 0 && !looksLikeReviewListing(finalHtml)) {
      return {
        reviews: [],
        htmlLen: finalHtml.length,
        title,
        hardRestricted: false,
        softBlocked: true,
        notFound: false,
      };
    }

    return {
      reviews: filterByRating(batch, maxRating),
      htmlLen: finalHtml.length,
      title,
      hardRestricted: false,
      softBlocked: false,
      notFound: false,
    };
  } catch (err) {
    return {
      reviews: [],
      htmlLen: 0,
      title: "",
      hardRestricted: false,
      softBlocked: true,
      notFound: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function resolveG2FromSearch(
  page: Page,
  searchUrl: string,
  nameHint: string | null,
): Promise<{ url: string; productKey: string } | null> {
  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: config.pageTimeoutMs });
    const { html, title } = await waitPastChallenge(page);
    if (isBlockedContent(html, title) || isHardRestriction(html, title)) return null;

    const links = await page.locator('a[href*="/products/"]').evaluateAll((anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => /\/products\/[a-z0-9-]+/i.test(href) && !href.includes("/compare/")),
    );

    const needle = (nameHint || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const ranked = links
      .map((href) => {
        const slug = /\/products\/([a-z0-9-]+)/i.exec(href)?.[1]?.toLowerCase() || "";
        const score =
          (needle && slug.includes(needle.slice(0, 12)) ? 10 : 0) +
          (href.includes("/reviews") ? 2 : 0);
        return { href, slug, score };
      })
      .filter((x) => x.slug && x.slug !== "new")
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best) return null;
    const url = best.href.includes("/reviews")
      ? best.href.split("?")[0]
      : `https://www.g2.com/products/${best.slug}/reviews`;
    return { url, productKey: best.slug };
  } catch {
    return null;
  }
}

/**
 * Camoufox + Webshare — bounded concurrent crawls (see CRAWL_CONCURRENCY).
 */
export async function crawlProductReviews(
  ref: ProductRef,
  opts: { maxReviews: number; maxRating: number },
): Promise<CrawlResult> {
  return crawlSemaphore.run(() => crawlProductReviewsUnlocked(ref, opts));
}

async function crawlProductReviewsUnlocked(
  ref: ProductRef,
  opts: { maxReviews: number; maxRating: number },
): Promise<CrawlResult> {
  const { maxReviews, maxRating } = opts;
  const collected: ScrapedReview[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];
  let pagesFetched = 0;
  let resolvedUrl = ref.url;
  let productKey = ref.productKey;
  let session: Session | null = null;
  const maxSessionAttempts = 3;
  let sawNotFound = false;
  let sawBlock = false;
  let sawHardRestriction = false;

  const pushReviews = (batch: ScrapedReview[]) => {
    for (const review of batch) {
      if (seen.has(review.text)) continue;
      seen.add(review.text);
      collected.push(review);
      if (collected.length >= maxReviews) break;
    }
  };

  const ensureSession = async (attempt: number): Promise<Session> => {
    if (session && session.attempt === attempt) return session;
    await closeSession(session);
    session = await openSession(attempt);
    return session;
  };

  try {
    // Resolve G2 name → concrete product URL (same session when possible).
    if (ref.source === "g2" && ref.productKey.startsWith("name:")) {
      let resolved = false;
      for (let attempt = 1; attempt <= maxSessionAttempts && !resolved; attempt += 1) {
        const s = await ensureSession(attempt);
        if (ref.guessedUrl) {
          const probeUrl = withNegativeReviewFilters(ref.guessedUrl, "g2", maxRating);
          const probe = await fetchReviewsOnPage(s.page, probeUrl, "g2", maxRating);
          pagesFetched += 1;
          if (!probe.softBlocked && !probe.notFound) {
            resolvedUrl = ref.guessedUrl;
            productKey =
              /\/products\/([a-z0-9-]+)/i.exec(ref.guessedUrl)?.[1]?.toLowerCase() || productKey;
            pushReviews(probe.reviews);
            resolved = true;
            break;
          }
          if (probe.notFound) sawNotFound = true;
          if (probe.softBlocked || probe.hardRestricted) {
            sawBlock = true;
            if (probe.hardRestricted) sawHardRestriction = true;
          }
          if (probe.notFound || probe.reviews.length === 0) {
            errors.push(`Slug guess miss (${ref.guessedUrl}) — G2 search`);
          }
        }

        const found = await resolveG2FromSearch(s.page, ref.url, ref.nameHint);
        pagesFetched += 1;
        if (found) {
          resolvedUrl = found.url;
          productKey = found.productKey;
          resolved = true;
          break;
        }
        errors.push(`G2 resolve blocked (cc=${s.country}) — rotating`);
        await sleep(2500 + attempt * 1000);
      }

      if (!resolved && collected.length === 0) {
        return {
          reviews: [],
          pagesFetched,
          resolvedUrl,
          productKey,
          errors: errors.slice(0, 12),
          status: sawNotFound ? "not_found" : sawBlock || sawHardRestriction ? "blocked" : "error",
        };
      }
    }

    if (ref.source === "capterra" && ref.productKey.startsWith("name:")) {
      for (let attempt = 1; attempt <= maxSessionAttempts; attempt += 1) {
        const s = await ensureSession(attempt);
        await s.page.goto(ref.url, {
          waitUntil: "domcontentloaded",
          timeout: config.pageTimeoutMs,
        });
        const { html, title } = await waitPastChallenge(s.page);
        pagesFetched += 1;
        if (isBlockedContent(html, title) || isHardRestriction(html, title)) {
          sawBlock = true;
          if (isHardRestriction(html, title)) sawHardRestriction = true;
          errors.push(`Capterra search blocked (cc=${s.country})`);
          await sleep(2000 + attempt * 800);
          continue;
        }
        const links = await s.page
          .locator('a[href*="capterra.com/p/"]')
          .evaluateAll((anchors) =>
            anchors
              .map((a) => (a as HTMLAnchorElement).href)
              .filter((href) => /\/p\/\d+\//.test(href)),
          );
        const first = links[0];
        if (first) {
          resolvedUrl = first.includes("/reviews")
            ? first
            : `${first.replace(/\/$/, "")}/reviews/`;
          const idSlug = /\/p\/(\d+)\/([a-z0-9-]+)/i.exec(resolvedUrl);
          if (idSlug) productKey = `${idSlug[1]}-${idSlug[2].toLowerCase()}`;
          break;
        }
        errors.push("Capterra search returned no product links");
        break;
      }
    }

    const baseUrl = withNegativeReviewFilters(resolvedUrl, ref.source, maxRating);
    const maxPages = Math.min(
      config.maxPagesPerProduct,
      Math.max(1, Math.ceil(maxReviews / 8)),
    );
    const startPage = collected.length > 0 ? 2 : 1;

    for (let pageNum = startPage; pageNum <= maxPages && collected.length < maxReviews; pageNum += 1) {
      const target = withPageQuery(baseUrl, pageNum);
      let gotPage = false;

      for (let attempt = 1; attempt <= maxSessionAttempts; attempt += 1) {
        const s = await ensureSession(attempt);
        const result = await fetchReviewsOnPage(s.page, target, ref.source, maxRating);
        pagesFetched += 1;

        if (result.error) {
          errors.push(`${target}: ${result.error}`);
          await closeSession(session);
          session = null;
          await sleep(2000 + attempt * 800);
          continue;
        }

        if (result.hardRestricted || result.softBlocked) {
          if (result.notFound) sawNotFound = true;
          else {
            sawBlock = true;
            if (result.hardRestricted) sawHardRestriction = true;
          }
          errors.push(
            `${result.hardRestricted ? "G2 restriction" : result.notFound ? "Not found" : "Soft block"} on page ${pageNum} (cc=${s.country}) — rotating`,
          );
          await closeSession(session);
          session = null;
          await sleep(2000 + attempt * 800);
          continue;
        }

        gotPage = true;
        pushReviews(result.reviews);
        if (result.reviews.length === 0) {
          errors.push(`No reviews parsed from ${target} (html=${result.htmlLen}b)`);
          // Only stop paginating when the page clearly has no review cards.
          if (result.htmlLen < 100_000) {
            pageNum = maxPages;
          }
        }
        break;
      }

      if (!gotPage && collected.length === 0) break;
      if (collected.length < maxReviews && pageNum < maxPages) {
        await sleep(Math.max(1500, Math.floor(config.requestDelayMs / 2)));
      }
    }
  } finally {
    await closeSession(session);
  }

  collected.sort((a, b) => (a.rating ?? 99) - (b.rating ?? 99));
  const reviews = collected.slice(0, maxReviews);
  let status: CrawlStatus = "ok";
  if (reviews.length === 0) {
    if (sawNotFound) status = "not_found";
    else if (sawBlock || sawHardRestriction) status = "blocked";
    else if (pagesFetched > 0) status = "empty";
    else status = "error";
  }

  return {
    reviews,
    pagesFetched,
    resolvedUrl: withNegativeReviewFilters(resolvedUrl, ref.source, maxRating),
    productKey,
    errors: errors.slice(0, 12),
    status,
  };
}
