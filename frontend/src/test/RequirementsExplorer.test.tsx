import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RequirementsExplorer } from '../components/RequirementsExplorer';
import { Requirement } from '../types';

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
    status: 'VIOLATION',
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

describe('RequirementsExplorer', () => {
  it('renders requirement list accurately', () => {
    const onSelect = vi.fn();
    render(
      <RequirementsExplorer
        requirements={mockRequirements}
        selectedRequirementId="PAYMENT-004"
        onSelectRequirement={onSelect}
      />
    );

    expect(screen.getByText('PAYMENT-001')).toBeInTheDocument();
    expect(screen.getByText('PAYMENT-004')).toBeInTheDocument();
    expect(screen.getByText('PAYMENT-006')).toBeInTheDocument();
  });

  it('filters by search input', () => {
    const onSelect = vi.fn();
    render(
      <RequirementsExplorer
        requirements={mockRequirements}
        selectedRequirementId={null}
        onSelectRequirement={onSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search requirements/i);
    fireEvent.change(searchInput, { target: { value: 'Overdraft' } });

    expect(screen.getByText('PAYMENT-004')).toBeInTheDocument();
    expect(screen.queryByText('PAYMENT-001')).not.toBeInTheDocument();
    expect(screen.queryByText('PAYMENT-006')).not.toBeInTheDocument();
  });

  it('filters by status button', () => {
    const onSelect = vi.fn();
    render(
      <RequirementsExplorer
        requirements={mockRequirements}
        selectedRequirementId={null}
        onSelectRequirement={onSelect}
      />
    );

    const violationButton = screen.getByRole('button', { name: 'VIOLATION' });
    fireEvent.click(violationButton);

    expect(screen.getByText('PAYMENT-004')).toBeInTheDocument();
    expect(screen.queryByText('PAYMENT-001')).not.toBeInTheDocument();
    expect(screen.queryByText('PAYMENT-006')).not.toBeInTheDocument();
  });

  it('invokes onSelectRequirement when a requirement card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <RequirementsExplorer
        requirements={mockRequirements}
        selectedRequirementId={null}
        onSelectRequirement={onSelect}
      />
    );

    const reqItem = screen.getByText('PAYMENT-004');
    fireEvent.click(reqItem);

    expect(onSelect).toHaveBeenCalledWith('PAYMENT-004');
  });
});
