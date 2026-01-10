"""Stripe billing endpoints."""
from __future__ import annotations

import logging
from collections import OrderedDict
from threading import Lock

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from synth_engine.api.deps import db, get_current_user, require_role, is_dev_admin_user
from synth_engine.api.email import send_email, is_email_enabled
from synth_engine.config import settings
from synth_engine.storage import repo as R
from synth_engine.storage.models import StripeWebhookEvent

router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)


# -------------------------
# Webhook Idempotency (DB-backed for production)
# -------------------------
def _try_record_event(s: Session, event_id: str, event_type: str) -> bool:
    """
    Try to record a webhook event in the database.
    Returns True if this is a new event (should be processed).
    Returns False if already processed (dedupe).
    """
    try:
        evt = StripeWebhookEvent(event_id=event_id, event_type=event_type)
        s.add(evt)
        s.flush()  # Attempt insert, will raise IntegrityError if PK exists
        return True
    except IntegrityError:
        s.rollback()
        return False


# In-memory fallback cache (for backward compat and extra safety)
_processed_events: OrderedDict[str, bool] = OrderedDict()
_processed_events_lock = Lock()
_MAX_CACHED_EVENTS = 1000


def _is_event_in_memory(event_id: str) -> bool:
    """Check if a webhook event is in memory cache."""
    with _processed_events_lock:
        return event_id in _processed_events


def _mark_event_in_memory(event_id: str) -> None:
    """Mark a webhook event as processed in memory cache."""
    with _processed_events_lock:
        if event_id in _processed_events:
            _processed_events.move_to_end(event_id)
        else:
            _processed_events[event_id] = True
            if len(_processed_events) > _MAX_CACHED_EVENTS:
                _processed_events.popitem(last=False)


def _billing_enabled() -> bool:
    """Check if billing is configured."""
    return bool(settings.stripe_secret_key)


def _webhook_configured() -> bool:
    """Check if webhook secret is configured."""
    return bool(settings.stripe_webhook_secret)


def _is_test_mode() -> bool:
    """Check if Stripe is in test mode based on key prefix."""
    key = settings.stripe_secret_key or ""
    return key.startswith("sk_test_") or key.startswith("rk_test_")


def _check_stripe_mode():
    """Warn if using test keys in production-like environment."""
    if _billing_enabled() and _is_test_mode():
        if settings.app_base_url and "localhost" not in settings.app_base_url:
            logger.warning(
                "Stripe test keys are configured in a non-localhost environment. "
                "Ensure this is intentional (staging) or switch to live keys for production."
            )


def _prices_configured() -> dict[str, bool]:
    """Check which price tiers are configured."""
    return {
        "insight": bool(settings.stripe_price_basic),  # Basic price → Insight tier
        "integration": bool(settings.stripe_price_pro),  # Pro price → Integration tier
        "constellation": bool(settings.stripe_price_family),  # Family price → Constellation tier
    }


def _get_plan_name_from_subscription(sub) -> str:
    """Extract plan name from Stripe subscription object."""
    price_id = None
    if sub.get("items") and sub["items"].get("data"):
        price_id = sub["items"]["data"][0].get("price", {}).get("id")
    
    # Map price ID to plan name
    if price_id == settings.stripe_price_basic:
        return "Insight"
    elif price_id == settings.stripe_price_pro:
        return "Integration"
    elif price_id == settings.stripe_price_family:
        return "Constellation"
    return "Premium"


def _send_receipt_email(to: str, plan_name: str, amount: str) -> bool:
    """Send a payment receipt email."""
    subject = f"Your Defrag {plan_name} subscription is active"
    
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 14px; font-weight: 500; letter-spacing: 0.15em; margin: 0;">DEFRAG</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
        Thank you for subscribing to Defrag!
    </p>
    
    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Plan</p>
        <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">{plan_name}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Amount charged</p>
        <p style="margin: 0; font-size: 18px; font-weight: 600;">{amount}/month</p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
        Your subscription is now active. You have full access to all {plan_name} features.
    </p>
    
    <a href="{settings.app_base_url}/dashboard" style="display: block; text-align: center; background: #000; color: #fff; padding: 14px 24px; border-radius: 9999px; text-decoration: none; font-weight: 500; margin-bottom: 24px;">
        Go to Dashboard
    </a>
    
    <p style="font-size: 14px; color: #666;">
        Manage your subscription anytime from your <a href="{settings.app_base_url}/settings" style="color: #000;">account settings</a>.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
        Defrag &mdash; Your personal insight engine
    </p>
</body>
</html>
"""
    
    text = f"""DEFRAG

Thank you for subscribing to Defrag!

Plan: {plan_name}
Amount charged: {amount}/month

Your subscription is now active. You have full access to all {plan_name} features.

