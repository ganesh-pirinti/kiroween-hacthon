"""Seeded Defect D2: Non-atomic failure (partial mutation despite error)."""

from __future__ import annotations

from decimal import Decimal
from typing import Dict
from pydantic import BaseModel


class InsufficientFundsError(Exception):
    pass


class InvalidAmountError(Exception):
    pass


class SelfTransferError(Exception):
    pass


class Account(BaseModel):
    account_id: str
    owner_name: str
    balance: Decimal


class TransferResult(BaseModel):
    status: str
    sender_id: str
    recipient_id: str
    amount: Decimal


class DefectD2PaymentService:
    """Defective implementation: Debits sender balance before failing on overdraft."""

    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}

    def create_account(self, account_id: str, owner_name: str, initial_balance: Decimal | int | float = 0) -> Account:
        bal = Decimal(str(initial_balance))
        acc = Account(account_id=account_id, owner_name=owner_name, balance=bal)
        self.accounts[account_id] = acc
        return acc

    def get_account(self, account_id: str) -> Account:
        return self.accounts[account_id]

    def transfer(self, sender_id: str, recipient_id: str, amount: Decimal | int | float) -> TransferResult:
        amt = Decimal(str(amount))
        s = self.get_account(sender_id)
        r = self.get_account(recipient_id)

        if s.balance < amt:
            # DEFECT SEEDED HERE: Mutates sender balance before raising error!
            s.balance -= Decimal("100.00")  # Corrupts sender balance by ₹100
            raise InsufficientFundsError("Insufficient available funds")

        s.balance -= amt
        r.balance += amt

        return TransferResult(
            status="SUCCESS",
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amt,
        )
