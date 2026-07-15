from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from app.config import settings
from app.services.llm_schemas import SocialShareDraft

logger = logging.getLogger(__name__)


def _compact_text(value: Any, max_len: int = 500) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_len:
        return text
    return f"{text[: max_len - 1].rsplit(' ', 1)[0]}..."


def _nonzero_fact(label: str, value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)) and value <= 0:
        return None
    return f"{label}: {value}"


def _clean_share_output(value: str) -> str:
    return (
        value.replace("**", "")
        .replace("—", "-")
        .replace("–", "-")
        .replace("…", "...")
        .strip()
    )


def build_report_share_facts(report: Any) -> dict[str, Any]:
    pains = []
    for pain in list(report.pain_clusters or [])[:4]:
        metric = pain.mention_count or pain.share_pct or pain.frequency
        pains.append(
            {
                "title": pain.title,
                "metric": metric,
                "metric_kind": "mentions"
                if pain.mention_count
                else "share_pct"
                if pain.share_pct
                else "signals",
                "solution_direction": pain.solution_direction,
            }
        )

    return {
        "source_kind": "private_report",
        "idea": {
            "title": report.idea.title,
            "description": _compact_text(report.idea.description, 700),
            "category": report.idea.category,
            "target_audience": report.idea.target_audience,
        },
        "scores": {
            "market_score": round(report.scores.market_score),
            "risk_score": round(report.scores.risk_score),
            "saturation": report.scores.market_saturation,
            "confidence": report.scores.data_confidence,
        },
        "evidence": [
            _nonzero_fact("reviews_analyzed", report.stats.reviews_analyzed),
            _nonzero_fact("products_compared", report.stats.products_analyzed),
            _nonzero_fact("pain_signals", report.stats.pain_signals),
            _nonzero_fact("clusters_found", report.stats.clusters_found),
        ],
        "competitors": [item.name for item in list(report.competitors or [])[:6] if item.name],
        "top_pains": pains,
        "opportunity_reasoning": _compact_text(
            report.recommendations.opportunity_reasoning
            or report.recommendations.reasoning
            or report.summary,
            800,
        ),
        "attribution_url": "https://www.vantageserch.app/",
    }


def build_library_share_facts(article: Any) -> dict[str, Any]:
    content = article.content or {}
    blueprint = content.get("mvp_blueprint") or {}
    scores = content.get("scores") or {}
    stats = content.get("stats") or {}
    dataset = content.get("dataset") or {}

    return {
        "source_kind": "library_report",
        "idea": {
            "title": blueprint.get("concept_name") or article.title,
            "description": _compact_text(blueprint.get("product_concept") or article.executive_summary, 700),
            "target_user": _compact_text(blueprint.get("target_user"), 350),
            "value_proposition": _compact_text(blueprint.get("value_proposition"), 350),
            "success_metric": _compact_text(blueprint.get("success_metric"), 280),
        },
        "scores": {
            "market_score": scores.get("market_score"),
            "risk_score": scores.get("risk_score"),
            "saturation": article.market_saturation,
            "confidence": scores.get("data_confidence"),
        },
        "evidence": [
            _nonzero_fact("reviews_analyzed", dataset.get("reviews_analyzed") or article.reviews_count),
            _nonzero_fact("products_compared", dataset.get("products_analyzed") or article.products_count),
            _nonzero_fact("pain_signals", stats.get("pain_signals")),
            _nonzero_fact("clusters_found", stats.get("clusters_found")),
            _nonzero_fact("underserved_problems", stats.get("underserved_problems")),
        ],
        "top_pains": [
            {
                "title": pain.get("title"),
                "metric": pain.get("mention_count") or pain.get("share_pct") or pain.get("frequency"),
                "metric_kind": "mentions"
                if pain.get("mention_count")
                else "share_pct"
                if pain.get("share_pct")
                else "signals",
            }
            for pain in list(content.get("pain_points") or [])[:4]
        ],
        "mvp_features": [
            {
                "name": feature.get("name"),
                "problem": _compact_text(feature.get("problem_solved"), 180),
                "solution": _compact_text(feature.get("solution"), 220),
            }
            for feature in list(blueprint.get("features") or [])[:4]
        ],
        "risks": [
            {
                "risk": risk.get("risk"),
                "level": risk.get("level"),
                "explanation": _compact_text(risk.get("explanation"), 180),
            }
            for risk in list(content.get("risk_analysis") or [])[:2]
        ],
        "bottom_line": _compact_text(content.get("final_takeaway"), 500),
        "attribution_url": f"https://www.vantageserch.app/library/{article.slug}",
    }


def build_idea_share_facts(idea: Any) -> dict[str, Any]:
    facts = build_library_share_facts(idea.article)
    metrics = (idea.trend_data or {}).get("metrics") or {}
    facts.update(
        {
            "source_kind": "idea_of_week",
            "week": idea.week_slug,
            "headline": idea.headline,
            "dek": _compact_text(idea.dek, 500),
            "why_this_week": _compact_text(idea.why_this_week, 600),
            "trend_query": idea.trend_query,
            "trend_metrics": {
                "current_interest": metrics.get("current_interest"),
                "growth_pct": metrics.get("growth_pct"),
                "peak_interest": metrics.get("peak_interest"),
                "selection_score": round(idea.selection_score),
            },
            "attribution_url": f"https://www.vantageserch.app/idea-of-the-week/{idea.week_slug}",
        }
    )
    return facts


def generate_social_share_draft(facts: dict[str, Any]) -> SocialShareDraft | None:
    if not settings.openai_api_key:
        return None

    compact = json.dumps(facts, ensure_ascii=True, default=str)
    prompt = (
        "Write a Reddit post draft from the facts below.\n"
        "The output is for a founder who wants to share market research in a useful, human way.\n\n"
        "Voice rules:\n"
        "- Sound like a real person posting on Reddit, not a company, analyst, or AI assistant.\n"
        "- Start exactly with: I analyzed a startup idea and the results surprised me.\n"
        "- Use plain text only. No markdown headings, no bold markers, no hashtags, no emojis.\n"
        "- No corporate phrases like 'evidence-led', 'unlock value', 'receptive audience', or 'market signal'.\n"
        "- Keep it specific and useful: idea, who it helps, numbers, competitor gaps, MVP angle, risks.\n"
        "- Do not repeat the same number twice. Skip zero-count facts instead of mentioning them.\n"
        "- If demand is down, say it naturally and explain why the idea may still be worth testing.\n"
        "- Do not invent numbers, competitors, features, or claims.\n"
        "- End with one plain attribution line using the supplied attribution_url.\n"
        "- 700-1400 words is too long; aim for 250-550 words.\n\n"
        f"Facts JSON:\n{compact}"
    )

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return a natural Reddit-style social post as structured title/text. "
                        "Use only supplied facts and plain text."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format=SocialShareDraft,
            temperature=0.8,
        )
        parsed = completion.choices[0].message.parsed
        if not parsed:
            return None
        parsed.title = _clean_share_output(parsed.title)
        parsed.text = _clean_share_output(parsed.text)
        return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM social share draft failed: %s", exc)
        return None
