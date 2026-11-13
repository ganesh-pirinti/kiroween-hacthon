"""Adversarial test target exposing the vulnerable payment implementation.

Requirement ID: PAYMENT-004 (Vulnerability Demonstration Target).

Scenario:
Initial sender balance: ₹10,000
Initial recipient balance: ₹0
Transfer attempt: ₹15,000
Expected by specification: Rejected with InsufficientFundsError; both balances unchanged.

Against VulnerablePaymentService:
The transfer is NOT rejected, InsufficientFundsError is NOT raised,
and balances are improperly mutated (sender: -₹5,000, recipient: ₹15,000).
This test MUST fail with exit code 1 to prove that the flaw is captured.
"""

from decimal import Decimal
import pytest

from backend.app.payment import InsufficientFundsError
from backend.tests.fixtures.vulnerable_payment import VulnerablePaymentService


@pytest.mark.requirement("PAYMENT-004-VULNERABLE")
def test_adversarial_overdraft_on_vulnerable_service(
    vulnerable_payment_service: VulnerablePaymentService,
) -> None:
    """Demonstrates defect: VulnerablePaymentService permits unauthorized overdraft."""
    sender = vulnerable_payment_service.create_account("ACC-VULN-SENDER", "Alice", 10000)
    recipient = vulnerable_payment_service.create_account("ACC-VULN-RECIP", "Bob", 0)

    # Specification dictates that ₹15,000 transfer from ₹10,000 balance must raise InsufficientFundsError.
    # The vulnerable fixture fails to raise this, causing pytest to fail with:
    # "Failed: DID NOT RAISE InsufficientFundsError"
    with pytest.raises(InsufficientFundsError, match=r".*"):
        vulnerable_payment_service.transfer("ACC-VULN-SENDER", "ACC-VULN-RECIP", 15000)

    # Invariant: Neither account balance may change
    assert sender.balance == Decimal("10000"), (
        f"Sender balance was mutated to {sender.balance}! Expected strictly 10000"
    )
    assert recipient.balance == Decimal("0"), (
        f"Recipient balance was mutated to {recipient.balance}! Expected strictly 0"
    )
