export type Source = "g2" | "capterra";

export type ScrapedReview = {
  source: Source;
  text: string;
  rating: number | null;
  title: string | null;
  author: string | null;
  reviewDate: string | null;
  language: string | null;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildStaticProxyUrls(): string[] {
  const full = process.env.WEBSHARE_PROXY_URL?.trim();
  if (full) return [full];

  const host = process.env.WEBSHARE_PROXY_HOST?.trim() || "p.webshare.io";
  const port = process.env.WEBSHARE_PROXY_PORT?.trim() || "80";
  const user = process.env.WEBSHARE_PROXY_USERNAME?.trim();
  const pass = process.env.WEBSHARE_PROXY_PASSWORD?.trim();

  if (user && pass) {
    return [`http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`];
  }

  // Authorized-IP mode (local / fixed egress only)
  if (process.env.WEBSHARE_USE_IP_AUTH === "1") {
    return [`http://${host}:${port}`];
  }

  return [];
}

export const config = {
  port: envInt("PORT", 8080),
  databaseUrl: process.env.DATABASE_URL?.trim() || "",
  apiKey: process.env.COLLECTOR_API_KEY?.trim() || "",
  webshareApiKey: process.env.WEBSHARE_API_KEY?.trim() || "",
  /** Filled at startup when WEBSHARE_API_KEY is set, otherwise from static env. */
  proxyUrls: buildStaticProxyUrls() as string[],
  maxNegativeRating: envInt("MAX_NEGATIVE_RATING", 3),
  requestDelayMs: envInt("REQUEST_DELAY_MS", 1500),
  pageTimeoutMs: envInt("PAGE_TIMEOUT_MS", 60_000),
  minReviewLength: envInt("MIN_REVIEW_LENGTH", 50),
  cacheTtlHours: envInt("CACHE_TTL_HOURS", 168),
};

export async function resolveProxies(): Promise<void> {
  if (config.webshareApiKey) {
    const { fetchWebshareProxyUrls } = await import("./webshare.js");
    config.proxyUrls = await fetchWebshareProxyUrls(config.webshareApiKey);
    return;
  }
  if (config.proxyUrls.length === 0) {
    console.warn("No Webshare proxy configured — crawling without proxy (likely blocked)");
  }
}
