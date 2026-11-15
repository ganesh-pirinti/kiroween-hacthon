# GHOST PROTOCOL — Project Health Report

> **Prepared by**: Lead Software Architect (Inspection Mode — Read-Only)  
> **Date**: 2026-11-14  
> **Repository Root**: `c:\Users\Abhi\Desktop\kiro hackthon`  
> **Tagline**: *"AI says Done. We demand proof."*  
> **Inspection Scope**: All frontend, backend, API, tests, documentation, configuration, and scripts  
> **Action taken**: Zero file modifications, zero deletions, zero code additions

---

## 1. Folder Structure

```
kiro hackthon/
├── backend/
│   ├── app/
│   │   ├── engine/
│   │   │   ├── evaluator.py          # Orchestration: runs tests, generates findings, persists evidence
│   │   │   ├── runner.py             # Isolated subprocess execution with strict security controls
│   │   │   ├── sanitizer.py          # Regex-based secret scrubbing for stdout/stderr
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   ├── adversarial.py        # AdversarialScenario domain model
│   │   │   ├── evidence.py           # Evidence + IntegrityMetadata models
│   │   │   ├── finding.py            # Finding domain model
│   │   │   ├── requirement.py        # Requirement + AcceptanceCriterion models
│   │   │   ├── status.py             # VerificationStatus, ExecutionStatus, FailureClassification enums
│   │   │   ├── verification_run.py   # VerificationRun + RunSummary models
│   │   │   └── __init__.py
│   │   ├── storage/
│   │   │   ├── database.py           # SQLite connection manager and schema migrations
│   │   │   ├── repository.py         # Typed CRUD operations over SQLite
│   │   │   └── __init__.py
│   │   ├── evidence.py               # LEGACY: EvidenceRecord, EvidenceStore (Milestone 1)
│   │   ├── main.py                   # FastAPI application: all routes (V1 + legacy)
│   │   ├── payment.py                # Corrected PaymentService — the subject under verification
│   │   ├── security.py               # Loopback guard, API key auth, input validators
│   │   ├── verifier.py               # LEGACY: Verifier class + REQUIREMENTS_REGISTRY dict
│   │   └── __init__.py
│   ├── benchmarks/
│   │   ├── fixtures/
│   │   │   ├── clean_d0_golden_service.py
│   │   │   ├── defect_d1_no_overdraft_check.py
│   │   │   ├── defect_d2_non_atomic_failure.py
│   │   │   ├── defect_d3_allow_negative_amount.py
│   │   │   ├── defect_d4_allow_zero_amount.py
│   │   │   ├── defect_d5_allow_self_transfer.py
│   │   │   └── defect_d6_phantom_fee_leak.py
│   │   ├── suites/
│   │   │   ├── baseline_suite.py     # Happy-path tests (intentionally weak)
│   │   │   └── ghost_suite.py        # Adversarial verification suite
│   │   └── harness.py                # BenchmarkHarness + BenchmarkReport
│   └── tests/
│       ├── fixtures/
│       │   ├── vulnerable_payment.py # VulnerablePaymentService (deliberate defect fixture)
│       │   └── __init__.py
│       ├── conftest.py               # Shared pytest fixtures
│       ├── test_adversarial_vulnerable.py
│       ├── test_api_v1.py
│       ├── test_benchmark_harness.py
│       ├── test_comparison_engine.py
│       ├── test_coverage_and_adversarial.py
│       ├── test_failure_classification.py
│       ├── test_foundation.py
│       ├── test_payment.py
│       ├── test_property_payment.py
│       ├── test_security_review.py
│       └── test_verifier.py          # Tests for the LEGACY Verifier class
├── frontend/
│   ├── dist/                         # Compiled production build (pre-built)
│   ├── src/
│   │   ├── components/
│   │   │   ├── BenchmarkModal.tsx
│   │   │   ├── DemonstrationModal.tsx
│   │   │   ├── EvidenceViewer.tsx
│   │   │   ├── FindingsList.tsx
│   │   │   ├── InvestigationDetail.tsx
│   │   │   ├── InvestigationOverview.tsx
│   │   │   ├── RequirementsExplorer.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── StatusGlossaryModal.tsx
│   │   ├── services/
│   │   │   └── api.ts                # Typed API client using fetch()
│   │   ├── test/
│   │   │   ├── RequirementsExplorer.test.tsx
│   │   │   ├── StatusBadge.test.tsx
│   │   │   └── setup.ts
│   │   ├── types/
│   │   │   └── index.ts              # Complete TypeScript type definitions
│   │   ├── App.tsx                   # Root component; all state lives here
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts                # Vite + Vitest config; proxy /api → :8000
├── docs/
│   ├── api_contracts.md
│   ├── architecture.md
│   ├── benchmark_report.md
│   ├── DEMO_SCRIPT.md
│   ├── implementation_plan.md
│   ├── KNOWN_LIMITATIONS.md
│   ├── SCREENSHOT_CHECKLIST.md
│   ├── security_and_testing_strategy.md
│   └── SUBMISSION_DESCRIPTION.md
├── evidence/
│   ├── agent_completion_claim.json   # Mock AI agent claim for demo narrative
│   ├── benchmark_report_*.json       # Pre-generated benchmark run artifacts
│   ├── evidence.db                   # SQLite audit ledger
│   ├── evidence_full_test_suite_pass.json
│   ├── evidence_PAYMENT-004_corrected_pass.json
│   └── evidence_PAYMENT-004_vulnerable_fail.json
├── requirements/
│   ├── catalog.json                  # Machine-readable requirements registry (source of truth)
│   ├── PAYMENT-004.md
│   └── requirements.md
├── scripts/
│   ├── demonstrate_bug.py            # CLI demonstration: vulnerable vs corrected run
│   └── run_benchmark.py              # CLI benchmark runner
├── .env.example
├── .gitignore
├── FINAL_SUBMISSION_AUDIT.md
├── NIGHT_RUN_LOG.md
├── NIGHT_RUN_QUEUE.md
├── pytest.ini
├── README.md
├── requirements.md
└── requirements.txt
```

