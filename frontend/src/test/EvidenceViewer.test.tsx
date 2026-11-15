import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { Evidence, VerificationRun } from '../types';

const mockRun: VerificationRun = {
  run_id: 'run-20261115-test1234',
  requirement_id: 'PAYMENT-004',
  command: 'python -m pytest backend/tests/test_payment.py -v',
  execution_status: 'COMPLETED',
  exit_code: 0,
  duration_ms: 120.5,
  start_time: '2026-11-15T09:00:00Z',
  end_time: '2026-11-15T09:00:00.120Z',
  timestamp: '2026-11-15T09:00:00.120Z',
  test_names: ['test_overdraft_transfer_rejected_and_balances_unchanged'],
  concise_output: '1 passed in 0.12s',
  finding_ids: [],
  summary: { total_tests: 1, passed: 1, failed: 0, blocked: 0, unverified: 0 },
  code_fingerprint: 'a1bfe7884b6318d3a67c2d11beaa70583fe60bc70ddfbb31a946a137d325fa2f',
  test_fingerprint: 'c6eb17c92e996d0bb395d59fa6be64728466ddaf675e63366de911da601ffc2b',
  environment_info: { os: 'windows' },
};

const mockEvidence: Evidence = {
  evidence_id: 'ev-test123456',
  run_id: 'run-20261115-test1234',
  requirement_id: 'PAYMENT-004',
  artifact_type: 'PROCESS_LOG',
  source: 'pytest',
  timestamp: '2026-11-15T09:00:00Z',
  payload: '============================== 1 passed in 0.12s ==============================',
  integrity_metadata: {
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    exit_code: 0,
    extra: {},
  },
};

describe('EvidenceViewer', () => {
  it('renders forensic telemetry, run id, and cryptographic digest', () => {
    render(<EvidenceViewer run={mockRun} evidence={mockEvidence} isLoading={false} />);

    expect(screen.getByText(/Forensic Evidence Log & Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText('run-20261115-test1234')).toBeInTheDocument();
    expect(screen.getByText(/EXIT CODE 0/i)).toBeInTheDocument();
    expect(screen.getByText('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')).toBeInTheDocument();
    expect(screen.getByText('python -m pytest backend/tests/test_payment.py -v')).toBeInTheDocument();
  });

  it('renders verify cryptographic seal button when evidence artifact is present', () => {
    render(<EvidenceViewer run={mockRun} evidence={mockEvidence} isLoading={false} />);

    const verifyBtn = screen.getByRole('button', { name: /Verify Cryptographic Seal/i });
    expect(verifyBtn).toBeInTheDocument();
  });

  it('renders placeholder when no run is selected', () => {
    render(<EvidenceViewer run={null} evidence={null} isLoading={false} />);
    expect(screen.getByText(/Select a verification run to inspect its process log output/i)).toBeInTheDocument();
  });
});
