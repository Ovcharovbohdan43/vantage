from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.library_article_generation import _build_content_payload
from app.services.llm_library_article import ensure_mvp_blueprint_coverage
from app.services.llm_schemas import (
    LibraryArticleDraft,
    LibraryMvpBlueprint,
    LibraryMvpFeature,
    LibraryOpportunity,
    LibraryPainPoint,
    LibraryPainQuote,
    LibraryRiskItem,
    LibrarySeoMeta,
)


class _Dumpable:
    def __init__(self, payload):
        self.payload = payload
        self.cluster_id = payload.get("cluster_id")

    def model_dump(self):
        return dict(self.payload)


def test_public_content_uses_report_snapshots_for_numeric_analytics():
    draft = SimpleNamespace(
        competition_level="high",
        market_saturation_explanation="A concentrated market with repeated switching complaints.",
        pain_points=[
            _Dumpable(
                {
                    "cluster_id": "cluster-1",
                    "title": "Slow reconciliation",
                    "frequency": 4,
                    "severity_score": 5.0,
                    "explanation": "Customers repeatedly report delayed reconciliation.",
                    "why_critical": "Delays block daily finance workflows.",
                    "quotes": [],
                    "supporting_review_ids": ["review-1"],
                }
            )
        ],
        market_opportunities=[_Dumpable({"title": "Faster close", "body": "Reduce close time."})],
        risk_analysis=[
            _Dumpable(
                {
                    "risk": "Competition",
                    "level": "high",
                    "explanation": "Established products have distribution.",
                }
            )
        ],
        final_takeaway="The evidence shows a recurring workflow gap.",
        mvp_blueprint=_Dumpable(
            {
                "concept_name": "CloseFlow",
                "product_concept": "A focused reconciliation workflow built around unresolved close delays.",
                "target_user": "Finance teams that lose time to delayed reconciliation in incumbent tools.",
                "value_proposition": "Complete reconciliation faster with clear exceptions and reliable status.",
                "core_workflow": ["Import records", "Resolve exceptions", "Confirm the close"],
                "features": [
                    {
                        "name": "Fast reconciliation",
                        "problem_solved": "Incumbents repeatedly delay the daily reconciliation workflow.",
                        "solution": "Match records continuously and present only exceptions requiring review.",
                        "evidence_cluster_ids": ["cluster-1"],
                    }
                ],
                "in_scope": ["Fast reconciliation"],
                "out_of_scope": ["General ledger replacement"],
                "success_metric": "A finance user completes daily reconciliation in under ten minutes.",
            }
        ),
    )
    report = SimpleNamespace(
        market_saturation="HIGH",
        market_score=72.4,
        risk_score=61.2,
        data_confidence="high",
        recommendations={
            "opportunity_size": {
                "negative_signals": 31,
                "underserved_problems": 2,
            }
        },
        pain_clusters_snapshot=[
            {
                "id": "cluster-1",
                "frequency": 24,
                "mention_count": 24,
                "share_pct": 38.7,
                "severity_score": 8.4,
                "emotional_intensity": 7.6,
                "commercial_opportunity": 8.8,
                "trend": "growing",
                "year_counts": [{"year": 2025, "count": 9}, {"year": 2026, "count": 15}],
                "top_terms": [{"term": "delay", "count": 12}],
                "solution_direction": "Private founder-specific recommendation",
            }
        ],
        competitors_snapshot=[
            {
                "id": "competitor-1",
                "name": "Ledger App",
                "url": "https://private.example",
                "source": "g2",
                "rating": 4.1,
                "reviews_count": 320,
            }
        ],
    )

    content = _build_content_payload(
        draft,
        report,
        ["g2"],
        products_analyzed=1,
        reviews_analyzed=64,
        analyzed_at=datetime(2026, 7, 15, tzinfo=UTC),
    )

    pain = content["pain_points"][0]
    assert pain["frequency"] == 24
    assert pain["mention_count"] == 24
    assert pain["severity_score"] == 8.4
    assert pain["commercial_opportunity"] == 8.8
    assert pain["year_counts"][-1] == {"year": 2026, "count": 15}
    assert "solution_direction" not in pain

    assert content["scores"] == {
        "market_score": 72.4,
        "risk_score": 61.2,
        "data_confidence": "high",
        "confidence_pct": 83,
    }
    assert content["stats"]["negative_signals"] == 31
    assert content["competitors"][0]["name"] == "Ledger App"
    assert "url" not in content["competitors"][0]
    assert content["mvp_blueprint"]["concept_name"] == "CloseFlow"
    assert content["mvp_blueprint"]["features"][0]["evidence_cluster_ids"] == ["cluster-1"]
    assert content["generation"]["numeric_source"] == "report_snapshot"
    assert content["generation"]["version"] == "public-report-v3"


