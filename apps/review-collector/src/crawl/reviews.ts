import { Configuration, PlaywrightCrawler, ProxyConfiguration, RequestQueue, log } from "crawlee";
import { MemoryStorage } from "@crawlee/memory-storage";
import type { ScrapedReview, Source } from "../config.js";
import { config } from "../config.js";
import { extractReviewsFromHtml, isBlockedContent } from "../extract.js";
import { withPageQuery, type ProductRef } from "../product.js";

export type CrawlResult = {
  reviews: ScrapedReview[];
  pagesFetched: number;
  resolvedUrl: string;
  productKey: string;
  errors: string[];
};

const LAUNCH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
  "--disable-dev-shm-usage",
];

const STEALTH_INIT_SCRIPT = `
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = { runtime: {} };
`;

function createProxyConfiguration(): ProxyConfiguration | undefined {
  if (config.proxyUrls.length === 0) {
    log.warning("No Webshare proxy configured — crawling without proxy (likely blocked)");
    return undefined;
  }
  return new ProxyConfiguration({
    proxyUrls: config.proxyUrls,
  });
}

function jitterDelayMs(): number {
  const base = Math.max(2000, config.requestDelayMs);
  const jitter = Math.floor(Math.random() * config.delayJitterMs);
  return base + jitter;
}

async function humanPause(page: import("playwright").Page): Promise<void> {
  await page.waitForTimeout(jitterDelayMs());
  try {
    await page.mouse.wheel(0, 400 + Math.floor(Math.random() * 600));
    await page.waitForTimeout(400 + Math.floor(Math.random() * 800));
  } catch {
    /* ignore */
  }
}

async function waitPastChallenge(page: import("playwright").Page): Promise<string> {
  const deadline = Date.now() + Math.min(config.pageTimeoutMs, 70_000);
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 25_000 });
  } catch {
    /* continue polling */
  }

  while (Date.now() < deadline) {
    let title = "";
    let html = "";
    try {
      title = await page.title();
      html = await page.content();
    } catch {
      await page.waitForTimeout(2000);
      continue;
    }
    if (!isBlockedContent(html, title) && html.length >= 8000) {
      return html;
    }
    // Cloudflare interstitial needs wall-clock time + occasional interaction
    try {
      await page.mouse.move(120 + Math.random() * 400, 160 + Math.random() * 200);
    } catch {
      /* ignore */
    }
    await page.waitForTimeout(2500 + Math.floor(Math.random() * 2000));
  }
  try {
    return await page.content();
  } catch {
    return "";
  }
}

function filterByRating(reviews: ScrapedReview[], maxRating: number): ScrapedReview[] {
  return reviews.filter((r) => r.rating == null || r.rating <= maxRating);
}

