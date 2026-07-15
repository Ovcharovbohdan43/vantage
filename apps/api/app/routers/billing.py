from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import stripe

from app.config import settings
from app.db.models import IdeaOfWeekSelection, LibraryArticle, Project, Report
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.billing import (
    PACK_CATALOG,
    CheckoutOut,
    CheckoutRequest,
    CreditsOut,
    FulfillOut,
    FulfillRequest,
    PackInfo,
    PromoRedeemOut,
    PromoRedeemRequest,
    ShareDraftCheckoutOut,
    ShareDraftCheckoutRequest,
    ShareDraftFulfillOut,
    ShareDraftFulfillRequest,
)
from app.services.billing_fulfillment import fulfill_checkout_session
from app.services.credits import CreditError, get_user_credits
from app.services.promo_codes import redeem_promo_code
from app.services.share_draft_billing import (
    ShareDraftBillingError,
    create_share_draft_checkout,
    fulfill_share_draft_checkout,
)
from app.services.stripe_billing import (
    apply_checkout_completed,
    create_checkout_session,
    stripe_configured_for_pack,
)

router = APIRouter(prefix="/billing", tags=["billing"])


async def _validate_share_draft_source(
    db: AsyncSession,
    *,
    user_id,
    source_kind: str,
    source_ref: str,
) -> str:
    if source_kind == "report":
        try:
            from uuid import UUID

            project_id = UUID(source_ref)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc
        exists = (
            await db.execute(
                select(Project.id)
                .join(Report, Report.project_id == Project.id)
                .where(Project.id == project_id, Project.user_id == user_id)
            )
        ).scalar_one_or_none()
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return f"/research/{project_id}/report"

    if source_kind == "library":
        exists = (
            await db.execute(
                select(LibraryArticle.slug).where(
                    LibraryArticle.slug == source_ref,
                    LibraryArticle.status == "published",
                )
            )
        ).scalar_one_or_none()
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        return f"/library/{source_ref}"

    exists = (
        await db.execute(
            select(IdeaOfWeekSelection.week_slug).where(
                IdeaOfWeekSelection.week_slug == source_ref,
                IdeaOfWeekSelection.status == "published",
            )
        )
    ).scalar_one_or_none()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weekly idea not found")
    return f"/idea-of-the-week/{source_ref}"


@router.get("/credits", response_model=CreditsOut)
async def billing_credits(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    credits = await get_user_credits(db, user.id, user.email)
    return CreditsOut(
        free_preview_available=credits.free_preview_available,
        starter_credits=credits.starter_credits,
        founder_credits=credits.founder_credits,
        indie_credits=credits.indie_credits,
        total_credits=credits.total_credits,
        depth_credit_costs=credits.depth_credit_costs,
        can_run_preview=credits.can_run_preview,
        can_run_full=credits.can_run_full,
    )


@router.get("/usage", response_model=CreditsOut, include_in_schema=False)
async def billing_usage_legacy(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await billing_credits(user=user, db=db)


@router.get("/packs", response_model=list[PackInfo])
async def billing_packs():
    return PACK_CATALOG


@router.post("/checkout", response_model=CheckoutOut)
async def billing_checkout(
    payload: CheckoutRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not stripe_configured_for_pack(payload.pack):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Billing is not configured for {payload.pack}.",
        )

    try:
        session = await create_checkout_session(
            db, user_id=user.id, email=user.email, pack=payload.pack
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if not session.url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a checkout URL",
        )

    return CheckoutOut(checkout_url=session.url, session_id=session.id)


@router.post("/fulfill", response_model=FulfillOut)
async def billing_fulfill(
    payload: FulfillRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")

    try:
        session = stripe.checkout.Session.retrieve(payload.session_id, expand=["line_items"])
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc

    owner_id = session.client_reference_id or (session.metadata or {}).get("user_id")
    if not owner_id or str(user.id) != str(owner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Checkout session does not belong to you")

    result = await fulfill_checkout_session(db, session, source="success_page")
    await db.commit()
    return FulfillOut(
        fulfilled=result.fulfilled,
        already_fulfilled=result.already_fulfilled,
        pack=result.pack,
        credits_added=result.credits_added,
        total_credits=result.total_credits,
    )


@router.post("/share-drafts/checkout", response_model=ShareDraftCheckoutOut)
async def share_draft_checkout(
    payload: ShareDraftCheckoutRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return_path = await _validate_share_draft_source(
        db,
        user_id=user.id,
        source_kind=payload.source_kind,
        source_ref=payload.source_ref,
    )
    try:
        entitlement, checkout_url = await create_share_draft_checkout(
            db,
            user_id=user.id,
            email=user.email,
            source_kind=payload.source_kind,
            source_ref=payload.source_ref,
            return_path=return_path,
        )
        await db.commit()
    except stripe.StripeError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc
    except ShareDraftBillingError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    return ShareDraftCheckoutOut(
        entitlement_id=entitlement.id,
        checkout_url=checkout_url,
        payment_required=checkout_url is not None,
        amount_cents=entitlement.amount_cents,
        currency=entitlement.currency,
    )


@router.post("/share-drafts/fulfill", response_model=ShareDraftFulfillOut)
async def share_draft_fulfill(
    payload: ShareDraftFulfillRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")
    try:
        session = stripe.checkout.Session.retrieve(payload.session_id)
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc

    owner_id = session.client_reference_id or (session.metadata or {}).get("user_id")
    if not owner_id or str(user.id) != str(owner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Checkout session does not belong to you")

    try:
        entitlement = await fulfill_share_draft_checkout(db, session)
        if not entitlement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share purchase not found")
        await db.commit()
    except ShareDraftBillingError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    return ShareDraftFulfillOut(
        entitlement_id=entitlement.id,
        source_kind=entitlement.source_kind,
        source_ref=entitlement.source_ref,
        return_path=entitlement.return_path,
        ready=entitlement.payment_status in {"paid", "not_required"},
    )


@router.post("/promo/redeem", response_model=PromoRedeemOut)
async def billing_redeem_promo(
    payload: PromoRedeemRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await redeem_promo_code(
            db,
            user_id=user.id,
            email=user.email,
            code=payload.code,
        )
    except CreditError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    await db.commit()
    return PromoRedeemOut(
        code=result.code,
        credits_granted=result.credits_granted,
        total_credits=result.total_credits,
        already_redeemed=result.already_redeemed,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def billing_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.stripe_webhook_secret.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook not configured")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            settings.stripe_webhook_secret,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata") or {}
        if metadata.get("purchase_type") == "share_draft":
            await fulfill_share_draft_checkout(db, session)
        else:
            await apply_checkout_completed(db, session)

    await db.commit()
    return {"received": True}
