from __future__ import annotations

import logging
from datetime import UTC, datetime

from openai import OpenAI

from app.config import settings
from app.db.models import Competitor, PainCluster, Report
from app.services.library_categories import normalize_library_category
from app.services.llm_schemas import LibraryArticleDraft

logger = logging.getLogger(__name__)


def _cluster_block(clusters: list[PainCluster]) -> str:
    from app.services.llm_cluster_analysis import cluster_examples_list

    lines: list[str] = []
    for cluster in clusters[:12]:
        examples = cluster_examples_list(cluster.examples)
        quote_lines = []
        for ex in examples[:4]:
            text = (ex.get("text") or "")[:300]
            rating = ex.get("rating", "?")
            product = ex.get("competitor", "unknown")
            source = ex.get("source", "g2")
            quote_lines.append(f'    - [{rating}★] ({product}, {source}): "{text}"')
        quotes = "\n".join(quote_lines) if quote_lines else "    - (no quotes)"
        lines.append(
            f"- ID={cluster.id} | {cluster.title} (freq={cluster.frequency}, "
            f"severity={cluster.severity_score or 'n/a'})\n"
            f"  Description: {cluster.description or cluster.title}\n"
            f"  Quotes:\n{quotes}"
        )
    return "\n\n".join(lines) if lines else "No clusters."


def _competitor_block(competitors: list[Competitor]) -> str:
    return "\n".join(
        f"- {c.name} ({c.source}, rating={c.rating or 'n/a'}, reviews={c.reviews_count or 'n/a'})"
        for c in competitors[:20]
    ) or "No competitors."


def generate_library_article_with_llm(
    *,
    category: str,
    library_category: str,
    competitors: list[Competitor],
    clusters: list[PainCluster],
    report: Report,
    reviews_collected: int,
    sources: list[str],
) -> LibraryArticleDraft | None:
    if not settings.openai_api_key:
        return None

    source_text = ", ".join(s.upper() for s in sources) if sources else "G2"
    client = OpenAI(api_key=settings.openai_api_key)
    current_year = datetime.now(UTC).year

    prompt = (
        "You are writing a PUBLIC market research article for a Research Library.\n"
        "This article will be indexed by search engines and read by strangers.\n\n"
        "CRITICAL RULES:\n"
        "- Write ONLY about the market category and competitor products — never about a specific startup idea.\n"
        "- Do NOT mention any user's product, idea, company name, or personalized recommendations.\n"
        "- Infer the concrete job these products perform from their names and review pain points.\n"
        f"- Title must be a natural English search question ending in '{current_year}?'.\n"
        "- Name the specific product function in plain language; never use a broad taxonomy label when "
        "the evidence supports a narrower term.\n"
        f"- Preferred pattern: 'Is It Worth Building Invoice Software in {current_year}?'.\n"
        "- Avoid empty titles such as 'Customer Pain Analysis', 'Market Research', or 'Software Analysis'.\n"
        "- seo.title should preserve the same query intent and stay within 70 characters.\n"
        "- seo.description should include the review count, product count, product function, and the "
        "strongest evidence-backed pain theme.\n"
        "- Use ONLY the pain clusters and review quotes provided — do not invent pain points.\n"
        "- Each pain point needs at least 3 real quotes from the data (paraphrase minimally, keep authentic voice).\n"
        "- cluster_id must match the ID from pain cluster data.\n"
        "- supporting_review_ids: use review_id from quote data when available, else cluster ID.\n"
        "- risk_analysis must include: Competition, Customer Switching Cost, Differentiation, Pricing Pressure.\n"
        "- seo.slug: lowercase hyphenated, derived from title, no user-specific terms.\n\n"
        f"Market category: {category} (library taxonomy: {library_category})\n"
        f"Products analyzed: {len(competitors)}\n"
        f"Reviews analyzed: {reviews_collected}\n"
        f"Data sources: {source_text}\n"
        f"Ratings analyzed: 1-3 stars (negative reviews only)\n"
        f"Market saturation signal: {report.market_saturation}\n"
        f"Market score: {report.market_score}, Risk score: {report.risk_score}\n\n"
        f"Competitors:\n{_competitor_block(competitors)}\n\n"
        f"Pain clusters:\n{_cluster_block(clusters)}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": "Return structured public market research article. No user idea references.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format=LibraryArticleDraft,
            temperature=0.2,
        )
        return completion.choices[0].message.parsed
    except Exception:
        logger.exception("Library article LLM generation failed")
        return None


