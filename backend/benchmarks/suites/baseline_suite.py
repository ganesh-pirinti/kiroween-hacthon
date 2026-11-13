"""Baseline Test Suite representing ordinary happy-path tests.

This suite mimics typical developer or AI coding agent tests that focus
exclusively on happy-path success flows without adversarial or boundary assertions.
"""

from decimal import Decimal
from typing import Any, Tuple


def run_baseline_tests(service_instance: Any) -> Tuple[bool, str]:
    """Execute the baseline happy-path test suite against a payment service instance.
    
    Returns:
        (passed: bool, message: str)
    """
    try:
        # Happy-path Test 1: Account Creation with standard positive balance
        acc1 = service_instance.create_account("ACC-BASE-1", "Alice", 1000)
        acc2 = service_instance.create_account("ACC-BASE-2", "Bob", 500)
        if acc1.balance != Decimal("1000"):
            return False, "Failed: Account 1 initial balance mismatch"
        if acc2.balance != Decimal("500"):
            return False, "Failed: Account 2 initial balance mismatch"

        # Happy-path Test 2: Standard positive transfer with sufficient balance
        res = service_instance.transfer("ACC-BASE-1", "ACC-BASE-2", 200)

        # Happy-path Test 3: Check status is SUCCESS
        if res.status != "SUCCESS":
            return False, f"Failed: Expected SUCCESS status, got {res.status}"

        # Happy-path Test 4: Check sender balance decreased
        if acc1.balance != Decimal("800"):
            return False, f"Failed: Expected sender balance 800, got {acc1.balance}"

        return True, "Baseline happy-path tests PASSED (4/4 checks passed)"

    except Exception as exc:
        return False, f"Baseline happy-path tests FAILED with exception: {exc}"
