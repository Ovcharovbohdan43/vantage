from __future__ import annotations

import json
import logging

from openai import OpenAI

from app.config import settings
from app.db.models import Competitor, PainCluster, Project
from app.services.llm_schemas import ReportSynthesisResult

logger = logging.getLogger(__name__)


def synthesize_report_with_llm(
    project: Project,
    clusters: list[PainCluster],
    competitors: list[Competitor],
    *,
    reviews_collected: int,
    analytics_payload: dict,
) -> ReportSynthesisResult | None:
    """Synthesize a short data-grounded summary. No BUILD verdict, no interview advice."""
    if not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    compact = {
        "reviews_collected": reviews_collected,
        "competitors": [
            {
                "name": row.name,
                "source": row.source,
                "rating": row.rating,
                "reviews_count": row.reviews_count,
            }
            for row in competitors[:15]
        ],
        "opportunity_size": analytics_payload.get("opportunity_size"),
        "opportunities": analytics_payload.get("opportunities_summary", [])[:8],
    }

    prompt = (
        "You write a short research summary for a founder who paid to hear unhappy customers "
        "of competitor products — NOT ChatGPT product advice.\n"
        "Tone: 'Here’s what N unhappy customers are actually telling you.'\n"
        "Rules:\n"
        "- Use ONLY the JSON analytics below. Do not invent pains, percentages, or features.\n"
        "- summary: 2–4 sentences citing real counts (reviews, top pain shares, competitor names).\n"
        "- opportunity_reasoning: explain the opportunity_score using complaint volume, "
        "concentration, and trend if present. No 'build' / 'pivot' / 'don't build'.\n"
        "- market_score: higher = more room for a differentiated entrant (0-100).\n"
        "- risk_score: higher = harder to win (0-100).\n"
        "- market_saturation: HIGH | MEDIUM | LOW from competitor density.\n"
        "- FORBIDDEN: interview users, improve UX, better onboarding advice, BUILD verdicts, "
        "generic next steps, mentioning Apify/scraper/internal warnings.\n\n"
        f"Founder idea (context only): {project.title}\n"
        f"Category: {project.category}\n\n"
        f"Analytics JSON:\n{json.dumps(compact, ensure_ascii=True, default=str)}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return structured market research synthesis grounded in provided counts. "
                        "Never give founder playbooks or build/pivot verdicts."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format=ReportSynthesisResult,
            temperature=0.25,
        )
        parsed = completion.choices[0].message.parsed
        if not parsed:
            return None
        # Force empty deprecated fields even if the model fills them.
        if parsed.recommendations is None:
            from app.services.llm_schemas import ReportRecommendations

            parsed.recommendations = ReportRecommendations(
                verdict="pivot",
                reasoning=parsed.opportunity_reasoning,
                next_steps=[],
                feature_ideas=[],
            )
        else:
            parsed.recommendations.next_steps = []
            parsed.recommendations.feature_ideas = []
            if not parsed.recommendations.reasoning:
                parsed.recommendations.reasoning = parsed.opportunity_reasoning
        return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM report synthesis failed for project %s: %s", project.id, exc)
        return None
