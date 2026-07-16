from __future__ import annotations

import re

from app.config import settings

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    base = _SLUG_RE.sub("-", title.strip().lower()).strip("-")
    return base[:120] or "post"


def build_blog_seo(*, slug: str, title: str, excerpt: str) -> dict:
    canonical = f"{settings.public_web_url.rstrip('/')}/blog/{slug}"
    description = (excerpt or title).strip()[:300]
    return {
        "title": f"{title} · Vantage Blog",
        "description": description,
        "slug": slug,
        "canonical_url": canonical,
        "og_title": title,
        "og_description": description,
        "twitter_card": "summary_large_image",
        "json_ld": {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": title,
            "description": description,
            "url": canonical,
            "author": {
                "@type": "Person",
                "name": "Bohdan",
                "url": canonical.rsplit("/blog/", 1)[0] + "/blog",
            },
            "publisher": {
                "@type": "Organization",
                "name": "Vantage",
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{settings.public_web_url.rstrip('/')}/brand/app-icon-512.png",
                },
            },
        },
    }
