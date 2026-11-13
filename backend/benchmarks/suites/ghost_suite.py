"""Ghost Protocol Verification Suite (Adversarial, Boundary & Invariants).

This suite independently verifies each formal requirement against adversarial
conditions, non-atomic corruptions, boundary values, and mathematical conservation.
"""

from decimal import Decimal
import random
from typing import Any, Tuple, List, Dict


def run_ghost_verification(service_instance: Any, target_defect_id: str | None = None) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """Execute the full Ghost Protocol verification suite against a payment service instance.
    
    Returns:
        (passed: bool, summary_message: str, detailed_findings: List[Dict])
    """
    findings: List[Dict[str, Any]] = []

    # Check 1: PAYMENT-004 Overdraft Protection and Atomic Balance Preservation
    try:
        s = service_instance.create_account("S-ADV-004", "Alice", Decimal("10000.00"))
        r = service_instance.create_account("R-ADV-004", "Bob", Decimal("0.00"))

        raised_overdraft = False
        try:
            service_instance.transfer("S-ADV-004", "R-ADV-004", Decimal("15000.00"))
        except Exception as e:
            if "Insufficient" in type(e).__name__ or "insufficient" in str(e).lower():
                raised_overdraft = True

        if not raised_overdraft:
            findings.append({
                "check": "PAYMENT-004: Overdraft Rejection",
                "status": "VIOLATION",
                "explanation": "Overdraft of ₹15,000 from ₹10,000 balance was accepted without raising InsufficientFundsError.",
            })
        elif s.balance != Decimal("10000.00") or r.balance != Decimal("0.00"):
            findings.append({
                "check": "PAYMENT-004: Atomic Preservation",
                "status": "VIOLATION",
                "explanation": f"Non-atomic failure: Sender balance was mutated to {s.balance} (expected 10000) or Recipient to {r.balance} (expected 0).",
            })
    except Exception as exc:
        findings.append({
            "check": "PAYMENT-004: Overdraft Harness",
            "status": "VIOLATION",
            "explanation": f"Harness execution error: {exc}",
        })

    # Check 2: PAYMENT-002 Negative Amount Rejection
    try:
        s2 = service_instance.create_account("S-ADV-002", "Alice", Decimal("1000.00"))
        r2 = service_instance.create_account("R-ADV-002", "Bob", Decimal("500.00"))
        raised_neg = False
        try:
            service_instance.transfer("S-ADV-002", "R-ADV-002", Decimal("-500.00"))
        except Exception as e:
            if "Invalid" in type(e).__name__ or "invalid" in str(e).lower() or "negative" in str(e).lower():
                raised_neg = True

        if not raised_neg:
            findings.append({
                "check": "PAYMENT-002: Negative Amount Rejection",
                "status": "VIOLATION",
                "explanation": "Transfer of negative amount (-₹500) was accepted without raising InvalidAmountError.",
            })
        elif s2.balance != Decimal("1000.00") or r2.balance != Decimal("500.00"):
            findings.append({
                "check": "PAYMENT-002: Negative Amount Immutability",
                "status": "VIOLATION",
                "explanation": "Account balances mutated after rejected negative transfer attempt.",
            })
    except Exception as exc:
        findings.append({
            "check": "PAYMENT-002: Negative Amount Harness",
            "status": "VIOLATION",
            "explanation": f"Harness execution error: {exc}",
        })

    # Check 3: PAYMENT-002 Zero Amount Rejection (Boundary)
    try:
        s3 = service_instance.create_account("S-ADV-002B", "Alice", Decimal("1000.00"))
        r3 = service_instance.create_account("R-ADV-002B", "Bob", Decimal("500.00"))
        raised_zero = False
        try:
            service_instance.transfer("S-ADV-002B", "R-ADV-002B", Decimal("0.00"))
        except Exception as e:
            if "Invalid" in type(e).__name__ or "invalid" in str(e).lower():
                raised_zero = True

        if not raised_zero:
            findings.append({
                "check": "PAYMENT-002: Zero-Amount Rejection",
                "status": "VIOLATION",
                "explanation": "Transfer of zero amount (₹0) was accepted without raising InvalidAmountError.",
            })
    except Exception as exc:
        findings.append({
            "check": "PAYMENT-002: Zero Amount Harness",
            "status": "VIOLATION",
            "explanation": f"Harness execution error: {exc}",
        })

    # Check 4: PAYMENT-005 Self-Transfer Prohibition
    try:
        s4 = service_instance.create_account("S-ADV-005", "Self", Decimal("1000.00"))
        raised_self = False
        try:
            service_instance.transfer("S-ADV-005", "S-ADV-005", Decimal("100.00"))
        except Exception as e:
            if "Self" in type(e).__name__ or "self" in str(e).lower():
                raised_self = True

        if not raised_self:
            findings.append({
                "check": "PAYMENT-005: Self-Transfer Prohibition",
                "status": "VIOLATION",
                "explanation": "Self-transfer on identical account ID was permitted without SelfTransferError.",
            })
    except Exception as exc:
        findings.append({
            "check": "PAYMENT-005: Self-Transfer Harness",
            "status": "VIOLATION",
            "explanation": f"Harness execution error: {exc}",
        })

    # Check 5: PAYMENT-003 Monetary Conservation Invariant (Property-based test with seed=42)
    try:
        rng = random.Random(42)
        s_initial = Decimal("5000.00")
        r_initial = Decimal("3000.00")
        total_initial = s_initial + r_initial

        service_instance.create_account("S-PROP-003", "Alice", s_initial)
        service_instance.create_account("R-PROP-003", "Bob", r_initial)

        # Run 20 randomized valid transfers
        for _ in range(20):
            amt = Decimal(str(rng.randint(10, 100)))
            try:
                service_instance.transfer("S-PROP-003", "R-PROP-003", amt)
            except Exception:
                pass
            s_bal = service_instance.get_account("S-PROP-003").balance
            r_bal = service_instance.get_account("R-PROP-003").balance

            if s_bal + r_bal != total_initial:
                findings.append({
                    "check": "PAYMENT-003: Monetary Conservation",
                    "status": "VIOLATION",
                    "explanation": f"Conservation invariant violated! Initial sum was {total_initial}, current sum is {s_bal + r_bal} (phantom creation or fee leak).",
                })
                break
    except Exception as exc:
        findings.append({
            "check": "PAYMENT-003: Conservation Harness",
            "status": "VIOLATION",
            "explanation": f"Harness execution error: {exc}",
        })

    all_passed = len(findings) == 0
    if all_passed:
        return True, "Ghost Protocol verification PASSED: All 5 adversarial & invariant checks satisfied.", []
    else:
        return False, f"Ghost Protocol verification DETECTED {len(findings)} violation(s).", findings
