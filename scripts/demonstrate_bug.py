"""Ghost Protocol — Ground-Truth Verification Demonstration Script.

Automates the complete verification lifecycle required for PAYMENT-004:
1. Runs adversarial test against the intentionally vulnerable test fixture (VulnerablePaymentService).
   - Real exit code: 1
   - Evaluated status: VIOLATION
   - Real failure output: "Failed: DID NOT RAISE InsufficientFundsError"
   - Generates actionable CRITICAL Finding with reproduction instructions
2. Runs adversarial test against the corrected production implementation (PaymentService).
   - Real exit code: 0
   - Evaluated status: VERIFIED
   - Real passing output: "1 passed"
   - Confirms zero balance mutation and InsufficientFundsError
3. Preserves both runs and cryptographic evidence records in `evidence/`.
"""

import json
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository

EVIDENCE_DIR = ROOT_DIR / "evidence"


def run_demonstration() -> None:
    print("=" * 76)
    print("  GHOST PROTOCOL — EXECUTABLE VERIFICATION DEMONSTRATION")
    print("  Target Requirement: PAYMENT-004 (Overdraft Protection & Balance Preservation)")
    print("  \"AI says Done. We demand proof.\"")
    print("=" * 76)

    db = Database(EVIDENCE_DIR / "evidence.db")
    repo = StorageRepository(db)
    catalog_path = ROOT_DIR / "requirements" / "catalog.json"
    repo.sync_catalog(catalog_path)
    evaluator = VerificationEvaluator(repo, project_root=ROOT_DIR)

    # -------------------------------------------------------------
    # Step 1: Run Adversarial Test on Vulnerable Fixture
    # -------------------------------------------------------------
    print("\n[Phase 1] Executing Adversarial Test against Vulnerable Fixture...")
    print("  Scenario: Sender initial ₹10,000, attempted transfer ₹15,000")
    print("  Target:   backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service")

    vuln_target = "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service"
    v_req, v_run, v_finding = evaluator.verify_requirement("PAYMENT-004", target_override=vuln_target)
    v_evidence = repo.list_evidence_for_run(v_run.run_id)

    print(f"  -> Execution Exit Code:   {v_run.exit_code}")
    print(f"  -> Verification Status:   {v_req.status.value}")
    print(f"  -> Concise Output:        {v_run.concise_output}")
    print(f"  -> Code Fingerprint:      {v_run.code_fingerprint[:16]}...")
    if v_finding:
        print(f"  -> Generated Finding ID:  {v_finding.finding_id} [{v_finding.severity.value}]")
        print(f"  -> Finding Explanation:   {v_finding.explanation}")
        print(f"  -> Repro Command:         {v_finding.reproduction_instructions}")

    if v_evidence:
        vuln_json = EVIDENCE_DIR / "evidence_PAYMENT-004_vulnerable_fail.json"
        vuln_json.write_text(
            json.dumps({
                "run_id": v_run.run_id,
                "requirement_id": "PAYMENT-004",
                "verdict": v_req.status.value,
                "exit_code": v_run.exit_code,
                "command": v_run.command,
                "start_time": v_run.start_time,
                "end_time": v_run.end_time,
                "concise_output": v_run.concise_output,
                "finding": v_finding.model_dump() if v_finding else None,
                "code_fingerprint": v_run.code_fingerprint,
                "test_fingerprint": v_run.test_fingerprint,
                "sha256": v_evidence[0].integrity_metadata.sha256,
                "raw_stdout": v_evidence[0].payload,
            }, indent=2),
            encoding="utf-8",
        )
        print(f"  -> Exported Evidence:     {vuln_json.name}")

    # -------------------------------------------------------------
    # Step 2: Run Adversarial Test on Corrected Implementation
    # -------------------------------------------------------------
    print("\n[Phase 2] Executing Adversarial Test against Corrected Implementation...")
    print("  Target:   backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged")

    corr_target = "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged"
    c_req, c_run, c_finding = evaluator.verify_requirement("PAYMENT-004", target_override=corr_target)
    c_evidence = repo.list_evidence_for_run(c_run.run_id)

    print(f"  -> Execution Exit Code:   {c_run.exit_code}")
    print(f"  -> Verification Status:   {c_req.status.value}")
    print(f"  -> Concise Output:        {c_run.concise_output}")
    print(f"  -> Code Fingerprint:      {c_run.code_fingerprint[:16]}...")
    print(f"  -> Findings Generated:    {0 if c_finding is None else 1}")

    if c_evidence:
        corr_json = EVIDENCE_DIR / "evidence_PAYMENT-004_corrected_pass.json"
        corr_json.write_text(
            json.dumps({
                "run_id": c_run.run_id,
                "requirement_id": "PAYMENT-004",
                "verdict": c_req.status.value,
                "exit_code": c_run.exit_code,
                "command": c_run.command,
                "start_time": c_run.start_time,
                "end_time": c_run.end_time,
                "concise_output": c_run.concise_output,
                "finding": None,
                "code_fingerprint": c_run.code_fingerprint,
                "test_fingerprint": c_run.test_fingerprint,
                "sha256": c_evidence[0].integrity_metadata.sha256,
                "raw_stdout": c_evidence[0].payload,
            }, indent=2),
            encoding="utf-8",
        )
        print(f"  -> Exported Evidence:     {corr_json.name}")

    # -------------------------------------------------------------
    # Scorecard
    # -------------------------------------------------------------
    print("\n" + "=" * 76)
    print("  VERIFICATION EVIDENCE SCORECARD")
    print("=" * 76)
    print(f"  {'Run Target':<28} | {'Exit':<5} | {'Status':<10} | {'Finding Generated'}")
    print("  " + "-" * 72)
    print(f"  {'Vulnerable Fixture':<28} | {v_run.exit_code:<5} | {v_req.status.value:<10} | {'YES [CRITICAL]' if v_finding else 'NO'}")
    print(f"  {'Corrected Implementation':<28} | {c_run.exit_code:<5} | {c_req.status.value:<10} | {'NO' if c_finding is None else 'YES'}")
    print("=" * 76)
    print("\n  Demonstration complete. Real evidence is sealed in SQLite and evidence/ JSON files.")


if __name__ == "__main__":
    run_demonstration()
