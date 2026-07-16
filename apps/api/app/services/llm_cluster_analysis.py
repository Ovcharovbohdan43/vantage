from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from openai import OpenAI

from app.config import settings
from app.db.models import PainCluster, Project
from app.services.llm_schemas import ClusterAnalysisResult

logger = logging.getLogger(__name__)

MAX_PARALLEL_CLUSTER_LLM = 4


def cluster_examples_list(examples: Any) -> list[dict]:
    """Normalize PainCluster.examples which may be a list or {quotes, sub_themes}."""
    if isinstance(examples, dict):
        quotes = examples.get("quotes") or []
        return [q for q in quotes if isinstance(q, dict)]
    if isinstance(examples, list):
        return [q for q in examples if isinstance(q, dict)]
    return []


def cluster_sub_themes_list(examples: Any) -> list[dict]:
    if isinstance(examples, dict):
        themes = examples.get("sub_themes") or []
        return [t for t in themes if isinstance(t, dict)]
    return []


def _format_quotes(examples: list[dict], *, limit: int = 12) -> str:
    lines: list[str] = []
    for idx, example in enumerate(examples[:limit], start=1):
        text = (example.get("text") or "").strip()
        if not text:
            continue
        competitor = example.get("competitor") or "Unknown"
        rating = example.get("rating")
        rating_part = f" ({rating}/5)" if rating is not None else ""
        clipped = text if len(text) <= 320 else f"{text[:317]}..."
        lines.append(f'{idx}. [{competitor}{rating_part}] "{clipped}"')
    return "\n".join(lines)


def _format_sub_themes(sub_themes: list[dict]) -> str:
    if not sub_themes:
        return "None"
    lines: list[str] = []
    for idx, theme in enumerate(sub_themes):
        title = theme.get("title") or theme.get("title_placeholder") or "Untitled"
        freq = theme.get("frequency", 0)
        lines.append(f"{idx}. frequency={freq} placeholder=\"{title}\"")
        for ex in (theme.get("examples") or [])[:2]:
            text = (ex.get("text") or "").strip()
            if text:
                clipped = text if len(text) <= 180 else f"{text[:177]}..."
                lines.append(f'   quote: "{clipped}"')
    return "\n".join(lines)


def _format_request_candidates(candidates: list[dict]) -> str:
    if not candidates:
        return "None"
    lines: list[str] = []
    for idx, item in enumerate(candidates[:30]):
        text = (item.get("text") or "").strip()
        if text:
            lines.append(f'{idx}. "{text}"')
    return "\n".join(lines) if lines else "None"