function maxPagesFor(maxReviews: number): number {
  return Math.min(config.maxPagesPerProduct, Math.max(1, Math.ceil(maxReviews / 8) + 1));
}

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
  let currentPage = 1;
  const pageLimit = maxPagesFor(maxReviews);

  const startUrls =
    ref.source === "capterra" && ref.productKey.startsWith("name:")
      ? [ref.url]
      : [withPageQuery(ref.url, 1)];

  // Fresh in-memory queue per product — avoids stale "already handled" URLs from disk storage.
  const configuration = new Configuration({
    storageClient: new MemoryStorage({ persistStorage: false }),
    persistStorage: false,
  });
  const requestQueue = await RequestQueue.open(`collect-${Date.now()}-${Math.random()}`, {
    config: configuration,
  });

  const crawler = new PlaywrightCrawler(
    {
      requestQueue,
      proxyConfiguration: createProxyConfiguration(),
      maxRequestsPerCrawl: pageLimit + 3,
      maxConcurrency: 1,
      maxRequestsPerMinute: config.maxRequestsPerMinute,
      maxRequestRetries: 2,
      navigationTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000),
      requestHandlerTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000) + 90,
      useSessionPool: true,
      persistCookiesPerSession: true,
      maxSessionRotations: 3,
      // Do NOT leave blockedStatusCodes empty (Crawlee falls back to [401,403,429]).
      // Omit 403 so Cloudflare's initial challenge can resolve in requestHandler.
      sessionPoolOptions: {
        blockedStatusCodes: [401, 429],
        maxPoolSize: 10,
      },
      browserPoolOptions: {
        useFingerprints: true,
      },
      launchContext: {
        // No custom userAgent — lets Crawlee fingerprint injection stay enabled.
        launchOptions: {
          headless: config.headless,
          args: LAUNCH_ARGS,
        },
      },
      preNavigationHooks: [
        async ({ page }) => {
          await page.addInitScript(STEALTH_INIT_SCRIPT);
        },
      ],
      async requestHandler({ page, request, crawler: activeCrawler, session, response }) {
        if (collected.length >= maxReviews) return;

        await page.setViewportSize({ width: 1366, height: 900 });
        pagesFetched += 1;

        const status = typeof response?.status === "function" ? response.status() : 0;
        if (status === 403 || status === 429) {
          // Soft wait — CF interstitial often clears client-side after a few seconds.
          await page.waitForTimeout(5000 + Math.floor(Math.random() * 3000));
        }

        const html = await waitPastChallenge(page);
        const title = await page.title();

        if (isBlockedContent(html, title)) {
          errors.push(`Blocked on ${request.url} (status=${status || "n/a"}, title=${title.slice(0, 60)})`);
          session?.retire();
          await page.waitForTimeout(8000 + Math.floor(Math.random() * 4000));
          return;
        }

        if (ref.source === "capterra" && request.url.includes("/search")) {
          const links = await page
            .locator('a[href*="capterra.com/p/"]')
            .evaluateAll((anchors) =>
              anchors
                .map((a) => (a as HTMLAnchorElement).href)
                .filter((href) => /\/p\/\d+\//.test(href)),
            );
          const first = links[0];
          if (!first) {
            errors.push("Capterra search returned no product links");
            return;
          }
          resolvedUrl = first.includes("/reviews")
            ? first
            : `${first.replace(/\/$/, "")}/reviews/`;
          const idSlug = /\/p\/(\d+)\/([a-z0-9-]+)/i.exec(resolvedUrl);
          if (idSlug) {
            productKey = `${idSlug[1]}-${idSlug[2].toLowerCase()}`;
          }
          await humanPause(page);
          await activeCrawler.addRequests([withPageQuery(resolvedUrl, 1)]);
          return;
        }

        await humanPause(page);

        let batch = extractReviewsFromHtml(html, ref.source as Source);

        if (batch.length === 0 && ref.source === "capterra") {
          const loadMore = page
            .locator('button:has-text("Load more"), button:has-text("Show more")')
            .first();
          if ((await loadMore.count()) > 0) {
            try {
              await loadMore.click({ timeout: 5000 });
              await page.waitForTimeout(2000 + Math.floor(Math.random() * 1500));
              batch = extractReviewsFromHtml(await page.content(), "capterra");
            } catch {
              /* ignore */
            }
          }
        }

        if (batch.length === 0) {
          errors.push(`No reviews parsed from ${request.url} (html=${html.length}b)`);
        }

        const before = collected.length;
        const filtered = filterByRating(batch, maxRating);
        for (const review of filtered) {
          if (seen.has(review.text)) continue;
          seen.add(review.text);
          collected.push(review);
          if (collected.length >= maxReviews) break;
        }
        const added = collected.length - before;

        if (
          added > 0 &&
          collected.length < maxReviews &&
          currentPage < pageLimit &&
          !request.url.includes("/search")
        ) {
          currentPage += 1;
          await humanPause(page);
          await activeCrawler.addRequests([withPageQuery(resolvedUrl, currentPage)]);
        }
      },
      failedRequestHandler({ request }, error) {
        errors.push(`${request.url}: ${error.message}`);
      },
    },
    configuration,
  );

  await crawler.run(startUrls);

  collected.sort((a, b) => (a.rating ?? 99) - (b.rating ?? 99));

  return {
    reviews: collected.slice(0, maxReviews),
    pagesFetched,
    resolvedUrl,
    productKey,
    errors,
  };
}