---

## 2. Components

### Backend Components

| Component | File | Role |
|---|---|---|
| **FastAPI App** | `backend/app/main.py` | 30+ REST endpoints across V1 and legacy namespaces |
| **VerificationEvaluator** | `backend/app/engine/evaluator.py` | Orchestrates test execution, state transitions, finding generation, evidence persistence |
| **SubprocessRunner** | `backend/app/engine/runner.py` | Isolated subprocess execution with allowlist, path confinement, output limits, timeout |
| **SecretSanitizer** | `backend/app/engine/sanitizer.py` | Regex scrubs API keys, Bearer tokens, AWS keys, DB URLs, PEM blocks from logs |
| **StorageRepository** | `backend/app/storage/repository.py` | Typed SQLite CRUD: requirements, runs, evidence, findings |
| **Database** | `backend/app/storage/database.py` | SQLite schema init, WAL mode, foreign keys, defensive column migrations |
| **PaymentService** | `backend/app/payment.py` | The verified subject: account management + atomic transfer with overdraft guard |
| **Security** | `backend/app/security.py` | Loopback enforcement, API key verification, ID/slug input validation |
| **BenchmarkHarness** | `backend/benchmarks/harness.py` | 7-fixture benchmark computing TP/FP/TN/FN confusion matrix for two test suites |
| **Legacy Verifier** | `backend/app/verifier.py` | Milestone 1 verifier, still active via legacy endpoints |
| **Legacy EvidenceStore** | `backend/app/evidence.py` | Milestone 1 SQLite store, runs in parallel with the V1 storage layer |

### Frontend Components

| Component | File | Role |
|---|---|---|
| **App** | `src/App.tsx` | Root; all application state, all event handlers — a 280-line monolith |
| **InvestigationOverview** | `src/components/InvestigationOverview.tsx` | 4-state status grid + action buttons (Verify All, Demo, Benchmark, Glossary) |
| **RequirementsExplorer** | `src/components/RequirementsExplorer.tsx` | Searchable, filterable requirements list |
| **InvestigationDetail** | `src/components/InvestigationDetail.tsx` | Per-requirement criteria, adversarial scenarios, run history |
| **EvidenceViewer** | `src/components/EvidenceViewer.tsx` | Raw stdout/stderr viewer, SHA-256 digest, reproduction command, timestamps |
| **FindingsList** | `src/components/FindingsList.tsx` | Active violation findings with severity and reproduction instructions |
| **DemonstrationModal** | `src/components/DemonstrationModal.tsx` | Side-by-side vulnerable vs corrected run results |
| **BenchmarkModal** | `src/components/BenchmarkModal.tsx` | Benchmark scorecard + fixture-by-fixture confusion matrix table |
| **StatusBadge** | `src/components/StatusBadge.tsx` | Reusable 4-state status chip (VERIFIED / VIOLATION / BLOCKED / UNVERIFIED) |
| **StatusGlossaryModal** | `src/components/StatusGlossaryModal.tsx` | Reference modal explaining the four state machine states |