Go to Dashboard: {settings.app_base_url}/dashboard

Manage your subscription anytime from your account settings: {settings.app_base_url}/settings
"""
    
    return send_email(to, subject, html, text)


def _stripe_init():
    if not _billing_enabled():
        raise HTTPException(503, "Billing not configured")
    stripe.api_key = settings.stripe_secret_key
    _check_stripe_mode()  # Log warning if test keys in production


@router.post("/checkout")
def create_checkout(
    price_tier: str,
    user=Depends(get_current_user),
    s: Session = Depends(db),
):
    """Create a Stripe Checkout session for a subscription.
    
    Accepts tier names: insight, integration, constellation
    Also accepts legacy names: basic, pro, family (for backwards compatibility)
    """
    # Block DEV_ADMIN from billing operations
    if is_dev_admin_user(user):
        raise HTTPException(403, "Billing operations not available for DEV_ADMIN")
    
    _stripe_init()

    # Map tier name to price_id (support both new and legacy tier names)
    price_map = {
        # New tier names (semantic)
        "insight": settings.stripe_price_basic,
        "integration": settings.stripe_price_pro,
        "constellation": settings.stripe_price_family,
        # Legacy tier names (backwards compat)
        "basic": settings.stripe_price_basic,
        "pro": settings.stripe_price_pro,
        "family": settings.stripe_price_family,
    }
    price_id = price_map.get(price_tier)
    if not price_id:
        raise HTTPException(
            400,
            f"Unknown tier: {price_tier}. Use: insight, integration, or constellation",
        )

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
    # Block DEV_ADMIN from billing operations
    if is_dev_admin_user(user):
        raise HTTPException(403, "Billing operations not available for DEV_ADMIN")
    
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
    """Handle Stripe webhook events with DB-backed idempotency."""
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

    event_id = event.get("id", "")
    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})

    # DB-backed idempotency check: try to insert event
    if event_id:
        # Quick in-memory check first (optimization)
        if _is_event_in_memory(event_id):
            logger.info(f"Skipping webhook {event_id} (in-memory cache hit), deduped=true")
            return {"received": True, "status": "already_processed"}
        
        # Try DB insert - if fails, event was already processed
        is_new = _try_record_event(s, event_id, event_type)
        if not is_new:
            logger.info(f"Skipping webhook {event_id} type={event_type}, deduped=true")
            return {"received": True, "status": "already_processed"}
        
        logger.info(f"Processing webhook {event_id} type={event_type}, deduped=false")

    # Handle subscription events
    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        customer_id = data_object.get("customer")
        if customer_id:
            R.upsert_subscription_from_stripe(s, customer_id=customer_id, sub_obj=data_object)
            logger.info(f"Processed {event_type} for customer {customer_id}")

    # Handle checkout completion (link customer if needed)
    elif event_type == "checkout.session.completed":
        customer_id = data_object.get("customer")
        subscription_id = data_object.get("subscription")
        customer_email = data_object.get("customer_email") or data_object.get("customer_details", {}).get("email")
        amount_total = data_object.get("amount_total", 0)  # in cents
        
        if customer_id and subscription_id:
            # Fetch full subscription details
            sub = stripe.Subscription.retrieve(subscription_id)
            R.upsert_subscription_from_stripe(s, customer_id=customer_id, sub_obj=dict(sub))
            logger.info(f"Processed checkout.session.completed for customer {customer_id}")
            
            # Send receipt email
            if customer_email and is_email_enabled():
                plan_name = _get_plan_name_from_subscription(sub)
                amount_display = f"${amount_total / 100:.2f}" if amount_total else "$0.00"
                _send_receipt_email(customer_email, plan_name, amount_display)
                logger.info(f"Sent receipt email to {customer_email}")

    # Mark in memory cache after successful processing
    if event_id:
        _mark_event_in_memory(event_id)

    # Commit the transaction (includes the webhook event record)
    s.commit()

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
    plan_key = R.plan_for_user(s, user.id)
    plan_name = R.PLAN_NAMES.get(plan_key, "Free")
    usage = R.get_usage_summary(s, user.id, days=days)
    return {
        "plan_key": plan_key,
        "plan_name": plan_name,
        "usage": usage,
    }


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
    plan_key = R.plan_for_user(s, user.id)

    return {
        "billing_enabled": _billing_enabled(),
        "test_mode": _is_test_mode(),
        "prices_present": prices,
        "all_prices_configured": all(prices.values()),
        "webhook_configured": _webhook_configured(),
        "current_user_plan_key": plan_key,
        "current_user_plan_name": R.PLAN_NAMES.get(plan_key, "Free"),
        "active_subscription_status": sub.status if sub else None,
        "price_id": sub.price_id if sub else None,
    }
