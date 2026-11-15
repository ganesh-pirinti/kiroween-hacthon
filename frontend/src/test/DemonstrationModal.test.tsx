import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemonstrationModal } from '../components/DemonstrationModal';
import { DemonstrationResult } from '../types';

const mockDemoResult: DemonstrationResult = {
  requirement_id: 'PAYMENT-004',
  scenario: {
    initial_sender_balance: 10000,
    attempted_transfer: 15000,
    expected_outcome: 'Rejected with InsufficientFundsError; both balances unchanged',
  },
  vulnerable_run: {
    run_id: 'run-vuln-1234',
    exit_code: 1,
    status: 'VIOLATION',
    concise_output: 'Failed: DID NOT RAISE InsufficientFundsError',
  },
  corrected_run: {
    run_id: 'run-corr-5678',
    exit_code: 0,
    status: 'VERIFIED',
    concise_output: '1 passed in 0.07s',
  },
};

describe('DemonstrationModal', () => {
  it('renders disambiguated defect detection label for vulnerable fixture exit code 1', () => {
    render(
      <DemonstrationModal
        isOpen={true}
        onClose={vi.fn()}
        result={mockDemoResult}
        isLoading={false}
      />
    );

    // Verify vulnerable fixture card header
    expect(screen.getByText('VULNERABLE FIXTURE')).toBeInTheDocument();

    // Verify clear disambiguated expected violation label
    expect(
      screen.getByText(/DEFECT DETECTED — Expected Violation/)
    ).toBeInTheDocument();

    // Verify corrected engine card header and status
    expect(screen.getByText('CORRECTED ENGINE')).toBeInTheDocument();
    expect(screen.getByText(/0 \(PASSED\)/)).toBeInTheDocument();
  });
});
