# GHOST PROTOCOL — Benchmark Report: Seeded Defect Verification

> **"AI says Done. We demand proof."**

---

## 1. Executive Summary & Core Results

Modern AI coding agents frequently claim a feature is "Done" or "Verified" by writing simple happy-path unit tests that pass on superficially flawed code. 

To scientifically measure the gap between **ordinary happy-path testing** and **Ghost Protocol's adversarial verification engine**, we constructed an independent benchmark harness with **7 isolated fixtures**:
- **6 intentionally seeded defects** representing critical safety, boundary, and mathematical invariant violations.
- **1 clean reference control** representing a defect-free golden implementation.

### Measured Comparative Results

| Metric | Baseline Suite (Ordinary Tests) | Ghost Protocol (Adversarial Engine) | Delta |
| :--- | :---: | :---: | :---: |
| **Total Test Cases** | 7 | 7 | — |
| **Seeded Defects Tested** | 6 | 6 | — |
| **Clean Controls Tested** | 1 | 1 | — |
| **True Positives (Defects Caught)** | **0** | **6** | **+6** |
| **False Negatives (Defects Missed)** | **6** | **0** | **-6** |
| **True Negatives (Clean Passed)** | **1** | **1** | 0 |
| **False Positives (False Alarms)** | **0** | **0** | 0 |
| **Defect Detection Rate (Recall)** | **0.0%** | **100.0%** | **+100.0%** |
| **False Negative Rate** | **100.0%** | **0.0%** | **-100.0%** |
| **Specificity (Clean Precision)** | **100.0%** | **100.0%** | 0.0% |
| **Overall Accuracy** | **14.3%** | **100.0%** | **+85.7%** |

> **Key Finding**: Ordinary happy-path tests failed to detect a single seeded defect (**100% false negative rate**). Ghost Protocol independently detected **6 out of 6 defects (100% detection rate)** while producing zero false alarms on the clean reference implementation (**100% specificity**).

---

## 2. Benchmark Rules & Methodology

1. **Predefined Detection Criteria**: All 6 seeded defects and their expected detection criteria were documented in advance in `SEEDED_DEFECT_CATALOG`.
2. **Independently Verified Detections**: Every detection is programmatically verified through actual exception raising and balance assertions.
3. **Confusion Matrix Accounting**:
   - **True Positive (TP)**: Defective fixture executed $\rightarrow$ suite fails/flags violation.
   - **False Negative (FN)**: Defective fixture executed $\rightarrow$ suite passes (defect slipped through).
   - **True Negative (TN)**: Clean fixture executed $\rightarrow$ suite passes (correctly approved).
   - **False Positive (FP)**: Clean fixture executed $\rightarrow$ suite fails (false alarm).
4. **Strict Isolation**: All fixtures reside in [backend/benchmarks/fixtures/](file:///c:/Users/Abhi/Desktop/kiro%20hackthon/backend/benchmarks/fixtures) and are physically isolated from production engine code.
5. **Bounded Execution**: Total benchmark execution took **1.40 ms** with bounded iterations and memory limits.

---

## 3. Seeded Defect Catalog & Breakdown

### `DEFECT-01-OVERDRAFT`: Omission of Overdraft Check (PAYMENT-004)
- **Defect**: The transfer method omits `if sender.balance < amount:` balance check. An account with ₹10,000 can transfer ₹15,000, causing its balance to drop negative to -₹5,000.
- **Baseline Suite**: Passes! (Ordinary tests only transfer ₹200 from ₹1000 balance). $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` (`Expected InsufficientFundsError was not raised`). $\rightarrow$ **TRUE POSITIVE**.

### `DEFECT-02-NON-ATOMIC`: Non-Atomic Failure / Balance Corruption (PAYMENT-004)
- **Defect**: On overdraft, the service raises `InsufficientFundsError`, but debits ₹100 from sender balance before raising the exception.
- **Baseline Suite**: Passes! (Ordinary test doesn't test overdraft state rollback). $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` (`Sender balance was mutated to 9900; expected strictly 10000`). $\rightarrow$ **TRUE POSITIVE**.

### `DEFECT-03-NEGATIVE-AMOUNT`: Negative Amount Injection (PAYMENT-002)
- **Defect**: Omits `amount <= 0` validation, permitting transfers of `-₹500` which siphons recipient balance and credits sender.
- **Baseline Suite**: Passes! (Ordinary test only transfers positive ₹200). $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` (`Transfer of negative amount was accepted without InvalidAmountError`). $\rightarrow$ **TRUE POSITIVE**.

### `DEFECT-04-ZERO-AMOUNT`: Zero-Amount Boundary Acceptance (PAYMENT-002)
- **Defect**: Validates `amount < 0`, but accepts `amount == 0` without error.
- **Baseline Suite**: Passes! $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` (`Transfer of zero amount was accepted without InvalidAmountError`). $\rightarrow$ **TRUE POSITIVE**.

### `DEFECT-05-SELF-TRANSFER`: Loopback Self-Transfer Allowed (PAYMENT-005)
- **Defect**: Omits `sender_id == recipient_id` check. Allows account to transfer to itself.
- **Baseline Suite**: Passes! (Ordinary tests transfer between distinct accounts A and B). $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` (`Self-transfer on identical account ID permitted without SelfTransferError`). $\rightarrow$ **TRUE POSITIVE**.

### `DEFECT-06-CONSERVATION-LEAK`: Monetary Conservation Leak (PAYMENT-003)
- **Defect**: Debits 100% of amount from sender, but credits only 95% to recipient (leaks 5% phantom fee).
- **Baseline Suite**: Passes! (Ordinary test checks sender balance decreased by 200, ignoring recipient conservation). $\rightarrow$ **FALSE NEGATIVE**.
- **Ghost Protocol**: Fails with `VIOLATION` via randomized property invariant test (`Conservation violated! Initial sum was 8000, current sum is 7990`). $\rightarrow$ **TRUE POSITIVE**.

### `CONTROL-00-CLEAN`: Clean Golden Service (Defect-Free Reference)
- **Implementation**: Fully satisfies all formal criteria.
- **Baseline Suite**: Passes cleanly. $\rightarrow$ **TRUE NEGATIVE**.
- **Ghost Protocol**: Passes cleanly with 0 findings. $\rightarrow$ **TRUE NEGATIVE (0% False Alarms)**.

---

## 4. Environment & Safety Boundaries

- **Python Runtime**: Python 3.11.9 (AMD64)
- **Operating System**: Windows 11 (win32)
- **Execution Time**: ~1.40 ms
- **Subprocess Security**: Explicit allowlist, relative path traversal guards, 64KB output ceiling, and 30s timeout ceiling.

---

## 5. Honest Disclosures & Limitations

1. **Finite Scope**: This benchmark verifies 6 financial ledger domain defects and 1 clean control. It proves that adversarial and invariant testing catches domain-specific vulnerabilities that happy-path tests miss; it does **not** prove that the application is secure against all conceivable vulnerabilities.
2. **Deterministic Random Seeds**: Property-based tests use fixed seeds (`seed=42`, `seed=1337`, `seed=2024`) for strict reproducibility across audit runs.
3. **Criteria Coverage Gaps**: Acceptance criteria without bound tests (such as high-value dual authorization `AC-06.1` and compliance audit logging `AC-03.4`) are explicitly classified as `UNVERIFIED` rather than passing.

---

## 6. Exact Reproduction Commands

### Run the Benchmark via PowerShell
```powershell
python scripts/run_benchmark.py
```

### Run via FastAPI API Endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/benchmark/run" -Method Post
```

### Inspect Criteria Coverage Gaps
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/coverage" -Method Get
```
