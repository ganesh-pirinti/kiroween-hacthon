import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders VERIFIED status badge with emerald styling', () => {
    render(<StatusBadge status="VERIFIED" />);
    const badge = screen.getByText('VERIFIED');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-emerald-400');
  });

  it('renders VIOLATION status badge with crimson styling and restrained pulse', () => {
    render(<StatusBadge status="VIOLATION" />);
    const badge = screen.getByText('VIOLATION');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-red-400');
  });

  it('renders BLOCKED status badge with amber styling', () => {
    render(<StatusBadge status="BLOCKED" />);
    const badge = screen.getByText('BLOCKED');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-amber-400');
  });

  it('renders UNVERIFIED status badge with slate styling', () => {
    render(<StatusBadge status="UNVERIFIED" />);
    const badge = screen.getByText('UNVERIFIED');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-slate-400');
  });
});
