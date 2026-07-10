from __future__ import annotations

import logging

from openai import OpenAI

from app.config import settings
from app.db.models import Competitor, PainCluster, Project
from app.services.llm_schemas import ReportSynthesisResult

logger = logging.getLogger(__name__)


def _cluster_summary(clusters: list[PainCluster]) -> str:
    if not clusters:
        return "No pain clusters were identified from collected reviews."
    lines: list[str] = []
    for cluster in clusters[:12]:
        lines.append(
            f"- {cluster.title} (freq={cluster.frequency}, severity={cluster.severity_score or 'n/a'}): "
            f"{cluster.description or cluster.title}"
        )
    return "\n".join(lines)


def _competitor_summary(competitors: list[Competitor]) -> str:
    if not competitors:
        return "No competitors recorded."
    lines: list[str] = []
    for row in competitors[:15]:
        rating = f"{row.rating:.1f}" if row.rating is not None else "n/a"
        reviews = row.reviews_count if row.reviews_count is not None else "n/a"
        lines.append(f"- {row.name} ({row.source}, rating={rating}, reviews={reviews})")
    return "\n".join(lines)


def synthesize_report_with_llm(
    project: Project,
    clusters: list[PainCluster],
    competitors: list[Competitor],
    *,
    reviews_collected: int,
    warnings: list[str],
) -> ReportSynthesisResult | None:
    if not settings.openai_api_key:
        return None

    warning_text = ", ".join(warnings) if warnings else "none"
    client = OpenAI(api_key=settings.openai_api_key)
    prompt = (
        "You are a market research analyst writing a decision-oriented report for an indie founder.\n"
        "Rules:\n"
        "- Ground conclusions in the pain clusters and competitor landscape below.\n"
        "- If review data is limited, state uncertainty explicitly in summary and reasoning.\n"
        "- Do NOT invent pain points not present in clusters.\n"
        "- market_score: higher = more opportunity for a differentiated entrant (0-100).\n"
        "- risk_score: higher = harder to win (0-100).\n"
        "- verdict: build | pivot | dont_build with clear reasoning.\n\n"
        f"Idea: {project.title}\n"
        f"Description: {project.description}\n"
        f"Category: {project.category}\n"
        f"Target audience: {project.target_audience or 'not specified'}\n"
        f"Reviews collected: {reviews_collected}\n"
        f"Data warnings: {warning_text}\n\n"
        f"Pain clusters:\n{_cluster_summary(clusters)}\n\n"
        f"Competitors:\n{_competitor_summary(competitors)}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "Return structured market research synthesis."},
                {"role": "user", "content": prompt},
            ],
            response_format=ReportSynthesisResult,
            temperature=0.25,
        )
        parsed = completion.choices[0].message.parsed
        if not parsed:
            return None
        return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM report synthesis failed for project %s: %s", project.id, exc)
        return None
