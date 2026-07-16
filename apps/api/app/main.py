from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import billing, blog, competitors, email, feedback, health, idea_of_week, library, me, pain_clusters, projects, reports, reviews, support


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.sentry_dsn:
        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Stripe-Signature", "X-Requested-With"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(me.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(competitors.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(pain_clusters.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(email.router, prefix="/api/v1")
app.include_router(library.router, prefix="/api/v1")
app.include_router(blog.router, prefix="/api/v1")
app.include_router(idea_of_week.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(support.router, prefix="/api/v1")
