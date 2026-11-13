# GHOST PROTOCOL — Three-Minute Live Judging Demo Script

> **Product Slogan**: *"AI says Done. We demand proof."*  
> **Presenter**: Lead Systems Architect  
> **Target Scenario**: `PAYMENT-004` (Overdraft Protection & Atomic Balance Preservation)  
> **Total Duration**: Exactly 3 Minutes (180 Seconds)  

---

## Technical Setup Before Judges Arrive

Ensure the following two terminals are running:
1. **Terminal 1 (Backend API)**:
   ```powershell
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. **Terminal 2 (Frontend Dashboard)**:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open browser to **[http://localhost:5173](http://localhost:5173)** in full screen.

---

## 3-Minute Demonstration Flow

```mermaid
timeline
    title 3-Minute Live Judging Timeline
    00:00 - 00:45 : Act 1: The False Completion Claim : "Would you trust an AI coding agent with your money?" Show agent's completion claim (ordinary test passed).
    00:45 - 01:30 : Act 2: Exposing the Flaw : Click "Run Demonstration". Subprocess exit code 1. Status: VIOLATION. Balance drops to -₹5,000. Finding generated.
    01:30 - 02:15 : Act 3: Verifying the Fix : Click "Verify Requirement" on PAYMENT-004. Subprocess exit code 0. Status: VERIFIED. Cryptographic SHA-256 seal.
    02:15 - 03:00 : Act 4: Criteria Coverage & Benchmark : Show PAYMENT-003 stays UNVERIFIED due to criteria gap. Show 6-defect benchmark: 100% detection vs 0% baseline.
```

---

### Act 1: The AI Agent's False Completion Claim (0:00 – 0:45)

**Presenter Talking Points**:
> *"Good morning judges. Every engineering team using autonomous AI coding agents faces the same terrifying trap: the agent writes code, runs a trivial test it wrote for itself, reports 'All tests passed, task complete!', and moves on. But would you trust that claim with your money?"*

**Presenter Action**:
- Show the AI Agent Completion Claim from `evidence/agent_completion_claim.json`:
  > *"Agent Claim: Implemented payment transfer. Ran test `test_valid_transfer_updates_balances`. 1 passed in 0.02s. Requirement PAYMENT-004 is Done!"*

**The Catch**:
> *"The AI agent tested transferring ₹200 from an account with ₹10,000 balance. It passed. But the agent completely ignored the core specification of PAYMENT-004: what happens when someone attempts to transfer ₹15,000 from a ₹10,000 balance? Ghost Protocol does not trust AI prose. We demand proof."*

---

### Act 2: Exposing the Vulnerable Code (0:45 – 1:30)

**Presenter Talking Points**:
> *"Now let's run Ghost Protocol's adversarial verification engine against the agent's code."*

**Presenter Action**:
- In the dashboard, click the top **"Run Demonstration"** button (or execute `python scripts/demonstrate_bug.py` in PowerShell).

**Observable Outcome**:
1. Ghost Protocol executes the adversarial overdraft test against the vulnerable test fixture.
2. **Process Exit Code**: `1`
3. **Requirement Status**: Transitions to crimson **`VIOLATION`**.
4. **Failure Output**: `Failed: DID NOT RAISE InsufficientFundsError`.
5. **Observed Ledger State**: The sender balance dropped to **-₹5,000** and recipient received **₹15,000**! Money was created out of thin air.
6. **Finding Generated**: Actionable `[CRITICAL]` finding `fnd-6f2f3eb6` created with exact reproduction commands:
   ```powershell
   python -m pytest backend/tests/test_adversarial_vulnerable.py -v
   ```

---

### Act 3: Applying the Fix & Verifying Proof (1:30 – 2:15)

**Presenter Talking Points**:
> *"Now we apply the corrected implementation with atomic balance preservation and re-verify."*

**Presenter Action**:
- In the Requirements Explorer, select **`PAYMENT-004`** and click **"Verify Requirement"**.

**Observable Outcome**:
1. Ghost Protocol runs `test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged`.
2. **Process Exit Code**: `0`
3. **Requirement Status**: Transitions to emerald **`VERIFIED`**.
4. **Terminal Log in Evidence Viewer**: `============================== 1 passed in 0.05s ==============================`.
5. **Ledger Immutability**:
   - Sender balance strictly maintained at **₹10,000**.
   - Recipient balance strictly maintained at **₹0**.
6. **Integrity Seal**: SHA-256 digest is cryptographically computed and sealed in SQLite.

---

### Act 4: Criteria Coverage & Scientific Benchmark (2:15 – 3:00)

**Presenter Talking Points**:
> *"Ghost Protocol enforces two foundational axioms that no other tool provides: no false convergence, and scientific defect detection."*

**Presenter Action 1 (No False Convergence)**:
- Click on **`PAYMENT-003`** in the Requirements Explorer.
- Point to acceptance criterion `AC-03.4` (Audit compliance log stream).
- Show that because `AC-03.4` has no executable test bound (`linked_test: null`), `PAYMENT-003` remains strictly **`UNVERIFIED`** even though all its other tests passed.
- *"Unverified criteria can never be marked verified. AI claims cannot skip criteria."*

**Presenter Action 2 (The 6-Defect Benchmark)**:
- Click **"Benchmark Report"** in the top navigation bar.
- Point to the confusion matrix:
  - **Baseline Suite (Ordinary Happy-Path Tests)**: **0.0% defect detection (100% false negative rate)**. Missed all 6 seeded defects.
  - **Ghost Protocol (Adversarial Engine)**: **100.0% defect detection (6/6 defects caught)** with **0% false alarms** on clean reference code.

**Closing Line**:
> *"When AI says Done, don't trust an LLM summary. Demand Ghost Protocol proof. Thank you."*

---

## CLI Fallback Commands (If Projector / Internet Fails)

If the web UI cannot be shown, run these two standalone PowerShell commands directly in front of judges:

```powershell
# 1. Five-second automated overdraft demonstration (Vulnerable vs Corrected)
python scripts/demonstrate_bug.py

# 2. Independent 6-defect benchmark harness
python scripts/run_benchmark.py
```
Both print full forensic execution scorecards to standard output with zero web dependencies.
