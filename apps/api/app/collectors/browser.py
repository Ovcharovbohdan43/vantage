from __future__ import annotations

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Error as PlaywrightError,
    Page,
    Playwright,
)

from app.config import settings

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
]

# Hide the most common headless/automation fingerprints Cloudflare inspects.
STEALTH_INIT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = { runtime: {} };
"""

# Anti-bot walls (Cloudflare) reliably clear only in headful mode; headless is detected.
CLOUDFLARE_TITLES = ("just a moment", "g2.com", "attention required", "capterra.com")


def launch_stealth_browser(playwright: Playwright) -> Browser:
    return playwright.chromium.launch(
        headless=settings.playwright_headless,
        args=LAUNCH_ARGS,
    )


def new_stealth_context(browser: Browser) -> BrowserContext:
    context = browser.new_context(
        user_agent=USER_AGENT,
        locale="en-US",
        viewport={"width": 1366, "height": 900},
    )
    context.add_init_script(STEALTH_INIT_SCRIPT)
    return context


def _looks_like_challenge(title: str, html: str) -> bool:
    lowered_title = title.strip().lower()
    if lowered_title in CLOUDFLARE_TITLES:
        return True
    # Real product pages are large; the interstitial is a few KB.
    return len(html) < 5000


def _safe_content(page: Page) -> str:
    """page.content() throws while the frame is mid-navigation (Cloudflare redirect)."""
    try:
        return page.content()
    except PlaywrightError:
        return ""


def wait_past_challenge(page: Page, *, max_wait_ms: int = 20000, poll_ms: int = 1500) -> str:
    """Wait for a Cloudflare/anti-bot interstitial to resolve; return final HTML.

    The challenge performs a client-side JS redirect, so we give the network a
    moment to settle and tolerate content() failures during navigation.
    """
    try:
        page.wait_for_load_state("networkidle", timeout=min(max_wait_ms, 12000))
    except PlaywrightError:
        pass

    waited = 0
    html = _safe_content(page)
    while waited < max_wait_ms and (not html or _looks_like_challenge(page.title(), html)):
        page.wait_for_timeout(poll_ms)
        waited += poll_ms
        html = _safe_content(page)
    return html
