import { randomBytes } from "node:crypto";

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

function sessionToken(): string {
  return randomBytes(6).toString("hex");
}

/**
 * Build a backbone proxy URL with a unique sticky session so each Crawlee
 * session gets a fresh residential exit IP (critical after G2 bans).
 *
 * Webshare username params: -country-XX -session-ID
 * @see https://apidocs.webshare.io/proxy-connection
 */
export function buildSessionProxyUrl(
  creds: WebshareCredentials,
  sessionId?: string,
  opts?: { country?: string },
): string {
  const country = opts?.country ?? process.env.WEBSHARE_COUNTRY?.trim() ?? "US";
  const sid = (sessionId || sessionToken()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || sessionToken();
  const countryPart = country ? `-country-${country}` : "";
  // Do not encode the whole username — Webshare expects literal hyphens for params.
  const user = `${creds.username}${countryPart}-session-${sid}`;
  const pass = encodeURIComponent(creds.password);
  return `http://${user}:${pass}@${creds.host}:${creds.port}`;
}

/** Pool of distinct session URLs for ProxyConfiguration rotation. */
export function buildProxyUrlPool(creds: WebshareCredentials, size = 20): string[] {
  return Array.from({ length: size }, () => buildSessionProxyUrl(creds));
}

export async function fetchWebshareProxyUrls(apiKey: string): Promise<string[]> {
  const creds = await fetchWebshareCredentials(apiKey);
  return buildProxyUrlPool(creds, 24);
}
