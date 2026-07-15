from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from statistics import mean

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import IdeaOfWeekSelection, LibraryArticle, Report

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search.json"
CONFIDENCE_SCORE = {"high": 15.0, "medium": 9.0, "low": 3.0}
MAX_TREND_CANDIDATES = 5
REUSE_COOLDOWN_WEEKS = 8
# One weekly selection uses at most two SerpApi calls:
# 1) batched TIMESERIES for finalists, 2) solo TIMESERIES chart for the winner.
SERPAPI_REQUESTS_PER_SELECTION = 2
SERPAPI_CHART_REQUESTS = 1
MARKETING_FILLER = re.compile(
    r"\b(user[- ]friendly|advanced|customizable|simple|modern|best|easy[- ]to[- ]use)\b",
    re.IGNORECASE,
)


@dataclass
class Candidate:
    article: LibraryArticle
    report: Report
    query: str
    internal_score: float
    growing_share: float
    commercial_score: float


@dataclass
class SerpApiUsage:
    requests: int = 0


def monday_for(value: date | None = None) -> date:
    day = value or datetime.now(UTC).date()
    return day - timedelta(days=day.weekday())


def week_slug(value: date) -> str:
    iso_year, iso_week, _ = value.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _trend_query(article: LibraryArticle) -> str:
    """Build a real Google search query, not an invented MVP brand name.

    Names like "User-Friendly Survey Tool" usually have zero Trends volume.
    Titles such as "Is It Worth Building Survey Tools in 2026?" become "survey tools".
    """
    title = article.title or ""
    query = re.sub(r"^Is It Worth Building\s+", "", title, flags=re.IGNORECASE)
    query = re.sub(r"\s+in\s+\d{4}\?$", "", query, flags=re.IGNORECASE)
    query = MARKETING_FILLER.sub(" ", query)
    query = re.sub(r"[,|]+", " ", query)
    query = re.sub(r"\s+", " ", query).strip(" ?")
    if query.lower() in {"", "software", "this type of b2b software", "workflow clarity"}:
        category = (article.category or "").strip()
        query = f"{category} software" if category and category.lower() != "other" else "b2b software"
    elif not re.search(r"\b(software|tool|tools|app|platform|saas)\b", query, re.IGNORECASE):
        query = f"{query} software"
    return query[:80]


def _candidate(article: LibraryArticle, report: Report) -> Candidate:
    clusters = list((article.content or {}).get("pain_points") or [])
    growing = sum(1 for item in clusters if item.get("trend") == "growing")
    growing_share = growing / len(clusters) if clusters else 0.0
    commercial_values = [
        float(item["commercial_opportunity"])
        for item in clusters
        if item.get("commercial_opportunity") is not None
    ]
    commercial_score = mean(commercial_values) if commercial_values else 5.0
    internal_score = (
        float(report.market_score) * 0.65
        + CONFIDENCE_SCORE.get(str(report.data_confidence).lower(), 9.0)
        + growing_share * 10.0
        + commercial_score
    )
    return Candidate(
        article=article,
        report=report,
        query=_trend_query(article),
        internal_score=round(min(100.0, internal_score), 2),
        growing_share=round(growing_share, 3),
        commercial_score=round(commercial_score, 2),
    )


def _timeline(payload: dict) -> list[dict]:
    interest = payload.get("interest_over_time") or {}
    rows = interest.get("timeline_data") if isinstance(interest, dict) else interest
    return list(rows or [])


def _series_by_query(payload: dict) -> dict[str, list[dict]]:
    series: dict[str, list[dict]] = {}
    for point in _timeline(payload):
        timestamp = int(point.get("timestamp") or 0)
        for value in point.get("values") or []:
            query = str(value.get("query") or "").strip()
            if not query:
                continue
            series.setdefault(query, []).append(
                {
                    "date": str(point.get("date") or ""),
                    "timestamp": timestamp,
                    "value": int(value.get("extracted_value") or 0),
                }
            )
    return series


def _points_for_query(series: dict[str, list[dict]], query: str) -> list[dict]:
    if query in series:
        return series[query]
    lowered = {key.lower(): values for key, values in series.items()}
    matched = lowered.get(query.lower())
    if matched:
        return matched
    if len(series) == 1:
        return next(iter(series.values()))
    return []


def _trend_metrics(points: list[dict]) -> dict:
    values = [int(point.get("value") or 0) for point in points]
    latest_window = values[-4:]
    previous_window = values[-12:-4]
    latest = mean(latest_window) if latest_window else 0.0
    previous = mean(previous_window) if previous_window else latest
    growth_pct = ((latest - previous) / previous * 100.0) if previous > 0 else 0.0
    return {
        "current_interest": round(latest, 1),
        "previous_interest": round(previous, 1),
        "growth_pct": round(growth_pct, 1),
        "peak_interest": max(values, default=0),
    }


