# Requirement Dossier: PAYMENT-004

## Title
Overdraft Prevention and Atomic Balance Preservation

## Formal Specification
*"When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."*

---

## 1. Context & Threat Scenario
In automated agent coding, models frequently write debit-credit logic that:
1. Deducts from sender without checking `sender.balance >= amount`.
2. Checks the balance but still credits the recipient before failing.
3. Decrements balance to a negative number without raising an exception.

This violation causes catastrophic monetary debasement and unauthorized credit creation.

---

## 2. Formal Acceptance Criteria
- **AC-04.1**: Any transfer attempt where `amount > sender.balance` MUST immediately abort and raise `InsufficientFundsError`.
- **AC-04.2**: The sender's balance MUST remain identical to its pre-operation value.
- **AC-04.3**: The recipient's balance MUST remain identical to its pre-operation value.
- **AC-04.4**: Zero side-effects or partial state modifications may persist.
- **AC-04.5**: Boundary condition: Attempting to transfer `sender.balance + 0.01` MUST be rejected with zero balance change.

---

## 3. Approved Test Target
`backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged`