---

## 3. APIs

The backend exposes **two parallel API namespaces**. Both are live simultaneously.

### V1 Endpoints (`/api/v1/`) — Primary Canonical API

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | No | Root health (also at `/api/v1/health`) |
| `GET` | `/api/v1/health` | No | Health + catalog statistics |
| `GET` | `/api/v1/requirements` | No | List all requirements, optional `?status=` filter |
| `GET` | `/api/v1/requirements/{id}` | No | Single requirement detail |
| `POST` | `/api/v1/verify/{id}` | Loopback | Execute test suite for a requirement |
| `POST` | `/api/v1/verify-all` | Loopback | Verify all requirements sequentially |
| `GET` | `/api/v1/runs` | No | List verification runs, optional `?requirement_id=` |
| `GET` | `/api/v1/runs/{run_id}` | No | Single run detail |
| `GET` | `/api/v1/evidence/{evidence_id}` | No | Retrieve evidence artifact |
| `GET` | `/api/v1/evidence/{evidence_id}/verify` | No | Cryptographic tamper-check endpoint |
| `GET` | `/api/v1/findings` | No | List findings, optional `?requirement_id=`, `?severity=` |
| `GET` | `/api/v1/coverage` | No | Overall criteria coverage report |
| `GET` | `/api/v1/coverage/{requirement_id}` | No | Per-requirement coverage detail |
| `GET` | `/api/v1/adversarial-scenarios` | No | List adversarial scenario definitions |
| `GET` | `/api/v1/scenarios` | No | List comparable demo scenarios |
| `POST` | `/api/v1/compare/{scenario_id}` | Loopback | Before-and-after comparison execution |
| `POST` | `/api/v1/demonstrate/vulnerable-vs-corrected` | Loopback | PAYMENT-004 demo: vulnerable vs corrected |
| `POST` | `/api/v1/benchmark/run` | Loopback | Execute the 7-fixture benchmark harness |
| `GET` | `/api/v1/benchmark/latest` | No | Retrieve or auto-generate the latest benchmark report |

### Legacy Endpoints (`/api/`) — Milestone 1 Compatibility Layer

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Legacy health check |
| `GET` | `/api/requirements` | Legacy requirements list (uses in-memory REQUIREMENTS_REGISTRY) |
| `GET` | `/api/requirements/{id}` | Legacy single requirement |
| `POST` | `/api/verify/{id}` | Legacy verification (runs legacy Verifier, stores in legacy EvidenceStore) |
| `POST` | `/api/verify-all` | Legacy bulk verification |
| `GET` | `/api/evidence` | Legacy evidence list |
| `GET` | `/api/evidence/{id}` | Legacy evidence detail |

> **Note**: The legacy API and the V1 API both write to `evidence/evidence.db` but write to **different tables** (`evidence_records` vs `evidence_artifacts`). They operate independently without interference.

---

## 4. Database

**Engine**: SQLite 3  
**Path**: `evidence/evidence.db`  
**Mode**: WAL (Write-Ahead Logging), foreign keys enforced, 30-second busy timeout

### Schema — V1 Storage Layer

| Table | Primary Key | Description |
|---|---|---|
| `requirements` | `id TEXT` | Requirement specs, status, criteria JSON, test links, adversarial scenarios JSON |
| `verification_runs` | `run_id TEXT` | Full run audit: command, timestamps, exit code, finding IDs, fingerprints |
| `evidence_artifacts` | `evidence_id TEXT` | Immutable process output, SHA-256 integrity digest, FK to `verification_runs` |
| `findings` | `finding_id TEXT` | Defect records with explanation, reproduction instructions, fingerprints, FK to `requirements` |

### Schema — Legacy Storage Layer (same DB file)

| Table | Primary Key | Description |
|---|---|---|
| `evidence_records` | `evidence_id TEXT` | Milestone 1 evidence: verdict, command, payload JSON |

