"""Seeded Defect D6: Monetary leak / phantom fee (Conservation invariant violation)."""

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


class DefectD6PaymentService:
    """Defective implementation: Debits 100% of amount from sender, but credits only 95% to recipient."""

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
        if amt <= Decimal("0"):
            raise InvalidAmountError("Transfer amount must be strictly positive")
        if sender_id == recipient_id:
            raise SelfTransferError("Self-transfers are strictly prohibited")
        s = self.get_account(sender_id)
        r = self.get_account(recipient_id)

        if s.balance < amt:
            raise InsufficientFundsError("Insufficient available funds")

        # DEFECT SEEDED HERE: Leaks 5% phantom fee without conservation
        s.balance -= amt
        r.balance += amt * Decimal("0.95")  # Recipient gets 5% less than sender sent

        return TransferResult(
            status="SUCCESS",
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amt,
        )
