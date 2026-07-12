import { PlaywrightCrawler, ProxyConfiguration, log } from "crawlee";
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

function createProxyConfiguration(): ProxyConfiguration | undefined {
  if (config.proxyUrls.length === 0) {
    log.warning("No Webshare proxy configured — crawling without proxy (likely blocked)");
    return undefined;
  }
  return new ProxyConfiguration({
    proxyUrls: config.proxyUrls,
  });
}

async function waitPastChallenge(page: import("playwright").Page): Promise<string> {
  const deadline = Date.now() + Math.min(config.pageTimeoutMs, 45_000);
  while (Date.now() < deadline) {
    const title = await page.title();
    const html = await page.content();
    if (!isBlockedContent(html, title) && html.length >= 5000) {
      return html;
    }
    await page.waitForTimeout(1500);
  }
  return page.content();
}

function filterByRating(reviews: ScrapedReview[], maxRating: number): ScrapedReview[] {
  return reviews.filter((r) => r.rating == null || r.rating <= maxRating);
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

  const startUrls: string[] = [];
  if (ref.source === "capterra" && ref.productKey.startsWith("name:")) {
    startUrls.push(ref.url);
  } else {
    const maxPages = Math.max(1, Math.ceil(maxReviews / 8) + 2);
    for (let page = 1; page <= maxPages; page += 1) {
      startUrls.push(withPageQuery(ref.url, page));
    }
  }

  const crawler = new PlaywrightCrawler({
    proxyConfiguration: createProxyConfiguration(),
    maxRequestsPerCrawl: startUrls.length + 5,
    maxConcurrency: 1,
    navigationTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000),
    requestHandlerTimeoutSecs: Math.ceil(config.pageTimeoutMs / 1000) + 30,
    useSessionPool: true,
    persistCookiesPerSession: true,
    launchContext: {
      launchOptions: {
        headless: true,
      },
    },
    async requestHandler({ page, request, enqueueLinks }) {
      if (collected.length >= maxReviews) return;

      pagesFetched += 1;
      const html = await waitPastChallenge(page);
      const title = await page.title();

      if (isBlockedContent(html, title)) {
        errors.push(`Blocked on ${request.url}`);
        return;
      }

      // Resolve Capterra search → first product reviews URL
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
        const productPath = first.replace(/\/?$/, "/reviews/");
        resolvedUrl = productPath.includes("/reviews")
          ? productPath
          : `${first.replace(/\/$/, "")}/reviews/`;
        const idSlug = /\/p\/(\d+)\/([a-z0-9-]+)/i.exec(resolvedUrl);
        if (idSlug) {
          productKey = `${idSlug[1]}-${idSlug[2].toLowerCase()}`;
        }
        const maxPages = Math.max(1, Math.ceil(maxReviews / 8) + 2);
        const urls = Array.from({ length: maxPages }, (_, i) =>
          withPageQuery(resolvedUrl, i + 1),
        );
        await enqueueLinks({ urls, forefront: true });
        return;
      }

      let batch = extractReviewsFromHtml(html, ref.source as Source);

      if (batch.length === 0 && ref.source === "capterra") {
        const loadMore = page.locator(
          'button:has-text("Load more"), button:has-text("Show more")',
        ).first();
        if ((await loadMore.count()) > 0) {
          try {
            await loadMore.click({ timeout: 5000 });
            await page.waitForTimeout(1500);
            batch = extractReviewsFromHtml(await page.content(), "capterra");
          } catch {
            /* ignore */
          }
        }
      }

      const filtered = filterByRating(batch, maxRating);
      for (const review of filtered) {
        if (seen.has(review.text)) continue;
        seen.add(review.text);
        collected.push(review);
        if (collected.length >= maxReviews) break;
      }

      if (config.requestDelayMs > 0) {
        await page.waitForTimeout(config.requestDelayMs);
      }
    },
    failedRequestHandler({ request }, error) {
      errors.push(`${request.url}: ${error.message}`);
    },
  });

  await crawler.run(startUrls);

  // Prefer lowest ratings first (pain signal)
  collected.sort((a, b) => (a.rating ?? 99) - (b.rating ?? 99));

  return {
    reviews: collected.slice(0, maxReviews),
    pagesFetched,
    resolvedUrl,
    productKey,
    errors,
  };
}
