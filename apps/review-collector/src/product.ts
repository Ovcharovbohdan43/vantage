import type { Source } from "./config.js";
import { productNameToSlug } from "./hash.js";

const G2_PRODUCT_RE =
  /^https?:\/\/(?:www\.)?g2\.com\/products\/([a-z0-9-]+)(?:\/reviews?)?\/?(?:\?.*)?$/i;
const CAPTERRA_PRODUCT_RE =
  /^https?:\/\/(?:www\.)?capterra\.com\/p\/(\d+)\/([a-z0-9-]+)\/?(?:\?.*)?$/i;

export type ProductRef = {
  source: Source;
  productKey: string;
  url: string;
  nameHint: string | null;
};

export function resolveProductRef(query: string, source: Source): ProductRef {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("query is required");
  }

  if (source === "g2") {
    const match = G2_PRODUCT_RE.exec(trimmed);
    if (match) {
      const slug = match[1].toLowerCase();
      return {
        source: "g2",
        productKey: slug,
        url: `https://www.g2.com/products/${slug}/reviews`,
        nameHint: null,
      };
    }
    const slug = productNameToSlug(trimmed);
    if (!slug) throw new Error("Could not derive G2 product key from query");
    return {
      source: "g2",
      productKey: slug,
      url: `https://www.g2.com/products/${slug}/reviews`,
      nameHint: trimmed,
    };
  }

  const capMatch = CAPTERRA_PRODUCT_RE.exec(trimmed);
  if (capMatch) {
    const id = capMatch[1];
    const slug = capMatch[2].toLowerCase();
    return {
      source: "capterra",
      productKey: `${id}-${slug}`,
      url: `https://www.capterra.com/p/${id}/${capMatch[2]}/reviews/`,
      nameHint: null,
    };
  }

  // Name-only Capterra: search URL — crawler resolves first product link.
  const slug = productNameToSlug(trimmed);
  if (!slug) throw new Error("Could not derive Capterra product key from query");
  return {
    source: "capterra",
    productKey: `name:${slug}`,
    url: `https://www.capterra.com/search/?search=${encodeURIComponent(trimmed)}`,
    nameHint: trimmed,
  };
}

export function withPageQuery(url: string, pageNum: number): string {
  if (pageNum <= 1) return url;
  const u = new URL(url);
  u.searchParams.set("page", String(pageNum));
  return u.toString();
}
