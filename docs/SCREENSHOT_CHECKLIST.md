# GHOST PROTOCOL — Screenshot & Media Capture Checklist

> **Purpose**: Visual evidence checklist to be captured from the real running application (`http://localhost:5173`) and local terminal for competition submission.  
> **Rule**: Capture real application screens only. Do not mock or fabricate UI data.

---

## 1. Primary Investigation Overview & Truth Counters
- [ ] **Screen 1: Hero Overview & State Machine Telemetry**
  - **Route**: `http://localhost:5173` (Top Section)
  - **What to Capture**:
    - Tagline: *"AI says Done. We demand proof."*
    - Investigation Overview telemetry counters showing real database counts:
      - `VERIFIED`: Count of verified requirements (emerald badge).
      - `VIOLATION`: Count of active requirement violations (crimson badge).
      - `BLOCKED`: Count of blocked runs (amber badge).
      - `UNVERIFIED`: Count of requirements with unverified criteria gaps (slate badge).
    - Action buttons: "Run Demonstration", "Verify All", "Benchmark Report", "State Machine Glossary".

---

## 2. Requirements Explorer & Acceptance Criteria
- [ ] **Screen 2: Requirement PAYMENT-004 Dossier**
  - **Route**: `http://localhost:5173` (Select `PAYMENT-004`)
  - **What to Capture**:
    - Requirement ID: `PAYMENT-004` (Overdraft Prevention and Atomic Balance Preservation).
    - Status badge: `VERIFIED`.
    - Acceptance criteria list: `AC-04.1` through `AC-04.5` showing linked test targets.
    - Bound test target: `backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged`.

- [ ] **Screen 3: Unverified Criteria Gap Containment (PAYMENT-003)**
  - **Route**: `http://localhost:5173` (Select `PAYMENT-003`)
  - **What to Capture**:
    - Requirement ID: `PAYMENT-003` showing status strictly as `UNVERIFIED`.
    - Acceptance criterion `AC-03.4` highlighted with `(No linked test)` badge.
    - Explanatory alert: *"Requirement status cannot transition to VERIFIED because one or more acceptance criteria lack executable test coverage."*

---

## 3. Comparative Demonstration & Flaw Exposure
- [ ] **Screen 4: Vulnerability Exposure (Before Fix)**
  - **Action**: Click **"Run Demonstration"** $\rightarrow$ opens Comparative Demonstration Modal.
  - **What to Capture**:
    - Left column: **Vulnerable Implementation** (`VulnerablePaymentService`).
    - Exit code: `1` with red `VIOLATION` badge.
    - Raw failure log: `Failed: DID NOT RAISE InsufficientFundsError`.
    - Balance mutation alert: Sender balance corrupted to **-₹5,000**, recipient balance **₹15,000**.
    - Generated finding ID: `fnd-6f2f3eb6` (`[CRITICAL]`).

- [ ] **Screen 5: Verified Proof (After Fix)**
  - **What to Capture**:
    - Right column: **Corrected Implementation** (`PaymentService`).
    - Exit code: `0` with emerald `VERIFIED` badge.
    - Raw passing log: `============================== 1 passed in 0.05s ==============================`.
    - Balance preservation: Sender strictly **₹10,000**, recipient strictly **₹0**.
    - Finding status: `0 Findings Discovered`.

---

## 4. Evidence Viewer & Cryptographic Seal
- [ ] **Screen 6: Evidence Viewer & SHA-256 Digest**
  - **Route**: `http://localhost:5173` (Bottom Right Panel)
  - **What to Capture**:
    - Evidence ID: `ev-a42e2660ec` (Artifact Type: `PROCESS_LOG`).
    - Source: `pytest:backend/tests/test_payment.py::TestPaymentAdversarial...`.
    - Cryptographic SHA-256 Digest: e.g. `52ed69601b9c2098d69f9be5f74dff877c4f41b6cf213a0cc031ae89a14ba24b`.
    - Code Fingerprint & Test Fingerprint hashes.
    - Reproduction instructions terminal command.

---

## 5. Seeded Defect Benchmark Scorecard
- [ ] **Screen 7: Benchmark Confusion Matrix Modal**
  - **Action**: Click **"Benchmark Report"** in top header.
  - **What to Capture**:
    - Accuracy comparison: **14.3% (Baseline)** vs **100.0% (Ghost Protocol)**.
    - Defect detection rate (Recall): **0.0%** vs **100.0%** (+100.0% delta).
    - False negative rate: **100.0%** vs **0.0%** (-100.0% reduction).
    - Summary matrix table showing all 6 seeded defects caught with zero false alarms.

---

## 6. Terminal CLI Scorecard (Live Execution Proof)
- [ ] **Screen 8: PowerShell Terminal Execution**
  - **Command**: `python scripts/demonstrate_bug.py`
  - **What to Capture**:
    - Clean Windows PowerShell console window showing the two execution phases.
    - Verification Evidence Scorecard with exit codes `1` and `0`.
    - Confirmation message: *"Demonstration complete. Real evidence is sealed in SQLite and evidence/ JSON files."*
