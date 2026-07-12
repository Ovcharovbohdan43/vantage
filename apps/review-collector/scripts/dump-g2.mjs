import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { launchOptions } from "camoufox-js";
import { firefox } from "playwright-core";
import { buildSessionProxyUrl, fetchWebshareCredentials } from "../src/webshare.ts";
import { extractReviewsFromHtml } from "../src/extract.ts";

const creds = await fetchWebshareCredentials(process.env.WEBSHARE_API_KEY);
const proxyUrl = buildSessionProxyUrl(creds, randomInt(10000, 99_999_999));
const u = new URL(proxyUrl);
const opts = await launchOptions({
  headless: true,
  humanize: true,
  geoip: true,
  block_webrtc: true,
  os: "windows",
  locale: ["en-US"],
  proxy: {
    server: `${u.protocol}//${u.host}`,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  },
});

const browser = await firefox.launch({ ...opts, headless: true });
const ctx = await browser.newContext({ viewport: null, locale: "en-US" });
const page = await ctx.newPage();
const target =
  process.argv[2] ?? "https://www.g2.com/products/hubspot-marketing-hub/reviews";
await page.goto(target, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForTimeout(18_000);
const html = await page.content();
const title = await page.title();
writeFileSync("tmp-g2.html", html);

const markers = [
  "__NEXT_DATA__",
  "ld+json",
  "reviewBody",
  '"pros"',
  '"cons"',
  "love",
  "hate",
  "paper--white",
  "review-card",
  "elv-tracking",
  "data-review",
  "survey_response",
  "Review",
  "truncated_review",
  "itemReviewed",
];
const foundMarkers = Object.fromEntries(
  markers.map((m) => [m, html.toLowerCase().includes(m.toLowerCase())]),
);

const reviews = extractReviewsFromHtml(html, "g2");
console.log(
  JSON.stringify(
    {
      target,
      title,
      htmlLen: html.length,
      markers: foundMarkers,
      extracted: reviews.length,
      sampleTitle: reviews[0]?.title ?? null,
      sampleText: reviews[0]?.text?.slice(0, 120) ?? null,
    },
    null,
    2,
  ),
);
await browser.close();
