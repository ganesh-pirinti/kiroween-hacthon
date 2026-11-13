# Project Ghost Protocol — Software Requirements Specification (SRS)

## Milestone 1: Core Verification & Evidence Engine

Ghost Protocol rejects unverified agent claims. Software correctness is not established by natural language statements from an LLM; it is established solely through reproducible execution evidence produced against unambiguous acceptance criteria.

---

### Verification State Machine

| State | Definition | Exit Code / Evidence Criteria |
| :--- | :--- | :--- |
| **PASS** | Test executed to completion; all assertions succeeded. | Exit Code `0`; all bound acceptance tests passed. |
| **FAIL** | Test executed to completion; one or more assertions failed. | Exit Code `1`; assertion mismatch or behavioral failure. |
| **BLOCKED** | Execution failed before test completion due to syntax error, missing dependency, execution timeout, or harness failure. | Exit Code `2`, `3`, `4` or execution crash. |
| **UNVERIFIED** | No executable test suite is bound to this requirement, or no execution run exists, or pytest collected 0 matching tests. | Exit Code `5` (empty test match) or unrun state. |

> **Strict Rule**: A requirement must **never** transition to `PASS` without an attached execution record whose cryptographic code fingerprint matches the current codebase state. A missing test must result in `UNVERIFIED`, never `PASS`.

---

### Requirements Catalog

#### Requirement ID: `PAYMENT-001`
- **Title**: Account Initialization and Non-Negative Balance Enforcement
- **Description**: An account must be created with a unique account identifier, an owner name, and a non-negative initial balance.
- **Acceptance Criteria**:
  - `AC-01.1`: Creating an account with initial balance $\ge 0$ succeeds and sets the balance accurately.
  - `AC-01.2`: Creating an account with initial balance $< 0$ must raise `InvalidAmountError` and prevent account creation.
- **Bound Test Target**: `backend/tests/test_payment.py::TestPaymentBasics::test_account_initialization_non_negative`

---

#### Requirement ID: `PAYMENT-002`
- **Title**: Positive Transfer Amount Validation
- **Description**: Any transfer request must specify a strictly positive transfer amount ($> 0$).
- **Acceptance Criteria**:
  - `AC-02.1`: Transfer amounts of ₹0 must be rejected with `InvalidAmountError`.
  - `AC-02.2`: Negative transfer amounts (e.g., -₹500) must be rejected with `InvalidAmountError`.
  - `AC-02.3`: In both cases, neither sender nor recipient balances may change.
- **Bound Test Target**: `backend/tests/test_payment.py::TestPaymentBasics::test_negative_or_zero_amount_rejected`

---

#### Requirement ID: `PAYMENT-003`
- **Title**: Successful Balance Transfer
- **Description**: When a sender transfers an amount less than or equal to their available balance to an existing recipient, the sender's balance decreases by that amount, the recipient's balance increases by that exact amount, and a transfer audit record is produced.
- **Acceptance Criteria**:
  - `AC-03.1`: Given Sender balance ₹10,000 and Recipient balance ₹5,000, transferring ₹2,000 results in Sender balance ₹8,000 and Recipient balance ₹7,000.
  - `AC-03.2`: Total money across both accounts is conserved ($\Delta S + \Delta R = 0$).
  - `AC-03.3`: A `TransferResult` object with status `SUCCESS` and unique `transfer_id` is returned.
- **Bound Test Target**: `backend/tests/test_payment.py::TestPaymentTransfers::test_valid_transfer_updates_balances`

---

#### Requirement ID: `PAYMENT-004` (Primary Scenario)
- **Title**: Overdraft Prevention and Atomic Balance Preservation
- **Specification**: *"When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."*
- **Scenario Definition**:
  - Initial sender balance: ₹10,000
  - Initial recipient balance: ₹0
  - Transfer attempt: ₹15,000
  - Expected result: Rejected; both balances remain unchanged.
- **Acceptance Criteria**:
  - `AC-04.1`: Attempting to transfer an amount strictly greater than the sender's available balance must raise `InsufficientFundsError`.
  - `AC-04.2`: The sender's available balance must remain exactly ₹10,000.
  - `AC-04.3`: The recipient's balance must remain exactly ₹0.
  - `AC-04.4`: The transfer operation is atomic; no partial debit or credit may occur.
  - `AC-04.5`: An adversarial transfer of ₹10,000.01 against a ₹10,000 balance must also be rejected without state mutation.
- **Bound Test Target**: `backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged`

---

#### Requirement ID: `PAYMENT-005`
- **Title**: Prohibition of Self-Transfers
- **Description**: An account cannot execute a money transfer where the sender and recipient identifiers are identical.
- **Acceptance Criteria**:
  - `AC-05.1`: Initiating a transfer where `sender_id == recipient_id` must raise `SelfTransferError`.
  - `AC-05.2`: Account balance must remain unchanged.
- **Bound Test Target**: `backend/tests/test_payment.py::TestPaymentTransfers::test_self_transfer_rejected`

---

#### Requirement ID: `PAYMENT-006` (Unbound / Unverified Baseline)
- **Title**: Dual-Authorization for High-Value Corporate Transfers
- **Description**: Transfers exceeding ₹1,000,000 require secondary managerial authorization before settlement.
- **Acceptance Criteria**:
  - `AC-06.1`: Transfers $> ₹1,000,000$ enter `PENDING_APPROVAL` status.
- **Bound Test Target**: *None (Demonstrates UNVERIFIED status detection)*
