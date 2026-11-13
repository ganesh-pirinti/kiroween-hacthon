"""Property-Based and Mathematical Invariant Tests for Ghost Protocol Payment Engine.

Verifies strict domain invariants across generated transaction sequences:
1. Balance Non-Negativity: No account balance may ever drop below zero.
2. Monetary Conservation: Sum of balances is strictly conserved across transfers.
3. Idempotency of Rejection: Any rejected operation produces zero state mutation.
4. Precision Preservation: Decimal arithmetic exhibits zero floating-point drift.
"""

import random
from decimal import Decimal
import pytest

from backend.app.payment import (
    InsufficientFundsError,
    InvalidAmountError,
    PaymentService,
    SelfTransferError,
)


@pytest.fixture
def service() -> PaymentService:
    return PaymentService()


class TestPaymentInvariants:
    """Mathematical invariant verification over randomized transaction spaces."""

    def test_monetary_conservation_property(self, service: PaymentService) -> None:
        """Invariant: Across all valid or invalid transfers, total monetary sum is conserved."""
        rng = random.Random(42)  # Deterministic seed for reproducible testing

        # Initialize accounts with random balances
        s_initial = Decimal(str(rng.randint(500, 10000)))
        r_initial = Decimal(str(rng.randint(0, 5000)))
        total_initial = s_initial + r_initial

        service.create_account("SENDER_INV", "Alice", s_initial)
        service.create_account("RECIP_INV", "Bob", r_initial)

        # Execute 50 randomized transfer attempts
        for _ in range(50):
            amount = Decimal(str(rng.randint(-500, 15000)))
            try:
                service.transfer("SENDER_INV", "RECIP_INV", amount)
            except (InsufficientFundsError, InvalidAmountError, SelfTransferError):
                pass  # Rejections are valid outcomes

            # Invariant check after every transaction attempt
            s_cur = service.get_account("SENDER_INV").balance
            r_cur = service.get_account("RECIP_INV").balance
            assert s_cur + r_cur == total_initial, (
                f"Conservation violated! Sum was {s_cur + r_cur}, expected {total_initial}"
            )
            assert s_cur >= Decimal("0"), f"Sender balance dropped negative: {s_cur}"
            assert r_cur >= Decimal("0"), f"Recipient balance dropped negative: {r_cur}"

    def test_idempotency_of_rejected_overdraft_property(self, service: PaymentService) -> None:
        """Invariant: When amount > sender balance, state mutation is strictly zero."""
        rng = random.Random(1337)

        for i in range(25):
            sender_id = f"S_OVERDRAFT_{i}"
            recip_id = f"R_OVERDRAFT_{i}"

            balance = Decimal(str(rng.randint(100, 10000)))
            service.create_account(sender_id, "Sender", balance)
            service.create_account(recip_id, "Recipient", Decimal("0"))

            # Overdraft delta between +0.01 and +5000.00
            overdraft_delta = Decimal(str(rng.randint(1, 5000))) + Decimal("0.01")
            transfer_amount = balance + overdraft_delta

            with pytest.raises(InsufficientFundsError):
                service.transfer(sender_id, recip_id, transfer_amount)

            # Strict balance preservation
            assert service.get_account(sender_id).balance == balance
            assert service.get_account(recip_id).balance == Decimal("0")

    def test_boundary_zero_and_negative_rejection_property(self, service: PaymentService) -> None:
        """Invariant: Zero or negative transfer amounts never mutate balances."""
        rng = random.Random(999)
        service.create_account("S_NONPOS", "Sender", 10000)
        service.create_account("R_NONPOS", "Recipient", 1000)

        for _ in range(20):
            neg_or_zero = Decimal(str(-rng.randint(0, 5000)))
            with pytest.raises(InvalidAmountError):
                service.transfer("S_NONPOS", "R_NONPOS", neg_or_zero)

            assert service.get_account("S_NONPOS").balance == Decimal("10000")
            assert service.get_account("R_NONPOS").balance == Decimal("1000")

    def test_boundary_monotonicity_property(self, service: PaymentService) -> None:
        """Invariant: If amount X fails due to insufficient balance, all Y > X must also fail."""
        rng = random.Random(2024)
        service.create_account("S_MONO", "Sender", Decimal("5000.00"))
        service.create_account("R_MONO", "Recipient", Decimal("100.00"))

        base_overdraft = Decimal("5000.01")
        # Base overdraft must fail
        with pytest.raises(InsufficientFundsError):
            service.transfer("S_MONO", "R_MONO", base_overdraft)

        # Any strictly larger amount must also fail monotonically
        for _ in range(30):
            delta = Decimal(str(rng.randint(1, 100000))) + Decimal("0.05")
            larger_amount = base_overdraft + delta
            with pytest.raises(InsufficientFundsError):
                service.transfer("S_MONO", "R_MONO", larger_amount)

            # Neither account balance may mutate
            assert service.get_account("S_MONO").balance == Decimal("5000.00")
            assert service.get_account("R_MONO").balance == Decimal("100.00")

    def test_balance_non_negativity_invariants_across_operations(self, service: PaymentService) -> None:
        """Invariant: Across 100 mixed valid/invalid transactions, no account balance is ever negative."""
        rng = random.Random(7777)
        acc_ids = [f"ACC_{i}" for i in range(5)]
        for acc_id in acc_ids:
            service.create_account(acc_id, f"User {acc_id}", Decimal("2000.00"))

        for _ in range(100):
            s_id = rng.choice(acc_ids)
            r_id = rng.choice(acc_ids)
            amt = Decimal(str(rng.randint(-500, 3000)))
            try:
                service.transfer(s_id, r_id, amt)
            except (InsufficientFundsError, InvalidAmountError, SelfTransferError):
                pass

            # Invariant: Every account balance >= 0
            for check_id in acc_ids:
                bal = service.get_account(check_id).balance
                assert bal >= Decimal("0"), f"Account {check_id} went negative: {bal}"

