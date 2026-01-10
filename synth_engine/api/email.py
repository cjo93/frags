"""Email service using Resend.

https://resend.com/docs/api-reference/emails/send-email
"""
from __future__ import annotations

import logging
import httpx

from synth_engine.config import settings

logger = logging.getLogger(__name__)


def is_email_enabled() -> bool:
    """Check if email sending is configured."""
    return bool(settings.resend_api_key)


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send an email via Resend.
    
    Returns True on success, False on failure.
    """
    if not is_email_enabled():
        logger.warning("Email not configured, skipping send to %s", to)
        return False
    
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text or html,
            },
            timeout=10.0,
        )
        
        if response.status_code in (200, 201):
            data = response.json()
            logger.info("Email sent to %s, id=%s", to, data.get("id"))
            return True
        else:
            logger.error("Failed to send email to %s: %s %s", to, response.status_code, response.text)
            return False
            
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        return False


def send_password_reset_email(to: str, code: str) -> bool:
    """Send password reset email with 6-digit code."""
    subject = "Your Defrag password reset code"
    
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
        You requested a password reset. Enter this code to reset your password:
    </p>
    
    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 32px; letter-spacing: 0.3em; font-weight: 600; color: #000;">
            {code}
        </span>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
        This code expires in 15 minutes.
    </p>
    
    <p style="font-size: 14px; color: #666;">
        If you didn't request this, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
        Defrag &mdash; Your personal insight engine
    </p>
</body>
</html>
"""
    
    text = f"""DEFRAG

You requested a password reset. Enter this code to reset your password:

{code}

This code expires in 15 minutes.

If you didn't request this, you can safely ignore this email.
"""
    
    return send_email(to, subject, html, text)
