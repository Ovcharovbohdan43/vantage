from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
import stripe

from app.config import settings
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
)
from app.services.billing_fulfillment import fulfill_checkout_session
from app.services.credits import CreditError, get_user_credits
from app.services.promo_codes import redeem_promo_code
from app.services.stripe_billing import (
    apply_checkout_completed,
    create_checkout_session,
    stripe_configured_for_pack,
)

router = APIRouter(prefix="/billing", tags=["billing"])


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
        await apply_checkout_completed(db, event["data"]["object"])

    await db.commit()
    return {"received": True}
