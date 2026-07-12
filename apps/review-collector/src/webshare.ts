type WebshareProxyConfig = {
  username: string;
  password: string;
};

/**
 * Resolve rotating residential proxy URLs via Webshare control-plane API.
 * Docs: Authorization: Token <API_KEY>
 */
export async function fetchWebshareProxyUrls(apiKey: string): Promise<string[]> {
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

  const host = process.env.WEBSHARE_PROXY_HOST?.trim() || "p.webshare.io";
  const ports = (process.env.WEBSHARE_PROXY_PORTS?.trim() || "80,1080,3128")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const user = encodeURIComponent(data.username);
  const pass = encodeURIComponent(data.password);

  return ports.map((port) => `http://${user}:${pass}@${host}:${port}`);
}
