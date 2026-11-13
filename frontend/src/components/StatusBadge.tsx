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
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
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
          className={`inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className={`${iconSizes} text-emerald-400`} />}
          VERIFIED
        </span>
      );
    case 'VIOLATION':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-red-500/50 bg-red-950/50 text-red-400 animate-restrained-pulse ${sizeClasses}`}
        >
          {showIcon && <AlertOctagon className={`${iconSizes} text-red-400`} />}
          VIOLATION
        </span>
      );
    case 'BLOCKED':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-400 ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className={`${iconSizes} text-amber-400`} />}
          BLOCKED
        </span>
      );
    case 'UNVERIFIED':
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-400 ${sizeClasses}`}
        >
          {showIcon && <HelpCircle className={`${iconSizes} text-slate-400`} />}
          UNVERIFIED
        </span>
      );
  }
};
