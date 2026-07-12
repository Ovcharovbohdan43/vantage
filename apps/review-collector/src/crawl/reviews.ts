import {
  Configuration,
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
  SessionError,
  log,
} from "crawlee";
import { MemoryStorage } from "@crawlee/memory-storage";
import type { ScrapedReview, Source } from "../config.js";
import { config } from "../config.js";
import {
  extractReviewsFromHtml,
  isBlockedContent,
  isHardRestriction,
} from "../extract.js";
import { withPageQuery, type ProductRef } from "../product.js";
import {
  buildProxyUrlPool,
  getCachedWebshareCredentials,
} from "../webshare.js";

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
  const creds = getCachedWebshareCredentials();
  if (creds) {
    // Fresh sticky-session URLs → each Crawlee session gets a new residential IP.
    return new ProxyConfiguration({
      proxyUrls: buildProxyUrlPool(creds, 32),
    });
  }
  if (config.proxyUrls.length === 0) {
    log.warning("No Webshare proxy configured — crawling without proxy (likely blocked)");
    return undefined;
  }
  return new ProxyConfiguration({
    proxyUrls: config.proxyUrls,
  });
}

function jitterDelayMs(): number {
  const base = Math.max(4000, config.requestDelayMs);
  const jitter = Math.floor(Math.random() * Math.max(2000, config.delayJitterMs));
  return base + jitter;
}

async function humanPause(page: import("playwright").Page): Promise<void> {
  try {
    await page.waitForTimeout(jitterDelayMs());
    await page.mouse.wheel(0, 300 + Math.floor(Math.random() * 500));
    await page.waitForTimeout(600 + Math.floor(Math.random() * 900));
  } catch {
    /* page may close during soft pauses */
  }
}

async function waitPastChallenge(page: import("playwright").Page): Promise<string> {
  const deadline = Date.now() + Math.min(config.pageTimeoutMs, 45_000);
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 20_000 });
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
      return "";
    }

    // Hard G2 ban — waiting will not help; rotate IP immediately.
    if (isHardRestriction(html, title)) {
      return html;
    }

    if (!isBlockedContent(html, title) && html.length >= 8000) {
      return html;
    }

    try {
      await page.mouse.move(100 + Math.random() * 500, 120 + Math.random() * 300);
      await page.waitForTimeout(2000 + Math.floor(Math.random() * 1500));
    } catch {
      return html || "";
    }
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
  // Soft: few pages, long pauses — reduces "rapid taps" signals on G2.
  return Math.min(config.maxPagesPerProduct, Math.max(1, Math.ceil(maxReviews / 12)));
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
      maxRequestsPerCrawl: pageLimit + 2,
      maxConcurrency: 1,
      maxRequestsPerMinute: config.maxRequestsPerMinute,
      maxRequestRetries: 2,
      maxSessionRotations: 5,
      navigationTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000),
      requestHandlerTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000) + 60,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: {
        // Allow Cloudflare 403 challenge; rotate only on auth/rate-limit.
        blockedStatusCodes: [401, 429],
        maxPoolSize: 20,
      },
      browserPoolOptions: {
        useFingerprints: true,
        retireBrowserAfterPageCount: 1,
      },
      launchContext: {
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
      async requestHandler({ page, request, crawler: activeCrawler, session, proxyInfo }) {
        if (collected.length >= maxReviews) return;

        try {
          await page.setViewportSize({ width: 1366, height: 900 });
        } catch {
          throw new SessionError("Page closed before viewport set");
        }

        pagesFetched += 1;
        log.info(`Crawl ${request.url} via ${proxyInfo?.url ? "webshare-session" : "direct"}`);

        const html = await waitPastChallenge(page);
        let title = "";
        try {
          title = await page.title();
        } catch {
          throw new SessionError("Page closed while reading title");
        }

        if (isHardRestriction(html, title)) {
          errors.push(`G2 restriction page on ${request.url} — rotating residential IP`);
          session?.retire();
          throw new SessionError("G2 temporary restriction — session retired");
        }

        if (isBlockedContent(html, title) || html.length < 8000) {
          errors.push(`Blocked/challenge on ${request.url} (title=${title.slice(0, 40)})`);
          session?.retire();
          throw new SessionError(`Soft block: ${title.slice(0, 40)}`);
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
              await page.waitForTimeout(2500);
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
        for (const review of filterByRating(batch, maxRating)) {
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
