import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigationOverview } from '../components/InvestigationOverview';
import { Requirement, SystemHealth } from '../types';

const mockRequirements: Requirement[] = [
  {
    id: 'PAYMENT-001',
    title: 'Account Initialization',
    description: 'Non-negative balance required',
    status: 'VERIFIED',
    acceptance_criteria: [{ id: 'AC-01.1', description: 'Initial balance >= 0' }],
    linked_tests: ['test_init'],
    created_at: '2026-11-14T00:00:00Z',
    updated_at: '2026-11-14T00:00:00Z',
  },
  {
    id: 'PAYMENT-004',
    title: 'Overdraft Prevention',
    description: 'Reject transfer exceeding balance',
    status: 'VERIFIED',
    acceptance_criteria: [{ id: 'AC-04.1', description: 'Overdraft rejected' }],
    linked_tests: ['test_overdraft'],
    created_at: '2026-11-14T00:00:00Z',
    updated_at: '2026-11-14T00:00:00Z',
  },
  {
    id: 'PAYMENT-006',
    title: 'Corporate Multi-Sig',
    description: 'Requires dual authorization',
    status: 'UNVERIFIED',
    acceptance_criteria: [{ id: 'AC-06.1', description: 'Dual auth required' }],
    linked_tests: [],
    created_at: '2026-11-14T00:00:00Z',
    updated_at: '2026-11-14T00:00:00Z',
  },
];

const mockHealth: SystemHealth = {
  status: 'healthy',
  service: 'Ghost Protocol Verification Engine',
  slogan: 'AI says Done. We demand proof.',
  version: '1.0.0-foundation',
  active_requirements: 3,
  total_verification_runs: 42,
  total_findings: 0,
};

describe('InvestigationOverview', () => {
  it('renders posture and metric counters accurately', () => {
    const onVerifyAll = vi.fn().mockResolvedValue(undefined);
    const onRunDemo = vi.fn().mockResolvedValue(undefined);
    const onOpenGlossary = vi.fn();
    const onOpenBenchmark = vi.fn();

    render(
      <InvestigationOverview
        requirements={mockRequirements}
        health={mockHealth}
        onVerifyAll={onVerifyAll}
        onRunDemonstration={onRunDemo}
        onOpenGlossary={onOpenGlossary}
        onOpenBenchmark={onOpenBenchmark}
        isVerifyingAll={false}
        isDemonstrating={false}
      />
    );

    expect(screen.getByText(/Forensic Verification Posture/i)).toBeInTheDocument();
    expect(screen.getByText('TOTAL CATALOG')).toBeInTheDocument();
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('VIOLATIONS')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByText('UNVERIFIED')).toBeInTheDocument();
  });

  it('triggers action callbacks when buttons are clicked', () => {
    const onVerifyAll = vi.fn().mockResolvedValue(undefined);
    const onRunDemo = vi.fn().mockResolvedValue(undefined);
    const onOpenGlossary = vi.fn();
    const onOpenBenchmark = vi.fn();

    render(
      <InvestigationOverview
        requirements={mockRequirements}
        health={mockHealth}
        onVerifyAll={onVerifyAll}
        onRunDemonstration={onRunDemo}
        onOpenGlossary={onOpenGlossary}
        onOpenBenchmark={onOpenBenchmark}
        isVerifyingAll={false}
        isDemonstrating={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Verification Model/i }));
    expect(onOpenGlossary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Seeded Benchmark/i }));
    expect(onOpenBenchmark).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Run All Verifications/i }));
    expect(onVerifyAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Demonstrate PAYMENT-004/i }));
    expect(onRunDemo).toHaveBeenCalledTimes(1);
  });

  it('calls onFilterStatus when metric cards are clicked', () => {
    const onFilter = vi.fn();
    render(
      <InvestigationOverview
        requirements={mockRequirements}
        health={mockHealth}
        onVerifyAll={vi.fn().mockResolvedValue(undefined)}
        onRunDemonstration={vi.fn().mockResolvedValue(undefined)}
        onOpenGlossary={vi.fn()}
        onOpenBenchmark={vi.fn()}
        isVerifyingAll={false}
        isDemonstrating={false}
        onFilterStatus={onFilter}
      />
    );

    fireEvent.click(screen.getByText('VERIFIED').closest('button')!);
    expect(onFilter).toHaveBeenCalledWith('VERIFIED');

    fireEvent.click(screen.getByText('UNVERIFIED').closest('button')!);
    expect(onFilter).toHaveBeenCalledWith('UNVERIFIED');
  });
});
