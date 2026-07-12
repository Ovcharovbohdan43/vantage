import { randomInt } from "node:crypto";
import { Camoufox } from "camoufox-js";
import type { Browser, Page } from "playwright-core";
import type { ScrapedReview, Source } from "../config.js";
import { config } from "../config.js";
import {
  extractReviewsFromHtml,
  isBlockedContent,
  isHardRestriction,
} from "../extract.js";
import { withPageQuery, type ProductRef } from "../product.js";
import {
  buildSessionProxyUrl,
  getCachedWebshareCredentials,
  type WebshareCredentials,
} from "../webshare.js";

export type CrawlResult = {
  reviews: ScrapedReview[];
  pagesFetched: number;
  resolvedUrl: string;
  productKey: string;
  errors: string[];
};

type ProxyParts = {
  server: string;
  username?: string;
  password?: string;
};

function proxyPartsFromUrl(proxyUrl: string): ProxyParts {
  const u = new URL(proxyUrl);
  return {
    server: `${u.protocol}//${u.hostname}:${u.port || "80"}`,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

function nextProxyUrl(creds: WebshareCredentials | null): string | null {
  if (creds) {
    return buildSessionProxyUrl(creds, randomInt(10000, 99_999_999));
  }
  if (config.proxyUrls.length === 0) return null;
  return config.proxyUrls[randomInt(0, config.proxyUrls.length)];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function softPause(page: Page): Promise<void> {
  const base = Math.max(3500, config.requestDelayMs);
  const jitter = Math.floor(Math.random() * Math.max(1500, config.delayJitterMs));
  try {
    await page.waitForTimeout(base + jitter);
    await page.mouse.wheel(0, 250 + Math.floor(Math.random() * 500));
    await page.waitForTimeout(500 + Math.floor(Math.random() * 800));
  } catch {
    /* ignore */
  }
}

async function waitPastChallenge(page: Page): Promise<{ html: string; title: string }> {
  const deadline = Date.now() + Math.min(config.pageTimeoutMs, 75_000);
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
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

    if (isHardRestriction(html, title)) {
      return { html, title };
    }

    // Real G2/Capterra pages are heavy; CF interstitial is short / titled g2.com
    if (!isBlockedContent(html, title) && html.length >= 10_000) {
      return { html, title };
    }

    try {
      await page.mouse.move(80 + Math.random() * 600, 100 + Math.random() * 400);
      await page.waitForTimeout(2500 + Math.floor(Math.random() * 2000));
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

async function launchCamoufox(proxyUrl: string | null): Promise<Browser> {
  const proxy = proxyUrl ? proxyPartsFromUrl(proxyUrl) : undefined;
  // Camoufox = anti-detect Firefox — critical vs G2 Cloudflare / bot walls.
  return (await Camoufox({
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
  })) as Browser;
}

async function scrapeUrlOnce(
  url: string,
  source: Source,
  maxRating: number,
): Promise<{
  reviews: ScrapedReview[];
  htmlLen: number;
  title: string;
  hardRestricted: boolean;
  softBlocked: boolean;
  error?: string;
}> {
  const creds = getCachedWebshareCredentials();
  const proxyUrl = nextProxyUrl(creds);
  let browser: Browser | null = null;

  try {
    browser = await launchCamoufox(proxyUrl);
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.pageTimeoutMs });

    const { html, title } = await waitPastChallenge(page);
    if (isHardRestriction(html, title)) {
      return {
        reviews: [],
        htmlLen: html.length,
        title,
        hardRestricted: true,
        softBlocked: true,
      };
    }
    if (isBlockedContent(html, title) || html.length < 10_000) {
      return {
        reviews: [],
        htmlLen: html.length,
        title,
        hardRestricted: false,
        softBlocked: true,
      };
    }

    await softPause(page);
    let batch = extractReviewsFromHtml(html, source);

    if (batch.length === 0 && source === "capterra") {
      const loadMore = page
        .locator('button:has-text("Load more"), button:has-text("Show more")')
        .first();
      if ((await loadMore.count()) > 0) {
        try {
          await loadMore.click({ timeout: 5000 });
          await page.waitForTimeout(2500);
          batch = extractReviewsFromHtml(await page.content(), "capterra");
        } catch {
          /* ignore */
        }
      }
    }

    return {
      reviews: filterByRating(batch, maxRating),
      htmlLen: html.length,
      title,
      hardRestricted: false,
      softBlocked: false,
    };
  } catch (err) {
    return {
      reviews: [],
      htmlLen: 0,
      title: "",
      hardRestricted: false,
      softBlocked: true,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Camoufox + Webshare residential — replaces stock Playwright for G2/Capterra.
 * Fresh sticky proxy session per attempt; rotates on soft/hard blocks.
 */
export async function crawlProductReviews(
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

  // Resolve Capterra name search → first product URL (one attempt)
  if (ref.source === "capterra" && ref.productKey.startsWith("name:")) {
    const search = await scrapeUrlOnce(ref.url, "capterra", maxRating);
    pagesFetched += 1;
    if (search.error) errors.push(search.error);
    // Re-open briefly only if we got a real page — extract links from a dedicated pass
    if (!search.softBlocked) {
      const creds = getCachedWebshareCredentials();
      const proxyUrl = nextProxyUrl(creds);
      let browser: Browser | null = null;
      try {
        browser = await launchCamoufox(proxyUrl);
        const page = await browser.newPage();
        await page.goto(ref.url, { waitUntil: "domcontentloaded", timeout: config.pageTimeoutMs });
        await waitPastChallenge(page);
        const links = await page
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
        } else {
          errors.push("Capterra search returned no product links");
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      } finally {
        if (browser) await browser.close().catch(() => undefined);
      }
    }
  }

  const maxPages = Math.min(config.maxPagesPerProduct, Math.max(1, Math.ceil(maxReviews / 10)));
  const maxAttemptsPerPage = 4;

  for (let pageNum = 1; pageNum <= maxPages && collected.length < maxReviews; pageNum += 1) {
    const target = withPageQuery(resolvedUrl, pageNum);
    let gotPage = false;

    for (let attempt = 1; attempt <= maxAttemptsPerPage; attempt += 1) {
      console.log(
        `[camoufox] ${target} attempt=${attempt}/${maxAttemptsPerPage} via webshare`,
      );
      const result = await scrapeUrlOnce(target, ref.source, maxRating);
      pagesFetched += 1;

      if (result.error) {
        errors.push(`${target}: ${result.error}`);
        await sleep(3000 + Math.floor(Math.random() * 3000));
        continue;
      }

      if (result.hardRestricted || result.softBlocked) {
        errors.push(
          `${result.hardRestricted ? "G2 restriction" : "Soft block"} on ${target} (title=${result.title.slice(0, 40)}) — rotating IP`,
        );
        await sleep(5000 + Math.floor(Math.random() * 5000));
        continue;
      }

      gotPage = true;
      for (const review of result.reviews) {
        if (seen.has(review.text)) continue;
        seen.add(review.text);
        collected.push(review);
        if (collected.length >= maxReviews) break;
      }

      if (result.reviews.length === 0) {
        errors.push(`No reviews parsed from ${target} (html=${result.htmlLen}b)`);
      }
      break;
    }

    if (!gotPage) {
      // Don't hammer further pages if this product is fully blocked
      break;
    }

    if (collected.length < maxReviews && pageNum < maxPages) {
      await sleep(Math.max(5000, config.requestDelayMs));
    }
  }

  collected.sort((a, b) => (a.rating ?? 99) - (b.rating ?? 99));
  return {
    reviews: collected.slice(0, maxReviews),
    pagesFetched,
    resolvedUrl,
    productKey,
    errors: errors.slice(0, 12),
  };
}