async def _serpapi(params: dict[str, str], usage: SerpApiUsage | None = None) -> dict:
    if not settings.serpapi_api_key:
        raise RuntimeError("SERPAPI_API_KEY is not configured")
    request_params = {
        "engine": "google_trends",
        "hl": "en",
        "date": "today 12-m",
        "tz": "0",
        "api_key": settings.serpapi_api_key,
        **params,
    }
    async with httpx.AsyncClient(timeout=settings.serpapi_timeout_seconds) as client:
        response = await client.get(SERPAPI_URL, params=request_params)
        response.raise_for_status()
        payload = response.json()
    if usage is not None:
        usage.requests += 1
    if payload.get("error"):
        raise RuntimeError(str(payload["error"]))
    return payload


async def _fetch_candidate_trends(
    candidates: list[Candidate],
    usage: SerpApiUsage | None = None,
) -> dict[str, list[dict]]:
    if not candidates:
        return {}
    payload = await _serpapi(
        {
            "q": ",".join(candidate.query for candidate in candidates),
            "data_type": "TIMESERIES",
        },
        usage,
    )
    return _series_by_query(payload)


async def _fetch_solo_trends(query: str, usage: SerpApiUsage | None = None) -> list[dict]:
    """Fetch a single-query series so the chart scales 0–100 against itself."""
    payload = await _serpapi({"q": query, "data_type": "TIMESERIES"}, usage)
    return _points_for_query(_series_by_query(payload), query)


async def _fetch_related_queries(query: str, usage: SerpApiUsage | None = None) -> dict:
    payload = await _serpapi({"q": query, "data_type": "RELATED_QUERIES"}, usage)
    related = payload.get("related_queries") or {}

    def clean(items: list[dict]) -> list[dict]:
        return [
            {
                "query": str(item.get("query") or ""),
                "value": str(item.get("value") or ""),
                "growth": item.get("extracted_value"),
            }
            for item in items[:8]
            if item.get("query")
        ]

    return {
        "rising": clean(list(related.get("rising") or [])),
        "top": clean(list(related.get("top") or [])),
    }


async def _monthly_serpapi_usage(db: AsyncSession) -> int:
    month_start = date.today().replace(day=1)
    selections = (
        await db.scalars(
            select(IdeaOfWeekSelection).where(
                IdeaOfWeekSelection.status == "published",
                IdeaOfWeekSelection.week_start >= month_start,
            )
        )
    ).all()
    total = 0
    for selection in selections:
        inputs = selection.selection_inputs or {}
        recorded = inputs.get("serpapi_requests")
        if recorded is not None:
            total += int(recorded)
            continue
        if (selection.trend_data or {}).get("source") == "serpapi_google_trends":
            total += SERPAPI_REQUESTS_PER_SELECTION
    return total


def _serpapi_budget_plan(remaining: int) -> tuple[bool, bool, int]:
    if remaining >= SERPAPI_REQUESTS_PER_SELECTION:
        return True, True, SERPAPI_REQUESTS_PER_SELECTION
    if remaining >= SERPAPI_CHART_REQUESTS:
        return True, False, SERPAPI_CHART_REQUESTS
    return False, False, 0


def _final_score(candidate: Candidate, metrics: dict) -> float:
    demand = float(metrics.get("current_interest") or 0)
    growth = float(metrics.get("growth_pct") or 0)
    momentum = max(0.0, min(100.0, 50.0 + growth))
    score = candidate.internal_score * 0.7 + demand * 0.15 + momentum * 0.15
    # All-zero Trends series means the query is not a real search term — demote it.
    if float(metrics.get("peak_interest") or 0) <= 0:
        score *= 0.45
    return round(score, 2)


