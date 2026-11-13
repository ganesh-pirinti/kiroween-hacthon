# Project Ghost Protocol

## Milestone 1: The Evidence Engine

> **Core Axiom**: *Never trust an AI agent's completion claim. Software correctness is established only through reproducible, tamper-evident test execution evidence tied to explicit acceptance criteria.*

---

## 1. Overview

Ghost Protocol is an independent verification harness designed to solve the **AI Agent Hallucination Problem** in software engineering. When autonomous coding agents proclaim *"I have implemented the requirement and all tests pass,"* Ghost Protocol ignores the claim and independently executes approved test suites, captures raw process output, cryptographic fingerprints, and exit statuses, and seals immutable evidence records.

In Milestone 1, we deliver the **Evidence Engine**:
- Formal requirement specification with stable IDs and explicit acceptance criteria (`requirements.md`).
- A four-state verification state machine: `PASS`, `FAIL`, `BLOCKED`, and `UNVERIFIED`.
- Tamper-evident evidence generation using SHA-256 cryptographic hashes and code fingerprints.
- Isolated subprocess test runner preventing arbitrary command injection.
- Persistence via SQLite (`evidence/evidence.db`) and standalone audit JSON artifacts (`evidence/*.json`).
- FastAPI verification API (`backend/app/main.py`).
- Reproducible demonstration of an adversarial overdraft attack (Requirement `PAYMENT-004`) proving that a vulnerable implementation fails and the corrected implementation passes with state preservation.

---

## 2. Technology Stack

- **Language & Runtime**: Python 3.11+ / 3.12+
- **Verification API**: FastAPI + Uvicorn
- **Test Runner**: Pytest 8.0+ / 9.0+
- **Persistence**: SQLite (Local database in `evidence/evidence.db`)
- **Data Validation & Hashing**: Pydantic v2 + Python Standard Library `hashlib` (SHA-256)
- **Client / Harness**: HTTPX

---

## 3. Project Structure

```
kiro hackthon/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── payment.py         # Minimal money-transfer service (corrected & verified)
│   │   ├── evidence.py        # Evidence models, SHA-256 sealing, & SQLite store
│   │   ├── verifier.py        # Subprocess runner, exit code mapper, & registry
│   │   └── main.py            # FastAPI REST endpoints for verification
│   └── tests/
│       ├── __init__.py
│       ├── test_payment.py    # Unit & adversarial tests bound to requirements
│       └── test_verifier.py   # Tests for Verifier, Evidence Engine, & REST API
├── evidence/
│   ├── evidence.db                                # SQLite evidence ledger
│   ├── evidence_PAYMENT-004_vulnerable_fail.json  # Real failing run evidence (vulnerable)
│   ├── evidence_PAYMENT-004_corrected_pass.json   # Real passing run evidence (corrected)
│   └── evidence_full_test_suite_pass.json         # Complete suite passing evidence
├── scripts/
│   └── demonstrate_bug.py     # Automated reproduction script for Milestone 1 demo
├── requirements.md            # Formal SRS with stable IDs & acceptance criteria
├── requirements.txt           # Python dependencies
├── pytest.ini                 # Pytest configuration & custom mark registrations
├── .gitignore                 # Standard Python/IDE ignore rules
└── README.md                  # System documentation & reproduction manual
```

---

## 4. Verification State Machine

| State | Definition | Exit Status & Behavior |
| :--- | :--- | :--- |
| `PASS` | All bound acceptance tests executed and passed. | Process Exit Code `0`. |
| `FAIL` | Tests ran to completion; one or more assertions failed. | Process Exit Code `1`. |
| `BLOCKED` | Execution interrupted, syntax/runtime error, or runner fault. | Process Exit Code `2`, `3`, `4`, or execution timeout. |
| `UNVERIFIED` | No executable test bound, or 0 tests were collected. | Process Exit Code `5` or unregistered requirement ID. |

> **Crucial Rule**: A missing or unbound test must result in `UNVERIFIED`, **never** `PASS`.

---

## 5. Quickstart & Installation (Windows PowerShell)

### Prerequisites
- Python 3.11 or 3.12 installed on your system.

### Step 1: Install Dependencies
Open Windows PowerShell in the project directory:
```powershell
python -m pip install -r requirements.txt
```

### Step 2: Run the Complete Test Suite
Verify that all 17 unit, adversarial, verifier, and API tests pass:
```powershell
python -m pytest -v
```

