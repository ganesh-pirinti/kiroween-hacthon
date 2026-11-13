import {
  DemonstrationResult,
  Evidence,
  Finding,
  Requirement,
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

  getEvidence: (evidenceId: string): Promise<Evidence> =>
    fetchJson<Evidence>(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}`),

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
};