async def select_idea_of_week(
    db: AsyncSession,
    *,
    target_week: date | None = None,
    force: bool = False,
) -> IdeaOfWeekSelection:
    week_start = monday_for(target_week)
    existing = await db.scalar(
        select(IdeaOfWeekSelection).where(IdeaOfWeekSelection.week_start == week_start)
    )
    if existing and existing.status == "published" and not force:
        return existing

    cooldown_start = week_start - timedelta(weeks=REUSE_COOLDOWN_WEEKS)
    recent_article_ids = set(
        (
            await db.scalars(
                select(IdeaOfWeekSelection.article_id).where(
                    IdeaOfWeekSelection.status == "published",
                    IdeaOfWeekSelection.week_start >= cooldown_start,
                )
            )
        ).all()
    )
    rows = (
        await db.execute(
            select(LibraryArticle, Report)
            .join(Report, Report.project_id == LibraryArticle.project_id)
            .where(LibraryArticle.status == "published")
        )
    ).all()
    candidates = [
        _candidate(article, report)
        for article, report in rows
        if article.id not in recent_article_ids and (article.content or {}).get("mvp_blueprint")
    ]
    if not candidates:
        candidates = [
            _candidate(article, report)
            for article, report in rows
            if (article.content or {}).get("mvp_blueprint")
        ]
    if not candidates:
        raise RuntimeError("No published library articles with MVP blueprints are eligible")

    finalists = sorted(candidates, key=lambda item: item.internal_score, reverse=True)[
        :MAX_TREND_CANDIDATES
    ]
    monthly_usage = await _monthly_serpapi_usage(db)
    monthly_budget = max(0, int(settings.serpapi_monthly_budget))
    remaining_budget = monthly_budget - monthly_usage
    fetch_trends, fetch_chart, planned_requests = _serpapi_budget_plan(remaining_budget)
    if not settings.serpapi_api_key:
        fetch_trends = False
        fetch_chart = False
        planned_requests = 0

    trend_source = "serpapi_google_trends" if fetch_trends else "unavailable"
    trend_series: dict[str, list[dict]] = {}
    serpapi_usage = SerpApiUsage()
    if fetch_trends:
        try:
            trend_series = await _fetch_candidate_trends(finalists, serpapi_usage)
        except Exception as exc:
            logger.warning("Google Trends candidate lookup failed: %s", exc)
            trend_source = "unavailable"
            trend_series = {}
            fetch_chart = False

    ranked: list[tuple[float, Candidate, dict, list[dict]]] = []
    for candidate in finalists:
        points = _points_for_query(trend_series, candidate.query)
        metrics = _trend_metrics(points)
        ranked.append((_final_score(candidate, metrics), candidate, metrics, points))
    final_score, winner, metrics, points = max(ranked, key=lambda item: item[0])

    related = {"rising": [], "top": []}
    # Second call: solo chart so values scale 0–100 for that market term.
    if fetch_chart and trend_source == "serpapi_google_trends":
        try:
            solo_points = await _fetch_solo_trends(winner.query, serpapi_usage)
            if solo_points and max(int(point.get("value") or 0) for point in solo_points) > 0:
                points = solo_points
                metrics = _trend_metrics(points)
                final_score = _final_score(winner, metrics)
        except Exception as exc:
            logger.warning("Google Trends chart lookup failed: %s", exc)

    requests_used = serpapi_usage.requests

    blueprint = (winner.article.content or {}).get("mvp_blueprint") or {}
    growth = float(metrics.get("growth_pct") or 0)
    direction = "up" if growth > 5 else "steady" if growth >= -5 else "down"
    why_this_week = (
        f"{winner.query} demand is {direction} over the latest four-week window "
        f"({growth:+.1f}% versus the preceding eight weeks). The underlying report scored "
        f"{winner.report.market_score:.0f}/100 for market opportunity with "
        f"{winner.report.data_confidence} data confidence."
    )
    trend_data = {
        "source": trend_source,
        "date_range": "today 12-m",
        "geo": "Worldwide",
        "points": points,
        "metrics": metrics,
        "related_queries": related,
        "api_budget": {
            "monthly_budget": monthly_budget,
            "monthly_used_before": monthly_usage,
            "requests_used": requests_used,
            "requests_planned": planned_requests,
        },
    }
    selection_inputs = {
        "market_score": round(float(winner.report.market_score), 1),
        "data_confidence": winner.report.data_confidence,
        "internal_score": winner.internal_score,
        "growing_pain_share": winner.growing_share,
        "commercial_opportunity": winner.commercial_score,
        "candidate_count": len(candidates),
        "trend_candidate_count": len(finalists),
        "serpapi_requests": requests_used,
    }
    headline = f"This week's build: {blueprint.get('concept_name') or winner.query}"
    dek = str(blueprint.get("value_proposition") or winner.article.executive_summary)

    if existing:
        # Force refresh keeps the unique week_start / week_slug row and overwrites content.
        existing.article_id = winner.article.id
        existing.status = "published"
        existing.headline = headline
        existing.dek = dek
        existing.why_this_week = why_this_week
        existing.trend_query = winner.query
        existing.trend_data = trend_data
        existing.selection_score = final_score
        existing.selection_inputs = selection_inputs
        existing.published_at = datetime.now(UTC)
        existing.updated_at = datetime.now(UTC)
        selection = existing
    else:
        selection = IdeaOfWeekSelection(
            week_start=week_start,
            week_slug=week_slug(week_start),
            article_id=winner.article.id,
            status="published",
            headline=headline,
            dek=dek,
            why_this_week=why_this_week,
            trend_query=winner.query,
            trend_data=trend_data,
            selection_score=final_score,
            selection_inputs=selection_inputs,
            published_at=datetime.now(UTC),
        )
        db.add(selection)

    await db.commit()
    await db.refresh(selection)
    return selection
