import { serve } from "@hono/node-server";
import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { config, resolveProxies } from "./config.js";
import { closePool } from "./db.js";
import { collectRoutes } from "./routes/collect.js";

const app = new Hono();

function camoufoxBinaryPath(): string {
  const imageBin = path.join("/app/camoufox", "camoufox-bin");
  if (existsSync(imageBin)) return imageBin;
  const dir = process.env.CAMOUFOX_INSTALL_DIR?.trim() || "/app/camoufox";
  return path.join(dir, "camoufox-bin");
}

function camoufoxReady(): boolean {
  return existsSync(camoufoxBinaryPath());
}

function apiKeyMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "review-collector",
    proxies: config.proxyUrls.length,
    camoufox: camoufoxReady(),
    camoufoxPath: camoufoxBinaryPath(),
  }),
);

app.use("/v1/*", async (c, next) => {
  if (!config.apiKey) {
    return c.json({ error: "COLLECTOR_API_KEY is not configured" }, 500);
  }
  const header = c.req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  const alt = c.req.header("x-api-key")?.trim() || "";
  if (!apiKeyMatches(token, config.apiKey) && !apiKeyMatches(alt, config.apiKey)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

app.route("/v1/collect", collectRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

// Keep the HTTP process alive if Camoufox/Playwright emits a bad pageerror.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

// Bind all interfaces first — Railway health/proxy must not wait on Webshare.
const server = serve(
  { fetch: app.fetch, port: config.port, hostname: "0.0.0.0" },
  (info) => {
    console.log(`review-collector listening on 0.0.0.0:${info.port}`);
  },
);

if (camoufoxReady()) {
  console.log(`camoufox: ready at ${camoufoxBinaryPath()}`);
} else {
  console.error(
    `camoufox: MISSING at ${camoufoxBinaryPath()} — rebuild image with camoufox-js fetch`,
  );
}

try {
  await resolveProxies();
  console.log(
    `proxy: ${config.proxyUrls.length > 0 ? `${config.proxyUrls.length} URL(s)` : "NONE"}`,
  );
} catch (err) {
  console.error("[startup] proxy resolve failed (service stays up for /health):", err);
}

async function shutdown() {
  console.log("shutting down…");
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
