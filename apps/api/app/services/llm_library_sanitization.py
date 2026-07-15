from __future__ import annotations

import logging

from openai import OpenAI

from app.config import settings
from app.services.llm_schemas import LibraryArticleDraft, LibrarySanitizationResult

logger = logging.getLogger(__name__)

FORBIDDEN_HINTS = [
    "my idea",
    "our startup",
    "we should build",
    "you should build",
    "verdict:",
    "next steps for your",
]


def _residual_issues(content: str) -> list[str]:
    blob = content.lower()
    return [f"Forbidden phrase: {hint}" for hint in FORBIDDEN_HINTS if hint in blob]


def sanitize_library_article_with_llm(draft: LibraryArticleDraft) -> LibrarySanitizationResult | None:
    if not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    article_json = draft.model_dump_json()

    prompt = (
        "You are a privacy reviewer for public market research articles.\n"
        "Check the article JSON and remove ONLY content that reveals the private researcher or their startup idea.\n\n"
        "ALLOWED (these are required in public articles):\n"
        "- Competitor product names (e.g. Salesforce, HubSpot)\n"
        "- Anonymized customer review quotes from G2/Capterra\n"
        "- Generic market category analysis\n"
        "- Pain points derived from public reviews\n\n"
        "FORBIDDEN (must remove or rewrite):\n"
        "- The researcher's startup idea, product concept, or project name\n"
        "- Personalized build/pivot/don't-build advice for a specific founder\n"
        "- References to 'your idea', 'your product', 'you should build'\n"
        "- Any hint of who commissioned this research\n\n"
        "Set is_safe=true if the article is market-generic (even with product names and quotes).\n"
        "Set is_safe=false ONLY if forbidden content is present.\n"
        "Always return sanitized_title, sanitized_executive_summary, sanitized_final_takeaway "
        "(use original text when already safe).\n\n"
        f"Article JSON:\n{article_json}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "Return privacy sanitization result."},
                {"role": "user", "content": prompt},
            ],
            response_format=LibrarySanitizationResult,
            temperature=0.0,
        )
        return completion.choices[0].message.parsed
    except Exception:
        logger.exception("Library sanitization LLM failed")
        return None


def sanitize_library_article(draft: LibraryArticleDraft) -> LibrarySanitizationResult:
    llm_result = sanitize_library_article_with_llm(draft)

    if llm_result:
        sanitized_draft = draft.model_copy(
            update={
                "title": llm_result.sanitized_title,
                "executive_summary": llm_result.sanitized_executive_summary,
                "final_takeaway": llm_result.sanitized_final_takeaway,
            }
        )
        residual = _residual_issues(sanitized_draft.model_dump_json())
        if residual:
            llm_result.issues.extend(residual)
            llm_result.is_safe = False
        return llm_result

    residual = _residual_issues(draft.model_dump_json())
    return LibrarySanitizationResult(
        is_safe=len(residual) == 0,
        issues=residual,
        sanitized_title=draft.title,
        sanitized_executive_summary=draft.executive_summary,
        sanitized_final_takeaway=draft.final_takeaway,
    )
