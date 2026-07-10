import logging

from openai import OpenAI

from app.config import settings
from app.services.llm_schemas import CompetitorSuggestion, CompetitorSuggestionList

logger = logging.getLogger(__name__)

DEPTH_SUGGESTION_COUNTS = {
    "shallow": 8,
    "standard": 12,
    "deep": 15,
}


def _build_prompt(
    *,
    title: str,
    description: str,
    category: str,
    target_audience: str | None,
    count: int,
) -> str:
    audience_line = f"Target audience: {target_audience}\n" if target_audience else ""
    return (
        "You are a market research analyst. List real software products that compete in the same market.\n"
        "Rules:\n"
        "- Return only real, currently available products (no generic categories).\n"
        "- Prefer products likely to have G2 or Capterra review pages.\n"
        "- Do not include the user's own product idea.\n"
        "- Include a short one-line description for each competitor.\n\n"
        f"Product idea title: {title}\n"
        f"Description: {description}\n"
        f"Category: {category}\n"
        f"{audience_line}"
        f"Return exactly {count} competitors."
    )


def suggest_competitors_with_llm(
    *,
    title: str,
    description: str,
    category: str,
    target_audience: str | None,
    research_depth: str,
) -> list[CompetitorSuggestion]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    count = DEPTH_SUGGESTION_COUNTS.get(research_depth, 12)
    client = OpenAI(api_key=settings.openai_api_key)

    completion = client.beta.chat.completions.parse(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": "Return structured competitor suggestions for market research.",
            },
            {
                "role": "user",
                "content": _build_prompt(
                    title=title,
                    description=description,
                    category=category,
                    target_audience=target_audience,
                    count=count,
                ),
            },
        ],
        response_format=CompetitorSuggestionList,
        temperature=0.2,
    )

    parsed = completion.choices[0].message.parsed
    if not parsed or not parsed.competitors:
        raise RuntimeError("LLM returned no competitor suggestions")

    return parsed.competitors
