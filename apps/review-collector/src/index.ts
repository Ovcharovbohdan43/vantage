import { serve } from "@hono/node-server";
import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { config, resolveProxies } from "./config.js";
import { closePool } from "./db.js";
import { collectRoutes } from "./routes/collect.js";

await resolveProxies();

const app = new Hono();

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

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`review-collector listening on :${info.port}`);
  console.log(`proxy: ${config.proxyUrls.length > 0 ? `${config.proxyUrls.length} URL(s)` : "NONE"}`);
});

async function shutdown() {
  console.log("shutting down…");
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
