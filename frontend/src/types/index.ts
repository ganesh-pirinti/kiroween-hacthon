export type VerificationStatus = 'VERIFIED' | 'VIOLATION' | 'BLOCKED' | 'UNVERIFIED';

export type ExecutionStatus = 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';

export type FailureClassification =
  | 'NONE'
  | 'ASSERTION_FAILURE'
  | 'TEST_INFRASTRUCTURE_ERROR'
  | 'TIMEOUT'
  | 'BLOCKED_EXECUTION'
  | 'UNCOLLECTED_TESTS';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ArtifactType = 'PROCESS_LOG' | 'TEST_REPORT' | 'TRACE' | 'CODE_DIFF';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  linked_test?: string | null;
  status?: VerificationStatus;
}

export interface AdversarialScenario {
  scenario_id: string;
  requirement_id: string;
  title: string;
  description: string;
  category: 'boundary' | 'negative' | 'invariant' | 'concurrency' | string;
  test_target: string;
  executed: boolean;
  outcome?: VerificationStatus | null;
  last_run_id?: string | null;
  executed_at?: string | null;
}

export interface CriteriaCoverage {
  total_criteria: number;
  covered_criteria: number;
  uncovered_criteria: number;
  coverage_percentage: number;
  all_covered: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: AcceptanceCriterion[];
  status: VerificationStatus;
  linked_tests: string[];
  adversarial_scenarios?: AdversarialScenario[];
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
  failure_classification?: FailureClassification;
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
  run_id?: string;
  test_name?: string;
  severity: FindingSeverity;
  failure_classification?: FailureClassification;
  explanation: string;
  reproduction_instructions: string;
  code_fingerprint?: string;
  test_fingerprint?: string;
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

export interface EvidenceVerificationResult {
  evidence_id: string;
  run_id: string;
  requirement_id: string;
  sha256_valid: boolean;
  stored_digest: string;
  computed_digest: string;
  run_traced_in_database: boolean;
  integrity_sealed: boolean;
  verified_at: string;
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

export interface CoverageReport {
  total_requirements: number;
  total_criteria: number;
  covered_criteria: number;
  uncovered_criteria: number;
  overall_coverage_percentage: number;
  has_unverified_gaps: boolean;
  uncovered_items: Array<{
    requirement_id: string;
    criterion_id: string;
    description: string;
    status: string;
    reason: string;
  }>;
  requirements: Array<{
    requirement_id: string;
    title: string;
    status: string;
    total_criteria: number;
    covered_criteria: number;
    uncovered_criteria: number;
    coverage_percentage: number;
    has_coverage_gaps: boolean;
    uncovered_criteria_details: any[];
  }>;
}

export interface SuiteMetrics {
  suite_name: string;
  total_cases: number;
  seeded_defects_tested: number;
  clean_controls_tested: number;
  true_positives: number;
  false_negatives: number;
  true_negatives: number;
  false_positives: number;
  defect_detection_rate: number;
  false_negative_rate: number;
  specificity: number;
  accuracy: number;
}

export interface BenchmarkCaseResult {
  defect_id: string;
  name: string;
  target_requirement: string;
  is_defective: boolean;
  baseline_passed: boolean;
  baseline_detected_defect: boolean;
  baseline_classification: string;
  ghost_passed: boolean;
  ghost_detected_defect: boolean;
  ghost_classification: string;
  ghost_findings_count: number;
  summary: string;
}

export interface BenchmarkReport {
  benchmark_id: string;
  timestamp: string;
  execution_duration_ms: number;
  environment: Record<string, any>;
  baseline_metrics: SuiteMetrics;
  ghost_metrics: SuiteMetrics;
  comparative_advantage: {
    defect_detection_delta_percentage_points: number;
    false_negative_reduction_percentage_points: number;
    clean_control_specificity_maintained: boolean;
    conclusion: string;
  };
  case_results: BenchmarkCaseResult[];
  methodology: Record<string, string>;
}

export interface ImpactRequirement {
  requirement_id: string;
  title: string;
  verification_status: string;
  freshness_status: 'FRESH' | 'STALE_CODE' | 'STALE_TEST' | 'UNBOUND' | 'NO_RUNS';
  reason: string;
  needs_rerun: boolean;
  latest_run_id: string | null;
  last_verified_at: string | null;
  current_code_fingerprint: string;
  stored_code_fingerprint: string | null;
}

export interface ImpactAnalysisReport {
  timestamp: string;
  target_source_path: string;
  current_source_sha256: string;
  current_test_sha256: string;
  summary: {
    total_requirements: number;
    fresh_evidence: number;
    stale_evidence: number;
    unbound_requirements: number;
    all_fresh: boolean;
  };
  requirements: ImpactRequirement[];
}

export interface RiskRequirement {
  requirement_id: string;
  title: string;
  severity: string;
  status: string;
  risk_score: number;
  risk_category: 'CRITICAL RISK' | 'HIGH RISK' | 'MODERATE RISK' | 'LOW RISK';
  badge_color: 'red' | 'amber' | 'blue' | 'emerald';
  contributing_factors: string[];
  criteria_coverage: number;
  uncovered_criteria: number;
  freshness: string;
}

export interface RecommendedAction {
  priority: number;
  requirement_id: string;
  urgency: string;
  action: string;
  detail: string;
}

export interface RiskAnalysisReport {
  timestamp: string;
  overall_risk_posture: string;
  highest_priority_action: RecommendedAction | null;
  action_backlog: RecommendedAction[];
  risk_breakdown: RiskRequirement[];
}

export interface AuditReportResponse {
  format: 'markdown' | 'json';
  generated_at: string;
  content: any;
}

export interface CopilotProposal {
  proposal_id: string;
  criterion_id: string;
  type: string;
  title: string;
  description: string;
  suggested_test_path: string;
  status: string;
  evidential_weight: string;
}

export interface CopilotReport {
  requirement_id: string;
  title: string;
  is_unverified: boolean;
  total_proposals: number;
  proposals: CopilotProposal[];
  integrity_notice: string;
}