def test_mvp_blueprint_covers_legacy_pain_points_without_report_snapshot():
    quote = LibraryPainQuote(text="The workflow fails every night.", rating=1, source="g2", product="Tool")
    pains = [
        LibraryPainPoint(
            cluster_id=f"cluster-{index}",
            title=f"Workflow problem {index}",
            frequency=5,
            severity_score=7,
            explanation=f"Customers repeatedly report unresolved workflow problem number {index}.",
            why_critical="It blocks completion of the customer's core daily workflow.",
            quotes=[quote, quote, quote],
            supporting_review_ids=[f"review-{index}"],
        )
        for index in (1, 2)
    ]
    draft = LibraryArticleDraft(
        title="Is It Worth Building Workflow Software in 2026?",
        executive_summary="This public analysis documents recurring workflow failures across competing products and explains the resulting market gap.",
        market_saturation_explanation="The segment contains established competitors but recurring complaints remain unresolved.",
        competition_level="medium",
        pain_points=pains,
        market_opportunities=[LibraryOpportunity(title="Reliable workflow", body="Remove recurring failures in the core daily workflow.")],
        risk_analysis=[
            LibraryRiskItem(risk=name, level="medium", explanation="This risk requires focused validation before expansion.")
            for name in ("Competition", "Switching cost", "Differentiation", "Pricing")
        ],
        final_takeaway="The evidence supports a focused workflow product rather than a broad feature platform.",
        mvp_blueprint=LibraryMvpBlueprint(
            concept_name="Workflow Clarity",
            product_concept="A focused product that removes recurring failures from a core customer workflow.",
            target_user="Teams that currently lose time to unreliable incumbent workflow software.",
            value_proposition="Complete the core workflow reliably with fewer steps and clearer recovery.",
            core_workflow=["Connect the source", "Run the workflow", "Review the result"],
            features=[
                LibraryMvpFeature(
                    name="Reliable execution",
                    problem_solved="Customers report that the first workflow problem remains unresolved.",
                    solution="Run the workflow with reliable defaults and actionable failure recovery.",
                    evidence_cluster_ids=["cluster-1"],
                )
            ],
            in_scope=["Reliable execution"],
            out_of_scope=["Unrelated enterprise administration"],
            success_metric="A new user completes the workflow without assistance on the first attempt.",
        ),
        seo=LibrarySeoMeta(
            title="Is Workflow Software Worth Building in 2026?",
            description="Analysis of 50 negative reviews across five workflow products and their most common reliability complaint.",
            slug="is-workflow-software-worth-building-2026",
        ),
    )

    covered = ensure_mvp_blueprint_coverage(
        draft,
        SimpleNamespace(pain_clusters_snapshot=[]),
    )

    evidence_ids = {
        cluster_id
        for feature in covered.mvp_blueprint.features
        for cluster_id in feature.evidence_cluster_ids
    }
    assert evidence_ids == {"cluster-1", "cluster-2"}
    assert len(covered.mvp_blueprint.features) == 2