### Schema Properties
- `acceptance_criteria`, `linked_tests`, `adversarial_scenarios`, `test_names`, `finding_ids` are stored as **JSON strings** in TEXT columns (no normalization).
- `verification_runs` has `environment_info`, `summary` stored as JSON TEXT.
- Defensive column migrations are applied on every startup (via `PRAGMA table_info` checks).

---

## 5. Data Flow Through the Application

```
User clicks "Verify Requirement" in the React UI
    │
    └─▶  POST /api/v1/verify/{id}  (via Vite dev-proxy → FastAPI :8000)
              │
              ├─ [Security] enforce_local_access_control()
              │       Checks: client IP in LOOPBACK_HOSTS, API key if GHOST_API_KEY set
              │
              ├─ [Security] validate_requirement_id(id)
              │       Regex: ^[A-Z0-9]+-[A-Z0-9]+$  — rejects all injection attempts
              │
              └─▶  evaluator.verify_requirement(requirement_id)
                        │
                        ├─ [Lock] threading.Lock() — serializes concurrent runs
                        │
                        ├─ repo.get_requirement(id)  ← SQLite SELECT
                        │
                        ├─ If no linked_tests → status = UNVERIFIED, exit (no subprocess)
                        │
                        └─▶  runner.execute_target(target_path)
                                  │
                                  ├─ Security checks:
                                  │     Reject if starts with '-' (flag injection)
                                  │     Reject if contains metacharacters
                                  │     Resolve path → must be inside backend/tests/
                                  │     Must end with .py and exist on disk
                                  │
                                  ├─ Build clean env: { PATH, PYTHONPATH, SYSTEMROOT, TEMP, TMP }
                                  │     (strips all other env vars including secrets)
                                  │
                                  ├─ subprocess.run(["python", "-m", "pytest", target, ...],
                                  │     shell=False, cwd=project_root, timeout=30s, capture_output=True)
                                  │
                                  ├─ stdout/stderr → sanitize_text() → truncate to 64KB
                                  │
                                  └─▶  ExecutionResult { exit_code, stdout, stderr,
                                            start_time, end_time, duration_ms,
                                            code_fingerprint (SHA-256 of payment.py),
                                            test_fingerprint (SHA-256 of test file),
                                            failure_classification }
                        │
                        ├─ Exit 0  → VERIFIED (if all criteria covered) or UNVERIFIED
                        ├─ Exit 1  → VIOLATION  → generate CRITICAL/HIGH Finding
                        ├─ Exit 5  → UNVERIFIED (0 tests collected)
                        ├─ Timeout → BLOCKED    → generate HIGH Finding
                        └─ Other   → BLOCKED    → generate HIGH Finding
                        │
                        ├─ repo.save_verification_run(run)
                        ├─ repo.save_evidence(evidence)        ← SHA-256 of payload
                        ├─ repo.save_finding(finding)          ← if any
                        └─ repo.upsert_requirement(req)        ← status update
                        │
              └─▶  Return { requirement, run, finding, evidence } as JSON
                        │
    └─▶  React updates state → re-renders RequirementsExplorer, InvestigationDetail, EvidenceViewer
```

**Benchmark flow** (entirely in-process, no subprocess):
```
BenchmarkModal → api.runBenchmark() → POST /api/v1/benchmark/run
  → harness.run_benchmark()
      Loops over 7 fixture classes
        run_baseline_tests(fixture_instance)      → happy-path check (pure Python)
        run_ghost_verification(fixture_instance)  → adversarial assertions (pure Python)
      Builds SuiteMetrics (TP/FP/TN/FN, recall, specificity, accuracy)
  → Returns BenchmarkReport JSON
```

---

## 6. Security Architecture

### Protections In Place

