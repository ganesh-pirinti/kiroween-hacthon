"""Clean Golden Payment Service fixture for benchmark comparison (D0 - No Defect)."""

from __future__ import annotations

from decimal import Decimal
from typing import Dict
from pydantic import BaseModel, Field


class InsufficientFundsError(Exception):
    pass


class InvalidAmountError(Exception):
    pass


class SelfTransferError(Exception):
    pass


class AccountNotFoundError(Exception):
    pass


class Account(BaseModel):
    account_id: str
    owner_name: str
    balance: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class TransferResult(BaseModel):
    status: str
    sender_id: str
    recipient_id: str
    amount: Decimal


class GoldenPaymentService:
    """Defect-free baseline implementation satisfying all formal requirements."""

    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}

    def create_account(self, account_id: str, owner_name: str, initial_balance: Decimal | int | float = 0) -> Account:
        bal = Decimal(str(initial_balance))
        if bal < Decimal("0"):
            raise InvalidAmountError("Initial balance cannot be negative")
        acc = Account(account_id=account_id, owner_name=owner_name, balance=bal)
        self.accounts[account_id] = acc
        return acc

    def get_account(self, account_id: str) -> Account:
        if account_id not in self.accounts:
            raise AccountNotFoundError(f"Account {account_id} not found")
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

        # Atomic state mutation
        s.balance -= amt
        r.balance += amt

        return TransferResult(
            status="SUCCESS",
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amt,
        )
