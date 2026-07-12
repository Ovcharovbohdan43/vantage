import { randomInt } from "node:crypto";

type WebshareProxyConfig = {
  username: string;
  password: string;
};

export type WebshareCredentials = {
  username: string;
  password: string;
  host: string;
  port: string;
};

let cachedCreds: WebshareCredentials | null = null;

/**
 * Resolve rotating residential credentials via Webshare control-plane API.
 * Docs: Authorization: Token <API_KEY>
 */
export async function fetchWebshareCredentials(apiKey: string): Promise<WebshareCredentials> {
  const response = await fetch("https://proxy.webshare.io/api/v2/proxy/config/", {
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webshare API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as WebshareProxyConfig;
  if (!data.username || !data.password) {
    throw new Error("Webshare proxy config missing username/password");
  }

  cachedCreds = {
    username: data.username,
    password: data.password,
    host: process.env.WEBSHARE_PROXY_HOST?.trim() || "p.webshare.io",
    port: process.env.WEBSHARE_PROXY_PORT?.trim() || "80",
  };
  return cachedCreds;
}

export function getCachedWebshareCredentials(): WebshareCredentials | null {
  return cachedCreds;
}

/** Rotate exit countries when G2 soft-bans a pool (US residential is hottest). */
export const WEBSHARE_COUNTRY_ROTATION = (
  process.env.WEBSHARE_COUNTRY_ROTATION?.trim() || "us,ca,gb,de,nl,fr"
)
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

export function pickProxyCountry(attempt = 1): string {
  const preferred = process.env.WEBSHARE_COUNTRY?.trim().toLowerCase();
  const pool =
    preferred && !WEBSHARE_COUNTRY_ROTATION.includes(preferred)
      ? [preferred, ...WEBSHARE_COUNTRY_ROTATION]
      : WEBSHARE_COUNTRY_ROTATION.length > 0
        ? WEBSHARE_COUNTRY_ROTATION
        : ["us"];
  const idx = Math.max(0, attempt - 1) % pool.length;
  return pool[idx];
}

/**
 * Webshare backbone username format (NOT -country- / -session- keywords):
 *   {username}-{cc}-{sessionId}   sticky, e.g. myuser-us-1234
 *   {username}-{cc}-rotate        new IP every request
 * @see https://apidocs.webshare.io/proxy-connection
 */
export function buildSessionProxyUrl(
  creds: WebshareCredentials,
  sessionId?: string | number,
  opts?: { country?: string; rotate?: boolean; attempt?: number },
): string {
  const cc = (
    opts?.country ??
    (opts?.attempt != null ? pickProxyCountry(opts.attempt) : null) ??
    process.env.WEBSHARE_COUNTRY?.trim() ??
    "US"
  ).toLowerCase();
  let user: string;
  if (opts?.rotate) {
    user = `${creds.username}-${cc}-rotate`;
  } else {
    const sid =
      typeof sessionId === "number"
        ? sessionId
        : Number.parseInt(String(sessionId || "").replace(/\D/g, "").slice(0, 8), 10) ||
          randomInt(10000, 99999999);
    user = `${creds.username}-${cc}-${sid}`;
  }
  const pass = encodeURIComponent(creds.password);
  return `http://${user}:${pass}@${creds.host}:${creds.port}`;
}

/** Pool of distinct sticky-session URLs for ProxyConfiguration rotation. */
export function buildProxyUrlPool(creds: WebshareCredentials, size = 20): string[] {
  return Array.from({ length: size }, () => buildSessionProxyUrl(creds, randomInt(10000, 99999999)));
}

export async function fetchWebshareProxyUrls(apiKey: string): Promise<string[]> {
  const creds = await fetchWebshareCredentials(apiKey);
  return buildProxyUrlPool(creds, 24);
}
