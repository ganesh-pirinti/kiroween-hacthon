# GHOST PROTOCOL — Known Limitations & Architectural Boundaries

> **Status**: Production Assessment & Honest Engineering Disclosures  
> **Rule**: Do not declare an application production-ready merely because the demo works.

---

## 1. Scope & Domain Boundaries

### Financial Ledger Domain
- **Implemented Scope**: Ghost Protocol's current executable rules and adversarial fixtures focus on financial ledger transactions (single-currency integer/decimal transfers, non-negative balance enforcement, overdraft rejection, self-transfer prohibition, and monetary conservation).
- **Unimplemented Domains**: Multi-currency foreign exchange (FX) settlement, distributed two-phase commit transactions, high-throughput asynchronous message queues (e.g. Apache Kafka), and cross-border regulatory reporting are not implemented in the current milestone.

---

## 2. Process & Sandboxing Boundaries

### Operating System Subprocess Confinement
- **Implemented Isolation**: Test targets execute in isolated OS subprocesses (`subprocess.Popen` with argument vectors and `shell=False`). Targets are strictly confined to `backend/tests/` via Python `Path.resolve().relative_to()`. All targets are subject to a 30-second timeout ceiling and 64KB UTF-8 byte boundary output limits.
- **Limitation**: Subprocesses run with the permissions of the host user running Python. Ghost Protocol currently does not run test suites inside hardware-isolated microVMs (e.g. AWS Firecracker), Linux user namespaces/seccomp filters, or ephemeral Docker containers. Malicious code that attempts host-level resource exhaustion outside of Python execution bounds must be constrained by external OS containerization in multi-tenant environments.

---

## 3. Storage & Relational Database

### Local SQLite Persistence
- **Implemented Persistence**: Relational SQLite database (`evidence/evidence.db`) with `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`, and `PRAGMA busy_timeout = 30000;`. Thread-safe Python locking serializes concurrent verification runs.
- **Limitation**: SQLite is designed for single-node local developer tooling or low-concurrency internal environments. High-throughput multi-user enterprise deployments with distributed workers would require migrating the repository layer to PostgreSQL or CockroachDB with distributed locking (e.g. Redis Redlock).

---

## 4. Property-Based Testing Boundedness

### Hypothesis Invariant Limits
- **Implemented Tests**: Property-based invariant testing using Hypothesis (`test_property_payment.py`) explores thousands of pseudorandom transfer sequences to verify conservation ($\Delta S + \Delta R = 0$) and balance non-negativity.
- **Limitation**: Property testing explores a bounded subset of the infinite state space using deterministic random seeds (`seed=42`, `seed=1337`). While it mathematically disproves flawed logic where counterexamples exist, bounded property testing does not provide formal mathematical theorem proving (such as TLA+, Coq, or Lean 4).

---

## 5. Network & Authentication

### Local Deployment Focus
- **Implemented Controls**: State-mutating endpoints enforce loopback IP restrictions (`127.0.0.1`, `::1`, `localhost`) and strict CORS origins. Optional token authentication via `X-Ghost-Token` or `Authorization: Bearer` is supported via `GHOST_API_KEY`.
- **Limitation**: No OAuth2 / OIDC Single Sign-On (SSO), RBAC role hierarchies (e.g. Admin vs Auditor), or TLS termination is bundled into the development server. In production, Ghost Protocol must sit behind a reverse proxy (e.g. Nginx, Envoy, or Cloudflare Tunnel) providing TLS and enterprise identity verification.

---

## 6. Competition & Integration Disclosures

### Open REST Standards
- **Integrity Statement**: Ghost Protocol does not claim a proprietary or custom Kiro IDE plugin. It exposes standard REST/JSON endpoints and CLI scripts that can integrate with any modern editor, agentic coding workspace, or CI pipeline (including Kiro, Antigravity, VS Code, Cursor, or GitHub Actions).
