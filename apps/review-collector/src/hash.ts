import { createHash } from "node:crypto";
import type { Source } from "./config.js";

export function computeContentHash(productKey: string, source: Source, text: string): string {
  const payload = `${productKey}:${source}:${text.trim().toLowerCase()}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function productNameToSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