def build_fallback_library_article(
    *,
    library_category: str,
    competitors: list[Competitor],
    clusters: list[PainCluster],
    report: Report,
    reviews_collected: int,
    sources: list[str],
) -> LibraryArticleDraft:
    """Heuristic article when LLM is unavailable."""
    from app.services.llm_schemas import (
        LibraryOpportunity,
        LibraryPainPoint,
        LibraryPainQuote,
        LibraryRiskItem,
        LibrarySeoMeta,
    )
    from app.services.library_slug import slugify

    cat_label = library_category.lower()
    current_year = datetime.now(UTC).year
    title = f"Is It Worth Building {library_category} Software in {current_year}?"
    if library_category == "Other":
        title = f"Is It Worth Building This Type of B2B Software in {current_year}?"

    pain_points: list[LibraryPainPoint] = []
    for cluster in clusters[:8]:
        quotes: list[LibraryPainQuote] = []
        review_ids: list[str] = []
        from app.services.llm_cluster_analysis import cluster_examples_list

        for ex in cluster_examples_list(cluster.examples)[:4]:
            rid = str(ex.get("review_id") or cluster.id)
            review_ids.append(rid)
            quotes.append(
                LibraryPainQuote(
                    text=(ex.get("text") or cluster.title)[:500],
                    rating=int(ex.get("rating") or 2),
                    source=str(ex.get("source") or "g2"),
                    product=str(ex.get("competitor") or "Product"),
                )
            )
        if not quotes:
            continue
        while len(quotes) < 3:
            quotes.append(quotes[-1])
        pain_points.append(
            LibraryPainPoint(
                cluster_id=str(cluster.id),
                title=cluster.title,
                frequency=cluster.frequency,
                severity_score=float(cluster.severity_score or 5.0),
                explanation=cluster.description or cluster.title,
                why_critical=f"Repeated across {cluster.frequency} reviews in the {cat_label} market.",
                quotes=quotes[:6],
                supporting_review_ids=review_ids[:20] or [str(cluster.id)],
            )
        )

    if not pain_points and clusters:
        from app.services.llm_cluster_analysis import cluster_examples_list

        c = clusters[0]
        sample_examples = cluster_examples_list(c.examples)
        sample_text = (sample_examples[0].get("text") if sample_examples else c.title)[:500]
        sample_quote = LibraryPainQuote(
            text=sample_text,
            rating=2,
            source="g2",
            product=competitors[0].name if competitors else "Product",
        )
        pain_points.append(
            LibraryPainPoint(
                cluster_id=str(c.id),
                title=c.title,
                frequency=c.frequency,
                severity_score=float(c.severity_score or 5.0),
                explanation=c.description or c.title,
                why_critical="Most frequently mentioned issue in collected reviews.",
                quotes=[sample_quote, sample_quote, sample_quote],
                supporting_review_ids=[str(c.id)],
            )
        )

    slug = slugify(title)
    saturation = report.market_saturation
    return LibraryArticleDraft(
        title=title,
        executive_summary=(
            f"This analysis examines customer dissatisfaction in the {library_category} software market "
            f"based on {reviews_collected} negative reviews across {len(competitors)} products. "
            f"The market shows {saturation.lower()} saturation with recurring complaints about "
            f"{'complexity and onboarding' if pain_points else 'product fit'}."
        ),
        market_saturation_explanation=(
            f"Based on competitor density and review patterns, this {library_category} segment "
            f"shows {saturation.lower()} market saturation."
        ),
        competition_level="high" if saturation == "HIGH" else "medium" if saturation == "MEDIUM" else "low",
        pain_points=pain_points or [
            LibraryPainPoint(
                cluster_id="fallback",
                title="Implementation complexity",
                frequency=1,
                severity_score=6.0,
                explanation="Users report long setup times before realizing value.",
                why_critical="Blocks adoption and increases churn in this market.",
                quotes=[
                    LibraryPainQuote(
                        text="Implementation took weeks before we could even start.",
                        rating=2,
                        source=sources[0] if sources else "g2",
                        product=competitors[0].name if competitors else "Product",
                    ),
                    LibraryPainQuote(
                        text="Onboarding was confusing and poorly documented.",
                        rating=2,
                        source=sources[0] if sources else "g2",
                        product=competitors[0].name if competitors else "Product",
                    ),
                    LibraryPainQuote(
                        text="We spent more time configuring than using the product.",
                        rating=1,
                        source=sources[0] if sources else "g2",
                        product=competitors[0].name if competitors else "Product",
                    ),
                ],
                supporting_review_ids=["fallback"],
            )
        ],
        market_opportunities=[
            LibraryOpportunity(
                title="Simplicity wedge",
                body=(
                    "Most competitors focus on feature breadth while customers complain about complexity. "
                    "Lightweight, easy-to-adopt alternatives may capture underserved segments."
                ),
            )
        ],
        risk_analysis=[
            LibraryRiskItem(
                risk="Competition",
                level="high" if saturation == "HIGH" else "medium",
                explanation="Established players dominate review volume and brand awareness.",
            ),
            LibraryRiskItem(
                risk="Customer Switching Cost",
                level="medium",
                explanation="Teams embed workflows deeply, making migration painful.",
            ),
            LibraryRiskItem(
                risk="Differentiation",
                level="medium",
                explanation="Feature parity is high; positioning must be sharply defined.",
            ),
            LibraryRiskItem(
                risk="Pricing Pressure",
                level="medium",
                explanation="Buyers compare against incumbents with aggressive discounting.",
            ),
        ],
        final_takeaway=(
            f"The {library_category} market remains active but demanding. Winners address the pain points "
            f"documented here with clear positioning — not more features for their own sake."
        ),
        seo=LibrarySeoMeta(
            title=title[:70],
            description=(
                f"Analysis of {reviews_collected} negative {library_category} software reviews. "
                f"Top customer pain points, market saturation, and opportunities."
            )[:160],
            slug=slug,
        ),
    )