1. **Loopback Confinement**: All state-modifying endpoints (`POST /api/v1/verify/*`, etc.) reject requests from non-loopback IPs (`enforce_local_access_control` dependency).
2. **Input Validation**: All path parameters are validated against strict regexes before use (`^[A-Z0-9]+-[A-Z0-9]+$` for requirement IDs, `^run-[a-zA-Z0-9_-]+$` for run IDs, `^ev-[a-zA-Z0-9_-]+$` for evidence IDs).
3. **Subprocess Allowlist + Path Confinement**: `SubprocessRunner.execute_target()` performs five sequential checks before any subprocess is launched: flag injection, metacharacter check, path resolution containment to `backend/tests/`, `.py` extension requirement, and file existence.
4. **No `shell=True`**: All subprocess invocations use argument vectors, preventing shell injection.
5. **Environment Sanitization**: Only `PATH`, `PYTHONPATH`, `SYSTEMROOT`, `TEMP`, and `TMP` are passed to child processes. No secrets from the host environment are inherited.
6. **Secret Scrubbing**: `sanitize_text()` applies 7 regex patterns before stdout/stderr is stored: API keys, Bearer tokens, AWS IDs, GitHub tokens, OpenAI/Anthropic keys, PEM blocks, and database URLs with passwords.
7. **Output Ceiling**: `_limit_output()` enforces 64KB UTF-8 byte limit on subprocess output with graceful truncation.
8. **30-second Timeout**: All subprocess runs are hard-terminated after 30 seconds.
9. **CORS Restriction**: CORS is configured with explicit origin allowlist; no wildcard `*` with credentials.
10. **Cryptographic Tamper Detection**: Evidence artifacts carry a SHA-256 digest of their payload; `GET /api/v1/evidence/{id}/verify` recomputes and compares on demand.
11. **Thread Safety**: `VerificationEvaluator` uses `threading.Lock()` to serialize concurrent verification runs, preventing SQLite write collisions.

### Security Concerns

| Issue | Severity | Location | Description |
|---|---|---|---|
| **No HTTPS in dev server** | Medium | `main.py` | FastAPI runs over plain HTTP. Mitigated in local context but must be noted for any network exposure. |
| **Global mutable `latest_benchmark_report`** | Low | `main.py` line ~55 | Module-level global is not thread-safe. Under concurrent requests it could be read while being overwritten. |
| **Legacy API has no loopback enforcement** | Medium | `main.py` legacy routes | `/api/verify/{id}` and `/api/verify-all` do **not** use the `enforce_local_access_control` dependency. The V1 routes are protected; the legacy routes are not. |
| **SQLite single-file no encryption** | Low | `evidence/evidence.db` | Audit ledger is unencrypted on disk. Acceptable for local tooling but would need field-level encryption or filesystem encryption in multi-user environments. |
| **SAFE_TARGET_REGEX allows `/`** | Low | `runner.py` | `SAFE_TARGET_REGEX` (`^[a-zA-Z0-9_\-\./:]+$`) permits forward slashes, which is correct for pytest paths but means path containment logic must be airtight (it currently is). |
| **`Database()` called without path in tamper test** | Medium | `test_security_review.py` line ~170 | The tamper-detection test calls `Database()` with no arguments, which opens the production `evidence/evidence.db` rather than the test's temporary database. This means the tamper test modifies the production database during the test run. |

---

## 7. Performance Issues

| Issue | Severity | Location | Description |
|---|---|---|---|
| **Sequential verify-all** | Medium | `main.py` → `verify_all_v1()` | Iterates over all requirements serially, each launching a subprocess. 6 requirements × ~1–2s each = 6–12 second blocking request. No async or parallel execution. |
| **Global lock on evaluator** | Medium | `evaluator.py` → `threading.Lock()` | A single module-level lock serializes all verification runs. Concurrent API calls for different requirements queue behind one another. |
| **Benchmark on every `/benchmark/latest` cold call** | Low | `main.py` → `get_latest_benchmark_report()` | If `latest_benchmark_report` is `None` (e.g. after server restart), the GET endpoint triggers a full benchmark execution synchronously on the first request. This is a ~100ms operation but unexpected for a GET. |
| **No pagination on evidence/findings** | Low | `repository.py` | List queries have a hard `limit` parameter (default 50, max 200), but callers like `health_v1()` call `list_verification_runs(limit=500)` and `list_findings(limit=500)`, loading everything into memory on every health check. |
| **Health check issues large queries** | Low | `main.py` → `health_v1()` | The health endpoint fetches up to 500 runs and 500 findings on every call solely to report their counts. A `SELECT COUNT(*)` would be O(1) instead of O(n). |
| **In-process benchmark (no subprocess isolation)** | Low | `harness.py` | Benchmark tests call fixture classes directly in-process rather than via subprocess. This is fast and correct for the benchmark, but means a crashing fixture would crash the FastAPI process. |
| **Frontend evidence loading race** | Low | `App.tsx` useEffect | When `selectedRunId` changes, the effect fetches evidence but the evidence fetch makes an unused `fetch()` call to the run endpoint (lines ~115–124) that does nothing with the result. This is dead code that fires an extra HTTP request. |
| **No React.memo / useMemo on deep component trees** | Low | Multiple components | Components like `FindingsList` and `InvestigationDetail` receive arrays via props and re-render fully on any parent state change. The `RequirementsExplorer` correctly uses `useMemo` for filtering, but the others do not. |

