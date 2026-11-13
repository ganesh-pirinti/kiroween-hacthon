"""Intentionally vulnerable payment implementation available ONLY as a local test fixture.

SECURITY NOTICE:
This class is isolated in the test fixtures directory and must never be exposed
to production payment flows. It serves exclusively as a ground-truth defect target
for Ghost Protocol's adversarial verification engine.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Union

from backend.app.payment import (
    InvalidAmountError,
    PaymentService,
    SelfTransferError,
    TransferResult,
)


class VulnerablePaymentService(PaymentService):
    """Deliberately defective payment service fixture.
    
    FLAW (PAYMENT-004 VIOLATION):
    Omit the sender available balance check (sender.balance >= amount).
    Deducts funds regardless of balance, resulting in unauthorized negative balances
    and invalid money creation.
    """

    def transfer(
        self,
        sender_id: str,
        recipient_id: str,
        amount: Union[Decimal, int, float, str],
    ) -> TransferResult:
        amt = Decimal(str(amount))

        if amt <= Decimal("0"):
            raise InvalidAmountError("Transfer amount must be strictly positive")

        if sender_id == recipient_id:
            raise SelfTransferError("Cannot transfer funds to the same account")

        sender = self.get_account(sender_id)
        recipient = self.get_account(recipient_id)

        # DELIBERATE FLAW:
        # The line `if sender.balance < amt: raise InsufficientFundsError(...)` is omitted!
        sender.balance -= amt
        recipient.balance += amt

        return TransferResult(
            transfer_id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amt,
            sender_balance_after=sender.balance,
            recipient_balance_after=recipient.balance,
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="SUCCESS",
        )
