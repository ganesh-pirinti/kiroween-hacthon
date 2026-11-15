import React from 'react';
import { VerificationStatus } from '../types';
import { CheckCircle2, AlertOctagon, AlertTriangle, HelpCircle } from 'lucide-react';

interface Props {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2.5 py-0.5 gap-1 tracking-wider',
    md: 'text-[11px] px-3 py-1 gap-1.5 font-semibold tracking-wider',
    lg: 'text-xs px-3.5 py-1.5 gap-2 font-bold tracking-widest',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  switch (status) {
    case 'VERIFIED':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-[var(--color-verified)]/40 bg-[var(--color-verified)]/12 text-emerald-400 text-[var(--color-verified)] shadow-[0_0_15px_rgba(var(--color-verified-rgb),0.25)] backdrop-blur-md font-mono-code font-bold ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className={`${iconSizes} text-emerald-400 text-[var(--color-verified)]`} />}
          VERIFIED
        </span>
      );
    case 'VIOLATION':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-[var(--color-violation)]/60 bg-[var(--color-violation)]/15 text-red-400 text-[var(--color-violation)] shadow-[0_0_18px_rgba(var(--color-violation-rgb),0.35)] backdrop-blur-md font-mono-code font-bold animate-restrained-pulse ${sizeClasses}`}
        >
          {showIcon && <AlertOctagon className={`${iconSizes} text-red-400 text-[var(--color-violation)]`} />}
          VIOLATION
        </span>
      );
    case 'BLOCKED':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 text-amber-400 text-[var(--color-warning)] shadow-[0_0_14px_rgba(var(--color-warning-rgb),0.25)] backdrop-blur-md font-mono-code font-bold ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className={`${iconSizes} text-amber-400 text-[var(--color-warning)]`} />}
          BLOCKED
        </span>
      );
    case 'UNVERIFIED':
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] text-slate-400 text-[var(--text-muted)] shadow-[0_0_10px_rgba(255,255,255,0.05)] backdrop-blur-md font-mono-code font-bold ${sizeClasses}`}
        >
          {showIcon && <HelpCircle className={`${iconSizes} text-slate-400 text-[var(--text-muted)]`} />}
          UNVERIFIED
        </span>
      );
  }
};
