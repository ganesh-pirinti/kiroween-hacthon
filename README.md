# Project Ghost Protocol

> **Slogan**: *"AI says Done. We demand proof."*  
> **Mission**: Build an independent verification tool that verifies software requirements using executable evidence instead of trusting an AI coding agent's claim that a task is complete.

---

## 1. Product Principles

1. **Evidence Before Claims**: An AI agent's prose statement that a feature is complete has zero evidential value. Only isolated, reproducible test execution confers verified status.
2. **Unverified ≠ Verified**: Unverified requirements must never be marked verified without active, passed execution evidence.
3. **Real Process Results vs AI Explanations**: Ground-truth operating system exit codes, stdout/stderr streams, and code fingerprints are strictly distinguished from natural-language descriptions.
4. **Traceable & Reproducible Findings**: Every finding is accompanied by deterministic reproduction commands and linked to cryptographic evidence.
5. **Correctness Over Visual Effects**: Security, boundary validation, and mathematical invariance are prioritized over decorative placeholders.

---

## 2. Verification State Machine

| State | Definition | Process Exit Status | Finding Generated? |
| :--- | :--- | :--- | :--- |
| `VERIFIED` | Required checks have executed and passed with valid evidence. | Exit Code `0` | No |
| `VIOLATION` | At least one executed check demonstrates a requirement failure. | Exit Code `1` | Yes (`CRITICAL` / `HIGH`) |
| `BLOCKED` | Execution aborted due to dependency, syntax, environment, or timeout cutoff. | Exit Code `2`, `3`, `4`, or Timeout | Yes (`HIGH` / `BLOCKED`) |
| `UNVERIFIED` | Insufficient evidence exists; test has not run or target is unbound. | Exit Code `5` (0 tests collected) or Unbound | No |

> **Strict Rule**: A missing test results in `UNVERIFIED`, never `VERIFIED`. An environment error results in `BLOCKED`, never `VIOLATION`.

---

## 3. Technology Stack & Prerequisites

- **Python**: 3.11+ / 3.12+
- **Backend API**: FastAPI, Uvicorn, Pydantic v2
- **Testing**: Pytest (Unit, Adversarial, and Invariant Property Tests)
- **Database**: SQLite (Local relational database at `evidence/evidence.db`)
- **Frontend Scaffold**: React 18, TypeScript, Vite, Tailwind CSS
- **Version Control**: Git

---

## 4. Project Structure

```
kiro hackthon/
├── docs/                                          # Architecture, Plans & API Contracts
│   ├── architecture.md                            # Complete architectural blueprint
│   ├── implementation_plan.md                     # Phased roadmap checklist
│   ├── api_contracts.md                           # OpenAPI v1 contract definitions
│   └── security_and_testing_strategy.md           # Threat analysis & sandbox isolation
├── requirements/                                  # Formal Requirement Catalog
│   ├── catalog.json                               # Structured machine-readable SRS
│   └── PAYMENT-004.md                             # Dossier for overdraft protection scenario
├── backend/
│   ├── app/
│   │   ├── models/                                # Canonical Pydantic v2 domain models
│   │   │   ├── status.py                          # VERIFIED, VIOLATION, BLOCKED, UNVERIFIED
│   │   │   ├── requirement.py                     # Requirement & AcceptanceCriterion
│   │   │   ├── verification_run.py                # VerificationRun (timestamps, output, findings)
│   │   │   ├── evidence.py                        # Evidence & IntegrityMetadata
│   │   │   └── finding.py                         # Actionable defect Finding
│   │   ├── storage/                               # Relational SQLite Persistence Layer
│   │   │   ├── database.py                        # SQLite schema with foreign key enforcement
│   │   │   └── repository.py                      # Typed CRUD and catalog synchronization
│   │   ├── engine/                                # Subprocess Test Runner & Evaluator
│   │   │   ├── runner.py                          # Subprocess runner (path traversal check, 64KB limit)
│   │   │   └── evaluator.py                       # Evaluator & Finding generator
│   │   ├── payment.py                             # Corrected, verified payment transfer implementation
│   │   └── main.py                                # FastAPI application (v1 + compatibility endpoints)
│   └── tests/
│       ├── fixtures/                              # Local test fixtures
│       │   └── vulnerable_payment.py              # Intentionally vulnerable PaymentService fixture
│       ├── conftest.py                            # Shared pytest fixtures
│       ├── test_payment.py                        # Ordinary & adversarial tests (PAYMENT-004 corrected)
│       ├── test_adversarial_vulnerable.py         # Adversarial test exposing vulnerable fixture
│       ├── test_property_payment.py               # Property-based mathematical invariant tests
│       ├── test_foundation.py                     # Storage, evaluator, and security boundary tests
│       ├── test_verifier.py                       # Legacy verification engine tests
│       └── test_api_v1.py                         # REST API v1 endpoint contract tests
├── frontend/                                      # React + TypeScript + Vite Dashboard Scaffold
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── types/index.ts                         # Frontend TypeScript types matching backend models
│       ├── App.tsx                                # Mission & Slogan landing layout
│       └── main.tsx
├── evidence/                                      # Locally stored audit evidence
│   ├── evidence.db                                # SQLite relational audit database
│   ├── evidence_PAYMENT-004_vulnerable_fail.json  # Real failing run evidence (vulnerable)
│   └── evidence_PAYMENT-004_corrected_pass.json   # Real passing run evidence (corrected)
├── scripts/
│   └── demonstrate_bug.py                         # Automated reproduction script
├── requirements.md                                # Human-readable requirements spec
├── requirements.txt                               # Python dependencies
├── pytest.ini                                     # Pytest configuration
├── .gitignore                                     # Git ignore rules
└── README.md                                      # Documentation & reproduction guide
```

