"""Stripe billing endpoints."""
from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from synth_engine.api.deps import db, get_current_user, require_role
from synth_engine.config import settings
from synth_engine.storage import repo as R

router = APIRouter(prefix="/billing", tags=["billing"])


def _billing_enabled() -> bool:
    """Check if billing is configured."""
    return bool(settings.stripe_secret_key)


def _webhook_configured() -> bool:
    """Check if webhook secret is configured."""
    return bool(settings.stripe_webhook_secret)


def _prices_configured() -> dict[str, bool]:
    """Check which price tiers are configured."""
    return {
        "basic": bool(settings.stripe_price_basic),
        "pro": bool(settings.stripe_price_pro),
        "family": bool(settings.stripe_price_family),
    }


def _stripe_init():
    if not _billing_enabled():
        raise HTTPException(503, "Billing not configured")
    stripe.api_key = settings.stripe_secret_key


@router.post("/checkout")
def create_checkout(
    price_tier: str,
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    """Create a Stripe Checkout session for a subscription."""
    _stripe_init()

    price_map = {
        "basic": settings.stripe_price_basic,
        "pro": settings.stripe_price_pro,
        "family": settings.stripe_price_family,
    }
    price_id = price_map.get(price_tier)
    if not price_id:
        raise HTTPException(400, f"Tier not configured: {price_tier}")

    # Get or create Stripe customer
    existing_customer_id = R.get_stripe_customer_id(s, user.id)
    if existing_customer_id:
        customer_id = existing_customer_id
    else:
        # Create new Stripe customer
        customer = stripe.Customer.create(email=user.email, metadata={"user_id": user.id})
        R.ensure_stripe_customer(s, user_id=user.id, email=user.email, stripe_customer_id=customer.id)
        customer_id = customer.id

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.app_base_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_base_url}/billing/cancel",
    )
    return {"url": session.url}


@router.post("/portal")
def create_portal(
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    """Create a Stripe billing portal session."""
    _stripe_init()

    customer_id = R.get_stripe_customer_id(s, user.id)
    if not customer_id:
        raise HTTPException(400, "No billing account found. Please subscribe first.")

    portal = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.app_base_url}/account",
    )
    return {"url": portal.url}


@router.post("/webhook")
async def stripe_webhook(req: Request, s: Session = Depends(db)):
    """Handle Stripe webhook events."""
    _stripe_init()

    if not _webhook_configured():
        raise HTTPException(503, "Webhook not configured")

    payload = await req.body()
    sig = req.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {e}")

    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})

    # Handle subscription events
    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        customer_id = data_object.get("customer")
        if customer_id:
            R.upsert_subscription_from_stripe(s, customer_id=customer_id, sub_obj=data_object)

    # Handle checkout completion (link customer if needed)
    elif event_type == "checkout.session.completed":
        customer_id = data_object.get("customer")
        subscription_id = data_object.get("subscription")
        if customer_id and subscription_id:
            # Fetch full subscription details
            sub = stripe.Subscription.retrieve(subscription_id)
            R.upsert_subscription_from_stripe(s, customer_id=customer_id, sub_obj=dict(sub))

    return {"received": True}


@router.get("/status")
def billing_status(
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    """Get current billing status for the authenticated user."""
    return R.get_billing_status(s, user.id)


@router.get("/usage")
def usage_summary(
    days: int = 30,
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    """Get usage summary for the authenticated user."""
    plan = R.plan_for_user(s, user.id)
    usage = R.get_usage_summary(s, user.id, days=days)
    return {"plan": plan, "usage": usage}


@router.get("/debug")
def billing_debug(
    user=Depends(require_role("admin")),
    s: Session = Depends(db),
):
    """
    Admin-only debug endpoint to inspect billing configuration.
    Does not expose secrets.
    """
    prices = _prices_configured()
    sub = R.get_active_subscription(s, user.id)

    return {
        "billing_enabled": _billing_enabled(),
        "prices_present": prices,
        "all_prices_configured": all(prices.values()),
        "webhook_configured": _webhook_configured(),
        "current_user_plan": R.plan_for_user(s, user.id),
        "active_subscription_status": sub.status if sub else None,
        "price_id": sub.price_id if sub else None,
    }
