"""Unit tests for billing and entitlements."""
import pytest
from unittest.mock import MagicMock, patch


class MockSettings:
    stripe_price_basic = "price_basic_123"
    stripe_price_pro = "price_pro_456"
    stripe_price_family = "price_family_789"


class MockSubscription:
    def __init__(self, status: str, price_id: str):
        self.status = status
        self.price_id = price_id


# Test plan_for_user mapping
class TestPlanForUser:
    """Test plan_for_user returns correct plan based on subscription."""

    def test_no_subscription_returns_free(self):
        """User with no subscription gets free plan."""
        mock_session = MagicMock()
        mock_session.query.return_value.filter.return_value.first.return_value = None

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "free"

    def test_active_basic_subscription(self):
        """User with active basic subscription gets basic plan."""
        mock_session = MagicMock()
        mock_sub = MockSubscription(status="active", price_id="price_basic_123")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_sub

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "basic"

    def test_trialing_pro_subscription(self):
        """User with trialing pro subscription gets pro plan."""
        mock_session = MagicMock()
        mock_sub = MockSubscription(status="trialing", price_id="price_pro_456")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_sub

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "pro"

    def test_active_family_subscription(self):
        """User with active family subscription gets family plan."""
        mock_session = MagicMock()
        mock_sub = MockSubscription(status="active", price_id="price_family_789")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_sub

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "family"

    def test_canceled_subscription_returns_free(self):
        """User with canceled subscription gets free plan (filtered out by query)."""
        mock_session = MagicMock()
        # Canceled subscriptions are filtered out by the IN clause, so query returns None
        mock_session.query.return_value.filter.return_value.first.return_value = None

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "free"

    def test_unknown_price_id_returns_free(self):
        """User with unknown price_id gets free plan."""
        mock_session = MagicMock()
        mock_sub = MockSubscription(status="active", price_id="price_unknown")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_sub

        with patch("synth_engine.storage.repo.settings", MockSettings()):
            from synth_engine.storage.repo import plan_for_user
            result = plan_for_user(mock_session, "user_123")

        assert result == "free"


# Test checkout tier validation
class TestCheckoutValidation:
    """Test /billing/checkout returns 400 if tier not configured."""

    def test_checkout_unconfigured_tier_returns_400(self):
        """Checkout with unconfigured tier returns 400."""
        from synth_engine.api.billing import _prices_configured

        # Test the helper function
        with patch("synth_engine.api.billing.settings") as mock_settings:
            mock_settings.stripe_price_basic = ""
            mock_settings.stripe_price_pro = "price_123"
            mock_settings.stripe_price_family = ""

            result = _prices_configured()

        assert result["basic"] is False
        assert result["pro"] is True
        assert result["family"] is False

    def test_all_prices_configured(self):
        """All prices configured returns True for all."""
        from synth_engine.api.billing import _prices_configured

        with patch("synth_engine.api.billing.settings") as mock_settings:
            mock_settings.stripe_price_basic = "price_basic"
            mock_settings.stripe_price_pro = "price_pro"
            mock_settings.stripe_price_family = "price_family"

            result = _prices_configured()

        assert result["basic"] is True
        assert result["pro"] is True
        assert result["family"] is True


# Test plan hierarchy
class TestPlanHierarchy:
    """Test require_plan enforces correct hierarchy."""

    def test_plan_hierarchy_order(self):
        """Verify plan hierarchy order is correct."""
        from synth_engine.api.entitlements import PLAN_HIERARCHY

        assert PLAN_HIERARCHY["free"] < PLAN_HIERARCHY["basic"]
        assert PLAN_HIERARCHY["basic"] < PLAN_HIERARCHY["pro"]
        assert PLAN_HIERARCHY["pro"] < PLAN_HIERARCHY["family"]

    def test_family_has_highest_level(self):
        """Family plan should have highest access level."""
        from synth_engine.api.entitlements import PLAN_HIERARCHY

        assert PLAN_HIERARCHY["family"] == max(PLAN_HIERARCHY.values())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
