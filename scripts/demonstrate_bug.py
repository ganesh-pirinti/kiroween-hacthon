"""Ghost Protocol — Bug & Fix Demonstration Script.

Automates the complete verification lifecycle required by Milestone 1:
1. Deploys the deliberately vulnerable PaymentService implementation.
2. Executes the adversarial test (transferring ₹15,000 from ₹10,000 balance).
3. Captures the real failing test output and links it to requirement PAYMENT-004.
4. Deploys the corrected, secure PaymentService implementation.
5. Re-executes the adversarial test and the entire test suite.
6. Captures passing test outputs, hashes, and preserves both evidence records in `evidence/`.
"""

import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.verifier import Verifier
from backend.app.evidence import EvidenceStore

PAYMENT_FILE = ROOT_DIR / "backend" / "app" / "payment.py"
EVIDENCE_DIR = ROOT_DIR / "evidence"

VULNERABLE_CODE = '''"""Ghost Protocol Payment Implementation (VULNERABLE BASELINE)."""
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

        # BUG: Missing balance check (PAYMENT-004 violation)
        # Deducts without checking if sender.balance >= amt
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
'''

CORRECTED_CODE = '''"""Ghost Protocol Payment Implementation (CORRECTED & VERIFIED)."""
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
'''


def run_demonstration() -> None:
    print("=" * 70)
    print("GHOST PROTOCOL: MILESTONE 1 EVIDENCE ENGINE DEMONSTRATION")
    print("Target Requirement: PAYMENT-004 (Overdraft Protection & Balance Preservation)")
    print("=" * 70)

    store = EvidenceStore(EVIDENCE_DIR / "evidence.db")
    verifier = Verifier(evidence_store=store, base_dir=ROOT_DIR)

    # -------------------------------------------------------------
    # Step 1: Deploy Vulnerable Code & Verify
    # -------------------------------------------------------------
    print("\n[Step 1] Deploying DELIBERATELY VULNERABLE payment.py...")
    PAYMENT_FILE.write_text(VULNERABLE_CODE, encoding="utf-8")

    print("[Step 2] Executing adversarial test for PAYMENT-004...")
    vuln_json = EVIDENCE_DIR / "evidence_PAYMENT-004_vulnerable_fail.json"
    vuln_record = verifier.verify_requirement(
        "PAYMENT-004",
        export_json_path=vuln_json,
        custom_metadata={"run_phase": "vulnerable_baseline_demonstration"},
    )

    print(f" -> Execution Exit Code: {vuln_record.exit_code}")
    print(f" -> Recorded Verdict:    {vuln_record.verdict.value}")
    print(f" -> Code Fingerprint:    {vuln_record.code_fingerprint[:16]}...")
    print(f" -> Evidence Hash:       {vuln_record.evidence_hash[:16]}...")
    print(f" -> Evidence Saved:      {vuln_json.name}")

    # -------------------------------------------------------------
    # Step 2: Deploy Corrected Code & Verify
    # -------------------------------------------------------------
    print("\n[Step 3] Deploying CORRECTED & SECURE payment.py...")
    PAYMENT_FILE.write_text(CORRECTED_CODE, encoding="utf-8")

    print("[Step 4] Executing adversarial test for PAYMENT-004 on corrected code...")
    pass_json = EVIDENCE_DIR / "evidence_PAYMENT-004_corrected_pass.json"
    pass_record = verifier.verify_requirement(
        "PAYMENT-004",
        export_json_path=pass_json,
        custom_metadata={"run_phase": "corrected_implementation_verification"},
    )

    print(f" -> Execution Exit Code: {pass_record.exit_code}")
    print(f" -> Recorded Verdict:    {pass_record.verdict.value}")
    print(f" -> Code Fingerprint:    {pass_record.code_fingerprint[:16]}...")
    print(f" -> Evidence Hash:       {pass_record.evidence_hash[:16]}...")
    print(f" -> Evidence Saved:      {pass_json.name}")

    # -------------------------------------------------------------
    # Step 3: Run Full Test Suite
    # -------------------------------------------------------------
    print("\n[Step 5] Running entire test suite against corrected code...")
    suite_json = EVIDENCE_DIR / "evidence_full_test_suite_pass.json"
    suite_record = verifier.run_entire_test_suite(export_json_path=suite_json)
    print(f" -> Suite Exit Code:     {suite_record.exit_code}")
    print(f" -> Suite Verdict:       {suite_record.verdict.value}")

    # -------------------------------------------------------------
    # Summary Scorecard
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("VERIFICATION EVIDENCE SCORECARD")
    print("=" * 70)
    print(f"{'Phase':<25} | {'Requirement':<12} | {'Exit':<5} | {'Verdict':<8} | {'Evidence File'}")
    print("-" * 70)
    print(f"{'Vulnerable Baseline':<25} | {'PAYMENT-004':<12} | {vuln_record.exit_code:<5} | {vuln_record.verdict.value:<8} | {vuln_json.name}")
    print(f"{'Corrected Implementation':<25} | {'PAYMENT-004':<12} | {pass_record.exit_code:<5} | {pass_record.verdict.value:<8} | {pass_json.name}")
    print(f"{'Full Test Suite':<25} | {'SUITE-ALL':<12} | {suite_record.exit_code:<5} | {suite_record.verdict.value:<8} | {suite_json.name}")
    print("=" * 70)
    print("\nDemonstration complete. Real evidence is preserved in evidence/ directory and SQLite DB.")


if __name__ == "__main__":
    run_demonstration()
