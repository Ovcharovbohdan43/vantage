from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ReserchMarket API"
    debug: bool = False
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"

    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""

    redis_url: str = ""
    celery_broker_url: str = ""
    celery_result_backend: str = ""

    sentry_dsn: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_batch_size: int = 100
    embedding_dimensions: int = 1536
    max_negative_review_rating: int = 3
    competitor_http_timeout_seconds: float = 20.0

    playwright_headless: bool = True
    scraper_page_timeout_ms: int = 60_000
    scraper_request_delay_seconds: float = 1.5
    scraper_max_retries: int = 3
    scraper_stop_on_block: bool = False

    # Primary: standalone Crawlee/Camoufox collector. Apify is automatic fallback
    # when a competitor returns 0 reviews (requires APIFY_TOKEN).
    scraper_provider: str = "crawlee"
    apify_token: str = ""
    apify_reviews_actor: str = "zen-studio/software-review-scraper"
    review_collector_url: str = "http://localhost:8080"
    review_collector_api_key: str = ""
    review_collector_timeout_seconds: int = 600
    app_web_url: str = "http://localhost:3000"

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_starter: str = ""
    stripe_price_founder: str = ""
    stripe_price_indie: str = ""

    resend_api_key: str = ""
    resend_from_email: str = "Vantage <noreply@vantageserch.app>"
    resend_webhook_secret: str = ""
    resend_reply_to: str = ""
    # Server-only inbox for in-app Support form (never exposed to the frontend)
    support_inbox_email: str = "f62688798@gmail.com"
    # Receiving domain for support+{user_id}@… (must have Resend MX / Receiving enabled)
    support_reply_domain: str = "vantageserch.app"
    # Preview cap per competitor. None = auto (5 prod, 100 when DEBUG=true for Apify minimum).
    preview_max_reviews_per_competitor: int | None = None
    apify_timeout_seconds: int = 600

    def effective_preview_max_reviews(self) -> int:
        if self.preview_max_reviews_per_competitor is not None:
            return self.preview_max_reviews_per_competitor
        if self.debug:
            # Apify actor minimum — keep all fetched reviews in local/test runs.
            return 100
        return 5

    @property
    def crawlee_configured(self) -> bool:
        return bool(self.review_collector_url.strip()) and bool(self.review_collector_api_key.strip())

    @property
    def apify_configured(self) -> bool:
        return bool(self.apify_token.strip())

    @property
    def use_apify(self) -> bool:
        """Legacy: force Apify-only when SCRAPER_PROVIDER=apify."""
        return self.scraper_provider.strip().lower() == "apify" and self.apify_configured

    @property
    def use_crawlee(self) -> bool:
        provider = self.scraper_provider.strip().lower()
        return provider in {"crawlee", "auto", ""} and self.crawlee_configured

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key.strip())

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        url = value.strip()
        if not url:
            raise ValueError(
                "DATABASE_URL is empty. Set it in apps/api/.env "
                "(Supabase → Database → Connection string, use postgresql+asyncpg://)."
            )
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def broker(self) -> str:
        return self.celery_broker_url or self.redis_url or "memory://"

    @property
    def has_real_broker(self) -> bool:
        """True when a cross-process broker (e.g. Redis) is configured.

        With the in-memory broker, the API and worker are separate processes that
        cannot share a task queue, so tasks must run in-process instead.
        """
        return bool(self.celery_broker_url or self.redis_url)

    @property
    def result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url or "cache+memory://"

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
