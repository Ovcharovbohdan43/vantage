from __future__ import annotations

import logging

from openai import OpenAI

from app.config import settings
from app.db.models import PainCluster, Project
from app.services.llm_schemas import ClusterAnalysisResult

logger = logging.getLogger(__name__)


def _format_quotes(examples: list[dict]) -> str:
    lines: list[str] = []
    for idx, example in enumerate(examples[:8], start=1):
        text = (example.get("text") or "").strip()
        if not text:
            continue
        competitor = example.get("competitor") or "Unknown"
        rating = example.get("rating")
        rating_part = f" ({rating}/5)" if rating is not None else ""
        lines.append(f'{idx}. [{competitor}{rating_part}] "{text}"')
    return "\n".join(lines)


def analyze_cluster_with_llm(cluster: PainCluster, project: Project) -> ClusterAnalysisResult | None:
    if not settings.openai_api_key:
        return None
    if not cluster.examples:
        return None

    quotes_block = _format_quotes(cluster.examples)
    if not quotes_block:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = (
        "You are a market research analyst. Interpret a cluster of similar negative user reviews.\n"
        "Rules:\n"
        "- Base every claim ONLY on the provided quotes.\n"
        "- Do NOT invent problems not supported by the quotes.\n"
        "- user_quotes MUST be verbatim excerpts copied from the provided quotes (subset only).\n"
        "- Be specific and actionable, not generic.\n\n"
        f"Product idea: {project.title}\n"
        f"Category: {project.category}\n"
        f"Cluster size (frequency): {cluster.frequency} reviews\n\n"
        f"Representative quotes:\n{quotes_block}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "Return structured pain cluster analysis grounded in quotes."},
                {"role": "user", "content": prompt},
            ],
            response_format=ClusterAnalysisResult,
            temperature=0.2,
        )
        parsed = completion.choices[0].message.parsed
        if not parsed:
            return None
        return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM cluster analysis failed for %s: %s", cluster.id, exc)
        return None
