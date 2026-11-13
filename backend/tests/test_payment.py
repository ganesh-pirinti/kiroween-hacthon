"""Tests for Ghost Protocol Payment Engine.

Includes standard unit tests and adversarial edge-case verification
bound to formal requirement specifications.
"""

from decimal import Decimal
import pytest

from backend.app.payment import (
    PaymentService,
    InsufficientFundsError,
    InvalidAmountError,
    SelfTransferError,
)


@pytest.fixture
def payment_service() -> PaymentService:
    """Fixture providing a fresh PaymentService instance."""
    return PaymentService()


class TestPaymentBasics:
    """Tests for basic account and amount constraints."""

    @pytest.mark.requirement("PAYMENT-001")
    def test_account_initialization_non_negative(self, payment_service: PaymentService) -> None:
        """PAYMENT-001: Initial balance must be non-negative."""
        # Valid non-negative balances
        acc1 = payment_service.create_account("ACC-001", "Alice", 1000)
        assert acc1.balance == Decimal("1000")

        acc2 = payment_service.create_account("ACC-002", "Zero", 0)
        assert acc2.balance == Decimal("0")

        # Negative initial balance must raise InvalidAmountError
        with pytest.raises(InvalidAmountError):
            payment_service.create_account("ACC-NEG", "Bob", -100)

    @pytest.mark.requirement("PAYMENT-002")
    def test_negative_or_zero_amount_rejected(self, payment_service: PaymentService) -> None:
        """PAYMENT-002: Transfer amount must be strictly positive."""
        s = payment_service.create_account("SENDER", "Sender", 10000)
        r = payment_service.create_account("RECIPIENT", "Recipient", 0)

        # Zero amount rejected
        with pytest.raises(InvalidAmountError):
            payment_service.transfer("SENDER", "RECIPIENT", 0)
        assert s.balance == Decimal("10000")
        assert r.balance == Decimal("0")

        # Negative amount rejected
        with pytest.raises(InvalidAmountError):
            payment_service.transfer("SENDER", "RECIPIENT", -500)
        assert s.balance == Decimal("10000")
        assert r.balance == Decimal("0")


class TestPaymentTransfers:
    """Tests for normal transfers and authorization constraints."""

    @pytest.mark.requirement("PAYMENT-003")
    def test_valid_transfer_updates_balances(self, payment_service: PaymentService) -> None:
        """PAYMENT-003: Transfer amount <= sender balance must update both balances."""
        payment_service.create_account("ACC-S", "Sender", 10000)
        payment_service.create_account("ACC-R", "Recipient", 5000)

        result = payment_service.transfer("ACC-S", "ACC-R", 2000)

        assert result.status == "SUCCESS"
        assert result.amount == Decimal("2000")
        assert payment_service.get_account("ACC-S").balance == Decimal("8000")
        assert payment_service.get_account("ACC-R").balance == Decimal("7000")

    @pytest.mark.requirement("PAYMENT-005")
    def test_self_transfer_rejected(self, payment_service: PaymentService) -> None:
        """PAYMENT-005: Account cannot transfer money to itself."""
        payment_service.create_account("ACC-SAME", "Self", 10000)

        with pytest.raises(SelfTransferError):
            payment_service.transfer("ACC-SAME", "ACC-SAME", 1000)

        assert payment_service.get_account("ACC-SAME").balance == Decimal("10000")


class TestPaymentAdversarial:
    """Adversarial verification suite for safety requirements."""

    @pytest.mark.requirement("PAYMENT-004")
    def test_overdraft_transfer_rejected_and_balances_unchanged(
        self, payment_service: PaymentService
    ) -> None:
        """Requirement ID: PAYMENT-004.
        
        Specification:
        'When a transfer amount exceeds the sender's available balance,
        the transfer must be rejected and neither account balance may change.'
        
        Scenario:
        Initial sender balance: ₹10,000
        Initial recipient balance: ₹0
        Transfer attempt: ₹15,000
        Expected result: Rejected with InsufficientFundsError; both balances unchanged.
        """
        sender = payment_service.create_account("ACC-SENDER-004", "Alice", 10000)
        recipient = payment_service.create_account("ACC-RECIPIENT-004", "Bob", 0)

        # Attempt to transfer ₹15,000 from ₹10,000 balance
        with pytest.raises(InsufficientFundsError, match=r".*"):
            payment_service.transfer("ACC-SENDER-004", "ACC-RECIPIENT-004", 15000)

        # Verification of state immutability
        assert sender.balance == Decimal("10000"), (
            f"Sender balance was mutated to {sender.balance}! Expected strictly 10000"
        )
        assert recipient.balance == Decimal("0"), (
            f"Recipient balance was mutated to {recipient.balance}! Expected strictly 0"
        )

    @pytest.mark.requirement("PAYMENT-004")
    def test_boundary_overdraft_rejected(self, payment_service: PaymentService) -> None:
        """Boundary check for PAYMENT-004: ₹10,000 balance vs ₹10,000.01 transfer."""
        sender = payment_service.create_account("ACC-BOUND-S", "Alice", 10000)
        recipient = payment_service.create_account("ACC-BOUND-R", "Bob", 0)

        with pytest.raises(InsufficientFundsError):
            payment_service.transfer("ACC-BOUND-S", "ACC-BOUND-R", Decimal("10000.01"))

        assert sender.balance == Decimal("10000")
        assert recipient.balance == Decimal("0")