---

## 8. Duplicate Code

| Issue | Location | Description |
|---|---|---|
| **Two parallel evidence storage systems** | `backend/app/evidence.py` (EvidenceStore) + `backend/app/storage/repository.py` (StorageRepository) | Both open the same `evidence/evidence.db` file. `EvidenceStore` writes to `evidence_records` table; `StorageRepository` writes to `evidence_artifacts`. Both have `_init_db()`, SHA-256 hash logic, and SQLite connection management. This is the most significant duplication in the codebase. |
| **Two parallel verifiers** | `backend/app/verifier.py` (Verifier + REQUIREMENTS_REGISTRY) + `backend/app/engine/evaluator.py` (VerificationEvaluator) + `requirements/catalog.json` | There are three sources of requirement definitions: the in-memory `REQUIREMENTS_REGISTRY` dict in `verifier.py`, the `catalog.json` file, and whatever is in SQLite. These can diverge. |
| **`calculate_file_hash` / `calculate_sha256` duplicated** | `backend/app/evidence.py:calculate_file_hash()` and `backend/app/engine/runner.py:calculate_sha256()` | Identical function (SHA-256 of a file) defined in two places with different names. |
| **`payment_service` fixture in two places** | `backend/tests/conftest.py` and `backend/tests/test_payment.py` | Both define a `payment_service()` fixture returning a fresh `PaymentService`. The one in `test_payment.py` shadows the one in `conftest.py` for that module. |
| **Scenario lookup logic duplicated** | `backend/app/main.py:demonstrate_vulnerable_vs_corrected()` and `backend/app/engine/evaluator.py:compare_scenario()` | Both hardcode the same PAYMENT-004 target paths and produce structurally similar result dictionaries. The `/demonstrate/` endpoint exists alongside `/compare/` and they overlap in purpose. |
| **Health check defined twice** | `main.py` → `health_root()` at `/health` and `health_v1()` at `/api/v1/health` | Functionally equivalent, one with extra statistics. |
| **`APPROVED_TARGETS` dict in runner.py vs linked_tests in catalog.json** | `backend/app/engine/runner.py` and `requirements/catalog.json` | Test target mappings are defined in both places and must be manually kept in sync. If `catalog.json` is updated, `APPROVED_TARGETS` must also be updated manually. |

---

## 9. Missing Tests

### Backend

| Gap | Description |
|---|---|
| **`sanitize_text()` edge cases** | Only one test covers sanitization (in `test_security_review.py`). Missing: empty string input, None input, text that partially matches patterns, PEM block redaction, database URL with no password. |
| **`EvidenceStore` list_records filtering** | `verdict` and `requirement_id` filter combinations are not tested. |
| **Legacy API loopback gap** | No test asserts that `/api/verify/{id}` (legacy) is **not** blocked from remote IPs the way V1 endpoints are. |
| **`verify-all` V1 endpoint** | `POST /api/v1/verify-all` is not covered by `test_api_v1.py`. |
| **`/api/v1/coverage/{requirement_id}` per-requirement API** | The endpoint exists but has no dedicated test in `test_api_v1.py`. |
| **`/api/v1/adversarial-scenarios` API** | Not tested in `test_api_v1.py`. |
| **`/api/v1/scenarios` API** | Not tested. |
| **Benchmark fixtures correctness** | The 6 defect fixture files (`defect_d1` through `defect_d6`) have no independent unit tests verifying that each fixture actually exhibits its stated defect. The harness tests this indirectly, but isolating each fixture's behavior would make failures clearer. |
| **`SubprocessRunner._extract_concise_summary()`** | No unit test for the concise summary extraction logic. |
| **Requirement model `get_coverage()` method** | No unit test for `Requirement.get_coverage()` directly. |
| **Concurrent benchmark calls** | No test for concurrent `BenchmarkHarness.run_benchmark()` calls. |
| **`StorageRepository.sync_catalog()` with conflicting existing data** | Only the happy path is tested (new catalog on empty DB). No test for syncing over existing requirements that have been partially verified. |

