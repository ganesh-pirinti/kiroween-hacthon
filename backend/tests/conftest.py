"""Pytest shared fixtures for Ghost Protocol."""

import pytest

from backend.app.payment import PaymentService
from backend.tests.fixtures.vulnerable_payment import VulnerablePaymentService


@pytest.fixture
def payment_service() -> PaymentService:
    """Fixture providing a fresh instance of the corrected PaymentService."""
    return PaymentService()


@pytest.fixture
def vulnerable_payment_service() -> VulnerablePaymentService:
    """Fixture providing a fresh instance of the intentionally vulnerable PaymentService."""
    return VulnerablePaymentService()
