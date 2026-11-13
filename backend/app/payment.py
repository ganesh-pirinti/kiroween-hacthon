"""Ghost Protocol Payment Implementation (CORRECTED & VERIFIED)."""
from __future__ import annotations
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Union

class PaymentError(Exception): pass
class AccountNotFoundError(PaymentError): pass
class InvalidAmountError(PaymentError): pass
class InsufficientFundsError(PaymentError): pass
class SelfTransferError(PaymentError): pass

@dataclass
class Account:
    account_id: str
    owner_name: str
    balance: Decimal
    def __post_init__(self) -> None:
        if not isinstance(self.balance, Decimal):
            self.balance = Decimal(str(self.balance))

@dataclass
class TransferResult:
    transfer_id: str
    sender_id: str
    recipient_id: str
    amount: Decimal
    sender_balance_after: Decimal
    recipient_balance_after: Decimal
    timestamp: str
    status: str

class PaymentService:
    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}

    def create_account(self, account_id: str, owner_name: str, initial_balance: Union[Decimal, int, float, str]) -> Account:
        balance_dec = Decimal(str(initial_balance))
        if balance_dec < Decimal("0"):
            raise InvalidAmountError("Initial balance cannot be negative")
        account = Account(account_id=account_id, owner_name=owner_name, balance=balance_dec)
        self.accounts[account_id] = account
        return account

    def get_account(self, account_id: str) -> Account:
        if account_id not in self.accounts:
            raise AccountNotFoundError(f"Account {account_id} not found")
        return self.accounts[account_id]

    def transfer(self, sender_id: str, recipient_id: str, amount: Union[Decimal, int, float, str]) -> TransferResult:
        amt = Decimal(str(amount))
        if amt <= Decimal("0"):
            raise InvalidAmountError("Transfer amount must be strictly positive")
        if sender_id == recipient_id:
            raise SelfTransferError("Cannot transfer funds to the same account")

        sender = self.get_account(sender_id)
        recipient = self.get_account(recipient_id)

        # Enforce PAYMENT-004: reject overdrafts and preserve balances
        if sender.balance < amt:
            raise InsufficientFundsError(
                f"Insufficient funds: account '{sender_id}' balance {sender.balance} < requested {amt}"
            )

        # Atomic mutation
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
