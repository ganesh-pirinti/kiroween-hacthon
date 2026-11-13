# Project Ghost Protocol — API Contracts & Specifications

> **Protocol Version**: 1.0.0-foundation  
> **Base URL**: `/api/v1`  

---

## 1. Status Codes & Enums

### 1.1 VerificationStatus
- `VERIFIED`: Target passed all bound checks with valid cryptographic evidence.
- `VIOLATION`: Target failed at least one test assertion or violated acceptance criteria.
- `BLOCKED`: Execution aborted due to dependency, syntax, or environment fault.
- `UNVERIFIED`: Insufficient or missing evidence; test has not been executed or target is unbound.

### 1.2 FindingSeverity
- `CRITICAL`: System-critical integrity violation (e.g. balance corruption, unauthorized overdraft).
- `HIGH`: Functional failure violating primary acceptance criteria.
- `MEDIUM`: Edge-case or boundary validation failure.
- `LOW`: Minor behavioral deviation or unhandled non-critical condition.
- `INFO`: Advisory observation or execution diagnostic.

---

## 2. Endpoints Specification

### 2.1 System & Health
#### `GET /api/v1/health`
Returns system operational state, version, and catalog metrics.
- **Response** (`200 OK`):
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "active_requirements": 6,
    "total_runs": 14,
    "unresolved_findings": 0
  }
  ```

---

### 2.2 Requirements
#### `GET /api/v1/requirements`
Lists all tracked requirements with current verified status.
- **Query Parameters**:
  - `status` (optional): Filter by `VERIFIED`, `VIOLATION`, `BLOCKED`, `UNVERIFIED`.
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "PAYMENT-004",
      "title": "Overdraft Prevention and Atomic Balance Preservation",
      "description": "When a transfer amount exceeds sender available balance, transfer must be rejected and neither balance may change.",
      "status": "VERIFIED",
      "acceptance_criteria": [
        {
          "id": "AC-04.1",
          "description": "Transfer attempt exceeding balance raises InsufficientFundsError"
        }
      ],
      "linked_tests": [
        "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged"
      ],
      "latest_run_id": "run-20261114-1a2b3c4d",
      "updated_at": "2026-11-14T00:46:43Z"
    }
  ]
  ```

#### `GET /api/v1/requirements/{id}`
Retrieve a single requirement, its acceptance criteria, linked findings, and run history.

---

### 2.3 Verification Execution
#### `POST /api/v1/verify/{requirement_id}`
Executes the approved test suite bound to `requirement_id`.
- **Security Check**: The `requirement_id` must match `^[A-Z0-9]+-[A-Z0-9]+$`. Unknown IDs return `404 Not Found`. Arbitrary test commands cannot be submitted.
- **Response** (`200 OK`):
  ```json
  {
    "run_id": "run-20261114-abc12345",
    "requirement_id": "PAYMENT-004",
    "status": "VERIFIED",
    "execution_status": "COMPLETED",
    "exit_code": 0,
    "duration_ms": 134.2,
    "evidence_id": "ev-789xyz12",
    "findings_generated": 0,
    "code_fingerprint": "a1bfe7884b6318d3a67c2d11beaa70583fe60bc70ddfbb31a946a137d325fa2f"
  }
  ```

#### `POST /api/v1/verify-all`
Sequentially executes verification across all registered requirements and compiles an audit scorecard.

---

### 2.4 Evidence & Findings
#### `GET /api/v1/evidence/{evidence_id}`
Retrieves an immutable evidence artifact.
- **Response** (`200 OK`):
  ```json
  {
    "evidence_id": "ev-789xyz12",
    "run_id": "run-20261114-abc12345",
    "artifact_type": "PROCESS_LOG",
    "source": "pytest:backend/tests/test_payment.py",
    "timestamp": "2026-11-14T00:46:43Z",
    "payload": "============================= test session starts =============================...",
    "integrity_metadata": {
      "sha256": "36414f4cb3de3a3bb825d8ee8151eb9d403fa013e9ae0a6c6a85cdfb3f1d3223",
      "exit_code": 0,
      "python_version": "3.11.9"
    }
  }
  ```

#### `GET /api/v1/findings`
Lists discovered requirement violations and defects.
- **Query Parameters**:
  - `requirement_id` (optional): Filter by requirement ID.
  - `severity` (optional): Filter by severity level.
- **Response** (`200 OK`):
  ```json
  [
    {
      "finding_id": "fnd-456def78",
      "requirement_id": "PAYMENT-004",
      "severity": "CRITICAL",
      "explanation": "Overdraft protection failed: DID NOT RAISE InsufficientFundsError when attempting to transfer ₹15,000 from ₹10,000 balance.",
      "reproduction_instructions": "python -m pytest backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged -v",
      "linked_evidence_ids": ["ev-vuln-001"],
      "created_at": "2026-11-14T00:46:40Z"
    }
  ]
  ```
