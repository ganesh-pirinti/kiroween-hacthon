export type VerificationStatus = 'VERIFIED' | 'VIOLATION' | 'BLOCKED' | 'UNVERIFIED';

export type ExecutionStatus = 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ArtifactType = 'PROCESS_LOG' | 'TEST_REPORT' | 'TRACE' | 'CODE_DIFF';

export interface AcceptanceCriterion {
  id: string;
  description: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: AcceptanceCriterion[];
  status: VerificationStatus;
  linked_tests: string[];
  latest_run_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RunSummary {
  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  unverified: number;
}

export interface VerificationRun {
  run_id: string;
  requirement_id: string;
  command: string;
  execution_status: ExecutionStatus;
  exit_code: number;
  duration_ms: number;
  start_time: string;
  end_time: string;
  timestamp: string;
  test_names: string[];
  concise_output: string;
  finding_ids: string[];
  summary: RunSummary;
  code_fingerprint: string;
  test_fingerprint: string;
  environment_info: Record<string, any>;
}

export interface Finding {
  finding_id: string;
  requirement_id: string;
  severity: FindingSeverity;
  explanation: string;
  reproduction_instructions: string;
  linked_evidence_ids: string[];
  created_at: string;
}

export interface Evidence {
  evidence_id: string;
  run_id: string;
  requirement_id: string;
  artifact_type: ArtifactType;
  source: string;
  timestamp: string;
  payload: string;
  integrity_metadata: {
    sha256: string;
    exit_code: number;
    extra: Record<string, any>;
  };
}

export interface SystemHealth {
  status: string;
  service: string;
  slogan: string;
  version: string;
  active_requirements: number;
  total_verification_runs: number;
  total_findings: number;
}

export interface DemonstrationResult {
  requirement_id: string;
  scenario: {
    initial_sender_balance: number;
    attempted_transfer: number;
    expected_outcome: string;
  };
  vulnerable_run: {
    run_id: string;
    exit_code: number;
    status: string;
    concise_output: string;
    finding?: Finding;
    evidence_id?: string;
  };
  corrected_run: {
    run_id: string;
    exit_code: number;
    status: string;
    concise_output: string;
    finding?: Finding;
    evidence_id?: string;
  };
}