---

## 5. Verification Demonstration: Requirement PAYMENT-004

### Specification
*"When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."*

- **Initial Sender Balance**: ₹10,000
- **Initial Recipient Balance**: ₹0
- **Attempted Transfer**: ₹15,000
- **Expected Outcome**: Operation rejected with `InsufficientFundsError`; sender balance remains ₹10,000, recipient balance remains ₹0.

### Automated Demonstration
Run the automated comparison script in Windows PowerShell:
```powershell
python scripts/demonstrate_bug.py
```

### What This Demonstrates
1. **Vulnerable Fixture (`VulnerablePaymentService`)**:
   - Omits balance check before deducting funds.
   - When ₹15,000 is transferred from a ₹10,000 balance, it fails to raise `InsufficientFundsError`.
   - **Real Process Exit Code**: `1`
   - **Evaluated Status**: `VIOLATION`
   - **Output**: `Failed: DID NOT RAISE InsufficientFundsError`
   - **Finding**: Automatically creates finding `[CRITICAL]` with deterministic reproduction commands.
   - **Evidence**: Preserved in `evidence/evidence_PAYMENT-004_vulnerable_fail.json`.
2. **Corrected Implementation (`PaymentService`)**:
   - Enforces `if sender.balance < amount: raise InsufficientFundsError(...)`.
   - Balances remain strictly immutable upon rejection.
   - **Real Process Exit Code**: `0`
   - **Evaluated Status**: `VERIFIED`
   - **Output**: `1 passed in 0.10s`
   - **Evidence**: Preserved in `evidence/evidence_PAYMENT-004_corrected_pass.json`.

---

## 6. Windows PowerShell Reproduction Commands

### 1. Run the Entire Test Suite
Executes all 36 unit, property, foundation, and API tests:
```powershell
python -m pytest -v
```

### 2. Run the Adversarial Test against the Vulnerable Fixture Directly
Captures the real, unedited failure (Exit Code 1):
```powershell
python -m pytest backend/tests/test_adversarial_vulnerable.py -v
```

### 3. Run the Adversarial Test against the Corrected Implementation
Captures the real passing result (Exit Code 0):
```powershell
python -m pytest backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged -v
```

### 4. Run Property-Based Invariant Tests
Verifies that across randomized transfer sequences, monetary conservation $\Delta S + \Delta R = 0$ holds:
```powershell
python -m pytest backend/tests/test_property_payment.py -v
```

### 5. Launch the FastAPI Verification API
```powershell
python -m uvicorn backend.app.main:app --port 8000
```

### 6. Verify and Query via PowerShell REST Calls
```powershell
# Check engine health and slogan
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -Method GET | ConvertTo-Json

# List requirements and acceptance criteria
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/requirements" -Method GET | Format-Table id, title, status

# Trigger verification of PAYMENT-004
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/verify/PAYMENT-004" -Method POST | ConvertTo-Json -Depth 5

# Trigger comparative demonstration (vulnerable vs corrected)
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/demonstrate/vulnerable-vs-corrected" -Method POST | ConvertTo-Json -Depth 5

# Inspect discovered findings
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/findings" -Method GET | ConvertTo-Json -Depth 4
```

---

## 7. Security Boundaries

1. **No Arbitrary Command Execution**: The API never executes user-supplied shell commands. All executed commands are strictly constructed internally from the allowlist of approved test targets.
2. **Path Traversal Confinement**: All test targets are resolved against the project root; any relative path escaping the root raises an immediate security violation.
3. **Output Limits**: Subprocess outputs are capped at 64 KB to prevent buffer overruns or denial-of-service memory bloat.
4. **Environment Isolation**: Subprocesses execute with clean, sanitized environment variables that strip sensitive host API keys and credentials.
5. **Process Timeouts**: Subprocesses are bounded by a strict 30-second timeout, terminating runaway threads and mapping the result to `BLOCKED`.