def analyze_cluster_with_llm(
    cluster: PainCluster,
    project: Project,
    *,
    analytics: dict | None = None,
) -> ClusterAnalysisResult | None:
    if not settings.openai_api_key:
        return None

    examples = cluster_examples_list(cluster.examples)
    if not examples:
        return None

    analytics = analytics or {}
    diffuse = bool(analytics.get("diffuse_complaints"))
    sub_themes = analytics.get("sub_themes") or cluster_sub_themes_list(cluster.examples)
    request_candidates = analytics.get("request_candidates") or []
    competitors = analytics.get("competitors") or []
    top_terms = analytics.get("top_terms") or []
    mention_count = analytics.get("mention_count") or cluster.frequency
    share_pct = analytics.get("share_pct")
    share_part = f", share={share_pct}%" if share_pct is not None else ""

    quotes_block = _format_quotes(examples)
    if not quotes_block:
        return None

    competitor_line = ", ".join(
        f"{c.get('name')} ({c.get('complaints')})" for c in competitors[:8]
    ) or "n/a"
    terms_line = ", ".join(
        f"{t.get('term')}×{t.get('count')}" for t in top_terms[:10]
    ) or "n/a"

    client = OpenAI(api_key=settings.openai_api_key)
    if diffuse:
        prompt = (
            "Automatic clustering could NOT find a recurring pain pattern — reviews are too diverse.\n"
            "Your job: confirm that clearly and still ground the write-up in the sample quotes.\n"
            "Rules:\n"
            "- title: state that no single dominant user pain could be isolated "
            "(e.g. 'Complaints are too scattered to name one dominant pain').\n"
            "- description: 2–3 sentences — cite that clustering failed, mention volume, "
            "and note 1–2 concrete themes that appear in quotes WITHOUT claiming they dominate.\n"
            "- why_opportunity: explain that fragmented complaints mean the market signal is weak/"
            "unclear for a single wedge — using the numbers given.\n"
            "- sub_theme_titles / feature_request_groups: leave empty arrays if nothing coherent.\n"
            "- Base every claim ONLY on the provided evidence. Do not invent a fake top pain.\n\n"
            f"Product idea context (for naming only): {project.title}\n"
            f"Category: {project.category}\n"
            f"Sample size: {mention_count} reviews{share_part}\n"
            f"Competitor complaint split: {competitor_line}\n"
            f"Frequent words: {terms_line}\n\n"
            f"Representative quotes:\n{quotes_block}"
        )
    else:
        prompt = (
            "You name a pain cluster from real negative software reviews. You do NOT invent advice.\n"
            "Rules:\n"
            "- title: one concrete sentence about what users struggle with "
            "(e.g. 'Users abandon setup because onboarding takes too long').\n"
            "- FORBIDDEN titles: 'Negative User Experience', 'User Pain Points', 'Poor UX', "
            "'Customer Complaints', or any vague umbrella label.\n"
            "- description: 2–3 sentences grounded only in quotes + provided counts.\n"
            "- why_opportunity: why this unresolved complaint is commercially interesting, "
            "using the numbers given (no 'interview users' / 'improve UX').\n"
            "- sub_theme_titles: rename each indexed sub-theme with a concrete short phrase; "
            "keep the same index; do not invent extra sub-themes.\n"
            "- feature_request_groups: group the numbered request candidates into specific asks "
            "(e.g. 'bank auto-import', 'offline mode'). Put candidate_indices that belong together. "
            "Do NOT invent counts — only group indices. Skip if candidates are None.\n"
            "- Base every claim ONLY on the provided evidence.\n\n"
            f"Product idea context (for naming only): {project.title}\n"
            f"Category: {project.category}\n"
            f"Cluster size: {mention_count} reviews{share_part}\n"
            f"Competitor complaint split: {competitor_line}\n"
            f"Frequent words: {terms_line}\n\n"
            f"Sub-themes to rename:\n{_format_sub_themes(sub_themes)}\n\n"
            f"Feature-request candidate sentences:\n{_format_request_candidates(request_candidates)}\n\n"
            f"Representative quotes:\n{quotes_block}"
        )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return structured pain naming grounded in quotes and counts. "
                        "Never give founder advice. Never use vague cluster labels."
                        if not diffuse
                        else (
                            "Return structured analysis confirming that complaints are too diverse "
                            "for a dominant pain. Never invent a fake recurring theme."
                        )
                    ),
                },
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


def analyze_clusters_parallel(
    items: list[tuple[PainCluster, Project, dict | None]],
    *,
    max_workers: int = MAX_PARALLEL_CLUSTER_LLM,
) -> dict[str, ClusterAnalysisResult]:
    """Run cluster LLM naming concurrently (thread pool around sync OpenAI client)."""
    results: dict[str, ClusterAnalysisResult] = {}
    if not items:
        return results

    workers = min(max_workers, len(items))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(analyze_cluster_with_llm, cluster, project, analytics=analytics): str(cluster.id)
            for cluster, project, analytics in items
        }
        for future in as_completed(futures):
            cluster_id = futures[future]
            try:
                analysis = future.result()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Parallel cluster LLM failed for %s: %s", cluster_id, exc)
                continue
            if analysis:
                results[cluster_id] = analysis
    return results