### Frontend

| Gap | Description |
|---|---|
| **`App.tsx` integration** | No tests for the root `App` component. All state management, `handleVerifyRequirement`, `handleVerifyAll`, `handleRunDemonstration`, the two `useEffect` hooks, and error state are untested. |
| **`EvidenceViewer` component** | No tests. |
| **`InvestigationDetail` component** | No tests. |
| **`InvestigationOverview` component** | No tests. |
| **`FindingsList` component** | No tests. |
| **`DemonstrationModal` component** | No tests. |
| **`BenchmarkModal` component** | No tests. |
| **`StatusGlossaryModal` component** | No tests. |
| **`api.ts` service layer** | No tests. All API calls (`getRequirements`, `verifyRequirement`, `runBenchmark`, etc.) are untested. HTTP error paths, the `fetchJson` error extraction logic, and query string construction are all uncovered. |
| **Keyboard navigation** | `RequirementsExplorer` and `InvestigationDetail` have `onKeyDown` handlers; only click interactions are tested. |

---

## 10. Missing Documentation

| Gap | Location | Description |
|---|---|---|
| **No `CONTRIBUTING.md`** | Root | No guide for adding new requirements, new test targets, or new defect fixtures. The process for extending `catalog.json` and `APPROVED_TARGETS` simultaneously is not documented anywhere. |
| **No inline docstring on `BenchmarkModal`** | `frontend/src/components/BenchmarkModal.tsx` | No JSDoc on the component or its props. All other components also lack JSDoc but `BenchmarkModal` is the most complex. |
| **`ghost_suite.py` not read** | `backend/benchmarks/suites/ghost_suite.py` | This file was not explicitly inspected. If it contains `run_ghost_verification`, its internals and any edge cases are undocumented. |
| **Legacy API deprecation policy** | `backend/app/main.py` | Legacy endpoints are live alongside V1 but there is no deprecation notice in the code, no `Deprecated` tag in the FastAPI route, and no documentation on when they will be removed. |
| **No ADR (Architecture Decision Records)** | `docs/` | Decisions such as "why SQLite over PostgreSQL," "why two storage layers," "why the legacy verifier was kept" are not recorded. |
| **`APPROVED_TARGETS` extension process** | `backend/app/engine/runner.py` | The dict is used as a secondary allowlist, but there is no documentation on when to add entries here vs relying solely on `catalog.json` linked_tests. |
| **Frontend environment variables** | `frontend/` | There is no `frontend/.env` or `frontend/.env.example` explaining `VITE_API_URL`. The README mentions it but the frontend directory itself has no env template. |
| **No OpenAPI client generation guide** | `docs/api_contracts.md` | The file exists but whether it documents client generation (e.g. `openapi-generator`) is not verified. The FastAPI app auto-generates `/docs` (Swagger UI) but this is not explicitly highlighted for integrators. |

---

## 11. Recommended Implementation Order

The following improvements are listed in dependency order: foundational issues first, then features, then polish.

### Priority 1 — Structural / Correctness Issues (Address First)

1. **Fix the tamper-detection test** (`test_security_review.py` ~line 170): `Database()` called without a path argument modifies the production `evidence/evidence.db` during the test run. It should use `tmp_path` like every other test in that file.

2. **Add loopback guard to legacy POST endpoints**: `/api/verify/{id}` and `/api/verify-all` currently have no `enforce_local_access_control` dependency. This is the only security gap in an otherwise well-defended surface.

3. **Consolidate `calculate_file_hash` / `calculate_sha256`**: Remove the duplicate function in `evidence.py`. Both modules should import from a single utility.

4. **Remove the duplicate `payment_service` fixture** in `test_payment.py` and rely solely on `conftest.py`.

### Priority 2 — Architecture Cleanup (High Value)

5. **Consolidate the two storage systems**: The legacy `EvidenceStore` (`evidence.py`) and the V1 `StorageRepository` (`storage/repository.py`) both own tables in the same SQLite file. The legacy system should be refactored to read from the V1 tables (or the legacy endpoints should be formally deprecated with a sunset date). This eliminates the most significant duplicate code in the codebase.

