import {
  AdversarialScenario,
  AuditReportResponse,
  BenchmarkReport,
  CopilotReport,
  CoverageReport,
  DemonstrationResult,
  Evidence,
  Finding,
  ImpactAnalysisReport,
  Requirement,
  RiskAnalysisReport,
  SystemHealth,
  VerificationRun,
  VerificationStatus,
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errorDetail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  getHealth: (): Promise<SystemHealth> => fetchJson<SystemHealth>(`${API_BASE}/health`),

  getRequirements: (status?: VerificationStatus): Promise<Requirement[]> => {
    const url = status ? `${API_BASE}/requirements?status=${status}` : `${API_BASE}/requirements`;
    return fetchJson<Requirement[]>(url);
  },

  getRequirement: (id: string): Promise<Requirement> =>
    fetchJson<Requirement>(`${API_BASE}/requirements/${encodeURIComponent(id)}`),

  verifyRequirement: (
    id: string
  ): Promise<{
    requirement: Requirement;
    run: VerificationRun;
    finding?: Finding;
    evidence?: Evidence;
  }> =>
    fetchJson(`${API_BASE}/verify/${encodeURIComponent(id)}`, {
      method: 'POST',
    }),

  verifyAll: (): Promise<{ total: number; scorecard: Record<string, number>; details: any[] }> =>
    fetchJson(`${API_BASE}/verify-all`, { method: 'POST' }),

  getRuns: (requirementId?: string): Promise<VerificationRun[]> => {
    const url = requirementId
      ? `${API_BASE}/runs?requirement_id=${encodeURIComponent(requirementId)}`
      : `${API_BASE}/runs`;
    return fetchJson<VerificationRun[]>(url);
  },

  getRun: (runId: string): Promise<VerificationRun> =>
    fetchJson<VerificationRun>(`${API_BASE}/runs/${encodeURIComponent(runId)}`),

  getRunEvidence: (runId: string): Promise<Evidence[]> =>
    fetchJson<Evidence[]>(`${API_BASE}/runs/${encodeURIComponent(runId)}/evidence`),

  getEvidence: (evidenceId: string): Promise<Evidence> =>
    fetchJson<Evidence>(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}`),

  verifyEvidenceIntegrity: (
    evidenceId: string
  ): Promise<{
    evidence_id: string;
    run_id: string;
    requirement_id: string;
    sha256_valid: boolean;
    stored_digest: string;
    computed_digest: string;
    run_traced_in_database: boolean;
    integrity_sealed: boolean;
    verified_at: string;
  }> =>
    fetchJson(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}/verify`),

  getFindings: (requirementId?: string): Promise<Finding[]> => {
    const url = requirementId
      ? `${API_BASE}/findings?requirement_id=${encodeURIComponent(requirementId)}`
      : `${API_BASE}/findings`;
    return fetchJson<Finding[]>(url);
  },

  runDemonstration: (): Promise<DemonstrationResult> =>
    fetchJson<DemonstrationResult>(`${API_BASE}/demonstrate/vulnerable-vs-corrected`, {
      method: 'POST',
    }),

  getCoverage: (): Promise<CoverageReport> =>
    fetchJson<CoverageReport>(`${API_BASE}/coverage`),

  getAdversarialScenarios: (requirementId?: string): Promise<AdversarialScenario[]> => {
    const url = requirementId
      ? `${API_BASE}/adversarial-scenarios?requirement_id=${encodeURIComponent(requirementId)}`
      : `${API_BASE}/adversarial-scenarios`;
    return fetchJson<AdversarialScenario[]>(url);
  },

  compareScenario: (scenarioId: string): Promise<any> =>
    fetchJson(`${API_BASE}/compare/${encodeURIComponent(scenarioId)}`, {
      method: 'POST',
    }),

  runBenchmark: (): Promise<BenchmarkReport> =>
    fetchJson<BenchmarkReport>(`${API_BASE}/benchmark/run`, {
      method: 'POST',
    }),

  getLatestBenchmark: (): Promise<BenchmarkReport> =>
    fetchJson<BenchmarkReport>(`${API_BASE}/benchmark/latest`),

  getImpactAnalysis: (): Promise<ImpactAnalysisReport> =>
    fetchJson<ImpactAnalysisReport>(`${API_BASE}/impact/analysis`),

  getRiskAnalysis: (): Promise<RiskAnalysisReport> =>
    fetchJson<RiskAnalysisReport>(`${API_BASE}/risk/analysis`),

  getAuditReport: (format: 'markdown' | 'json' = 'markdown'): Promise<AuditReportResponse> =>
    fetchJson<AuditReportResponse>(`${API_BASE}/audit/report?format=${format}`),

  getCopilotStatus: (): Promise<any> =>
    fetchJson(`${API_BASE}/ai-copilot/status`),

  getCopilotProposals: (requirementId: string): Promise<CopilotReport> =>
    fetchJson<CopilotReport>(`${API_BASE}/ai-copilot/proposals/${encodeURIComponent(requirementId)}`),
};