---

## 6. Reproducing the Vulnerability and Correction Demo (PAYMENT-004)

### Target Scenario
- **Requirement ID**: `PAYMENT-004`
- **Specification**: *"When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."*
- **Scenario**:
  - Sender initial balance: ₹10,000
  - Recipient initial balance: ₹0
  - Transfer attempt: ₹15,000
  - Expected: `InsufficientFundsError` raised; both balances unchanged.

### Automated One-Click Reproduction
Run the automated demonstration script:
```powershell
python scripts/demonstrate_bug.py
```

### What the Script Proves
1. **Vulnerable Phase**: Deploys the defective `PaymentService` (omits balance validation). Executes adversarial test `test_overdraft_transfer_rejected_and_balances_unchanged`.
   - **Real Process Exit Code**: `1`
   - **Captured Output**: `Failed: DID NOT RAISE InsufficientFundsError`
   - **Verdict**: `FAIL`
   - **Artifact**: Saved to `evidence/evidence_PAYMENT-004_vulnerable_fail.json`.
2. **Corrected Phase**: Deploys the secure `PaymentService` (verifies `sender.balance >= amount` before debit/credit).
   - **Real Process Exit Code**: `0`
   - **Captured Output**: `1 passed in 0.13s`
   - **Verdict**: `PASS`
   - **Artifact**: Saved to `evidence/evidence_PAYMENT-004_corrected_pass.json`.
3. **Evidence Ledger**: Both records are sealed with SHA-256 digests and stored in `evidence/evidence.db`.

---

## 7. Running the FastAPI Verification Engine

Start the local verification server:
```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

### Key REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and engine status. |
| `GET` | `/api/requirements` | Catalog of requirements with latest verified status. |
| `GET` | `/api/requirements/{req_id}` | Detailed requirement spec, criteria, and execution history. |
| `POST` | `/api/verify/{req_id}` | Triggers isolated execution of bound test target and returns evidence. |
| `POST` | `/api/verify-all` | Runs verification for all registered requirements. |
| `GET` | `/api/evidence` | Query historical evidence records (filter by `requirement_id` or `verdict`). |
| `GET` | `/api/evidence/{evidence_id}` | Retrieve full tamper-evident record (hashes, stdout, exit code). |

Interactive OpenAPI documentation is available in your browser at:
`http://localhost:8000/docs`

### Example: Verifying via PowerShell `curl` / `Invoke-RestMethod`
```powershell
# Verify PAYMENT-004
Invoke-RestMethod -Uri "http://localhost:8000/api/verify/PAYMENT-004" -Method POST | ConvertTo-Json -Depth 4

# Query requirements scorecard
Invoke-RestMethod -Uri "http://localhost:8000/api/requirements" -Method GET | Format-Table requirement_id, latest_verdict, test_target
```

---

## 8. Security Boundaries

1. **No Arbitrary Command Execution**: The API never accepts or executes user-provided shell strings. The `Verifier` executes strictly whitelisted pytest targets mapped in `REQUIREMENTS_REGISTRY`.
2. **Isolation**: Tests run in an isolated subprocess with explicit timeouts and working directory containment.
3. **Tamper Detection**: Every evidence record computes a SHA-256 hash over the output, command, exit code, timestamp, and target code fingerprint. If the code or output is altered, the hash will not match.
4. **No Premature Security Claims**: Passing this test suite verifies that `PAYMENT-004` acceptance criteria are met under the tested conditions. It does not prove that the system is free from all concurrency flaws or distributed consensus issues.

---

## 9. Current Status & What Remains

### What Works in Milestone 1
- Full backend verification engine and exit-status interpreter.
- Complete domain logic for money transfers with strict input and balance validation.
- Standard and adversarial test suites.
- Formal requirements catalog (`PAYMENT-001` through `PAYMENT-006`).
- Unverified requirement detection (demonstrated via `PAYMENT-006`).
- Tamper-evident evidence persistence (SQLite + JSON).
- FastAPI verification endpoints and automated demonstration harness.

### What Remains for Future Milestones
- **Milestone 2**: Frontend interactive verification dashboard (React + TypeScript + Vite).
- **Milestone 3**: Distributed concurrency tests (multi-threaded race-condition stress harness).
- **Milestone 4**: Git commit hook integration and CI/CD agent-gating webhook.