6. **Eliminate the `REQUIREMENTS_REGISTRY` dict in `verifier.py`**: The single source of truth for requirements should be `catalog.json` → SQLite. The in-memory dict is a maintenance hazard because it can diverge from `catalog.json`. The legacy `Verifier` should read from the repository rather than from the hardcoded dict.

7. **Merge `APPROVED_TARGETS` with `catalog.json`**: Runner's `APPROVED_TARGETS` dict duplicates the `linked_tests` values already in `catalog.json`. The runner could validate using `catalog.json` as the allowlist source.

### Priority 3 — Performance Improvements

8. **Replace full-table fetches in `health_v1()`** with `SELECT COUNT(*)` queries. The health endpoint currently loads up to 500 run and finding records into memory on every heartbeat ping.

9. **Parallelize `verify-all`**: Use `ThreadPoolExecutor` to run requirement verifications concurrently instead of sequentially. The lock in `VerificationEvaluator` already handles thread safety.

10. **Cache benchmark report** properly: Store the latest report in SQLite (or at minimum in a file) so it survives server restarts. Triggering a full benchmark execution on the first GET `/benchmark/latest` after restart is unexpected behavior.

### Priority 4 — Test Coverage

11. **Add `App.tsx` integration test** covering: initial data load, `handleVerifyRequirement`, error state display, and `handleRunDemonstration`.

12. **Add tests for the 7 missing frontend components** (`EvidenceViewer`, `InvestigationDetail`, `InvestigationOverview`, `FindingsList`, `DemonstrationModal`, `BenchmarkModal`, `StatusGlossaryModal`).

13. **Add `api.ts` unit tests** using `msw` (Mock Service Worker) or `vi.stubGlobal('fetch', ...)` to cover HTTP error paths and query string construction.

14. **Add `V1 verify-all` and coverage API endpoint tests** to `test_api_v1.py`.

15. **Add direct unit tests for each benchmark fixture** (`defect_d1` through `defect_d6`) asserting the specific defective behavior in isolation.

### Priority 5 — Documentation & Developer Experience

16. **Add `CONTRIBUTING.md`** documenting the full workflow for adding a new requirement: (a) add to `catalog.json`, (b) add test to `backend/tests/`, (c) add to `APPROVED_TARGETS` in `runner.py`, (d) run `sync_catalog`.

17. **Add `frontend/.env.example`** with `VITE_API_URL=http://localhost:8000` to match the README instructions.

18. **Mark legacy endpoints as deprecated** using FastAPI `deprecated=True` parameter on the route decorators, so the auto-generated `/docs` communicates their status to integrators.

19. **Add `Hypothesis` to `requirements.txt`**: The property tests in `test_property_payment.py` currently use the `random` module with deterministic seeds rather than Hypothesis, so this is not a blocking issue — but if Hypothesis is intended for future use (as `KNOWN_LIMITATIONS.md` references it), it should be declared.

---

## 12. Summary Scorecard

| Dimension | Rating | Notes |
|---|---|---|
| **Core Functionality** | ★★★★★ | The zero-trust verification engine, four-state machine, and evidence sealing work correctly and are well-tested |
| **Security Architecture** | ★★★★☆ | Strong subprocess confinement, input validation, and secret scrubbing. One gap: legacy POST endpoints lack loopback guard |
| **Backend Test Coverage** | ★★★★☆ | 60 tests across 11 modules; several API endpoints and edge cases are untested |
| **Frontend Test Coverage** | ★★☆☆☆ | Only 2 of 9 components are tested; `App.tsx` and `api.ts` have zero coverage |
| **Code Duplication** | ★★★☆☆ | Two parallel storage systems, two verifier implementations, and two SHA-256 utility functions are the main offenders |
| **Documentation** | ★★★★☆ | Thorough README, architecture doc, and demo scripts. Missing: contributing guide, deprecation policy, frontend env template |
| **Performance** | ★★★☆☆ | Correct for a single-user local tool. Sequential verify-all, oversized health queries, and unprotected global state need attention before any multi-user use |
| **Architecture Clarity** | ★★★☆☆ | The V1 engine is clean; the legacy layer coexists unnecessarily and obscures the intended architecture |
