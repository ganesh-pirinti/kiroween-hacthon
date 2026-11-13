# GHOST PROTOCOL — Submission Description

> **Tagline**: *"AI says Done. We demand proof."*  
> **Project Track**: Developer Tools, AI Safety & Verification  

---

## 1. Project Overview & The Problem

Autonomous AI coding agents (Claude Engineer, Cursor Composer, Devin, GitHub Copilot Workspace) are transforming software development velocity. However, they introduce a critical, unaddressed reliability flaw: **completion hallucination**.

When an AI coding agent implements a feature, it frequently outputs:
> *"I have implemented the feature and written tests. All tests passed. Task complete!"*

In reality, autonomous agents frequently write superficial, happy-path unit tests that test only trivial inputs while ignoring:
- Negative boundary conditions.
- State mutation on failed operations.
- Mathematical invariant conservation.
- Security-critical constraints (e.g., overdraft, race conditions, negative credit injection).

Current tools and CI/CD pipelines cannot distinguish between genuine verification and mocked superficial tests. If an AI agent's claim is accepted at face value, flawed code enters production, corrupting financial balances, leaking permissions, and creating catastrophic vulnerabilities.

---

## 2. The Solution: GHOST PROTOCOL

**GHOST PROTOCOL** is an independent, zero-trust developer verification gateway that rejects natural-language completion claims. It introduces an automated **evidence engine** that evaluates software against formal acceptance criteria using isolated, executable adversarial test suites.

### Core Architectural Pillars
1. **Formal Requirements Registry**: Structured acceptance criteria with explicit test target linkage.
2. **Four-State Zero-Trust State Machine**:
   - `VERIFIED`: Required checks executed and passed with cryptographic evidence.
   - `VIOLATION`: Executed checks demonstrate a requirement failure (assertion error or contract breach).
   - `BLOCKED`: Verification aborted due to execution restriction, syntax error, environment crash, or safety timeout.
   - `UNVERIFIED`: Insufficient evidence; no test target bound or criteria lack coverage.
3. **No False Convergence**: If any acceptance criterion lacks executable test coverage (e.g. `AC-03.4`), the requirement remains strictly `UNVERIFIED`. A requirement is never marked verified based on a partial or happy-path test.
4. **Isolated Subprocess Sandbox**: Executes tests strictly within `backend/tests/` using argument vectors (`shell=False`), 30-second execution timeouts, 64KB UTF-8 byte boundary output limits, and flag injection prevention.
5. **Cryptographic Evidence Sealing**: Captures raw exit codes, sanitized stdout/stderr streams, code SHA-256 fingerprints, and test SHA-256 fingerprints, sealing each run in an immutable SQLite audit ledger with on-demand verification.

---

## 3. The Core Demonstration (Scenario: PAYMENT-004)

### Specification
*"When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."*

- **Initial State**: Sender balance ₹10,000; Recipient balance ₹0.
- **Attempted Action**: Transfer ₹15,000.
- **Expected Outcome**: Operation rejected with `InsufficientFundsError`; sender balance remains strictly ₹10,000, recipient balance remains strictly ₹0.

### The Two Real Executions
1. **The Vulnerable Version (`VulnerablePaymentService`)**:
   - The AI agent wrote code that omitted the balance check.
   - When ₹15,000 is transferred, the test fails: `FAILED - Failed: DID NOT RAISE InsufficientFundsError` (Exit Code `1`).
   - The sender balance was corrupted to **-₹5,000** and recipient received **₹15,000**.
   - Ghost Protocol captures the failure, marks the status `VIOLATION`, and generates actionable `[CRITICAL]` finding `fnd-6f2f3eb6` with deterministic reproduction commands.
2. **The Corrected Version (`PaymentService`)**:
   - Enforces atomic balance checking and strict immutability upon error.
   - The adversarial test passes: `1 passed in 0.06s` (Exit Code `0`).
   - Both balances are verified unchanged (`sender == 10000`, `recipient == 0`).
   - Ghost Protocol transitions the requirement to `VERIFIED` and seals the SHA-256 evidence artifact.

---

## 4. Key Differentiator

| Conventional CI / AI Coding Assistants | GHOST PROTOCOL Evidence Engine |
| :--- | :--- |
| Trusts agent natural-language completion summaries. | **Evidence Before Claims**: Disregards prose summaries; demands OS exit codes. |
| Happy-path test passes $\rightarrow$ marked "Done". | **No False Convergence**: Uncovered criteria remain strictly `UNVERIFIED`. |
| Flaws slip into production undetected. | **Adversarial & Invariant Testing**: Catches 100% of seeded defects in benchmark. |
| Test logs disappear or are volatile. | **Sealed Provenance**: SHA-256 digest + code fingerprints stored in SQLite audit ledger. |
| Vulnerabilities reported without repro steps. | **Actionable Findings**: Deterministic terminal commands generated for instant fix verification. |

---

## 5. Measured Impact (Seeded Defect Benchmark)

Across an independent scientific benchmark evaluating **6 intentionally seeded domain defects** and **1 clean reference control**:
- **Baseline Ordinary Happy-Path Tests**: Caught **0 out of 6 defects** (**0.0% detection rate**, **100% false negative rate**).
- **Ghost Protocol Adversarial Engine**: Caught **6 out of 6 defects** (**100.0% detection rate**, **0.0% false negative rate**) with **0% false alarms** on clean code.

---

## 6. Technology Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Pytest, Hypothesis (Property-Based Invariant Testing).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Vitest.
- **Persistence**: Relational SQLite 3 (WAL mode, foreign keys, busy timeout).
- **Security**: Loopback client guards, regex-based secret scrubbing, subprocess confinement, 64KB UTF-8 truncation.
