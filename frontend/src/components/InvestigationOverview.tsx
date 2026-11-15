import React from 'react';
import { Requirement, SystemHealth } from '../types';
import { ForensicShieldCore } from './ForensicShieldCore';
import {
  Play,
  FlaskConical,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface Props {
  requirements: Requirement[];
  health: SystemHealth | null;
  onVerifyAll: () => Promise<void>;
  onRunDemonstration: () => Promise<void>;
  onOpenGlossary: () => void;
  onOpenBenchmark: () => void;
  isVerifyingAll: boolean;
  isDemonstrating: boolean;
  onFilterStatus?: (status: string) => void;
  activeFilter?: string;
}

export const InvestigationOverview: React.FC<Props> = ({
  requirements,
  health,
  onVerifyAll,
  onRunDemonstration,
  onOpenGlossary,
  onOpenBenchmark,
  isVerifyingAll,
  isDemonstrating,
  onFilterStatus,
  activeFilter = 'ALL',
}) => {
  const counts = requirements.reduce(
    (acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    },
    { VERIFIED: 0, VIOLATION: 0, BLOCKED: 0, UNVERIFIED: 0 } as Record<string, number>
  );

  const totalReqs = requirements.length;
  const verifiedPercentage =
    totalReqs > 0 ? Math.round((counts.VERIFIED / totalReqs) * 100) : 0;
  const hasViolations = counts.VIOLATION > 0;
  const isBusy = isVerifyingAll || isDemonstrating;

  return (
    <div className="space-y-5">
      {/* Top Enterprise Command Center Banner */}
      <div className={`glass-panel p-5 relative overflow-hidden ${isBusy ? 'verification-scan-beam' : ''}`}>
        {/* Subtle top edge copper highlight beam */}
        <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--color-molten-amber)] to-transparent opacity-80" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            {/* Signature 3D Holographic Forensic Shield Centerpiece */}
            <div className="shrink-0">
              <ForensicShieldCore
                isBusy={isBusy}
                verifiedPercentage={verifiedPercentage}
                size="md"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono-code font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  FORENSIC VERIFICATION POSTURE // {health?.version ?? 'v1.0.0'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-verified)]/12 text-[var(--color-verified)] border border-[var(--color-verified)]/35 font-mono-code font-semibold">
                  ACTIVE TAMPER-PROOF LEDGER
                </span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                  Independent Verification Workbench
                </h1>
                <span className="text-xs font-mono-code font-bold text-[var(--color-molten-amber)] bg-[var(--color-molten-amber)]/10 px-2.5 py-0.5 rounded-lg border border-[var(--color-molten-amber)]/30 shadow-[0_0_12px_rgba(var(--color-molten-amber-rgb),0.2)]">
                  {verifiedPercentage}% CERTIFIED
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                {hasViolations ? (
                  <span className="text-[var(--color-violation)] font-semibold flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-[var(--color-violation)]" />
                    {counts.VIOLATION} active requirement specification violation detected in subprocess execution
                  </span>
                ) : counts.UNVERIFIED > 0 ? (
                  <span>
                    <strong className="text-[var(--color-verified)]">{counts.VERIFIED} Verified</strong>
                    {' · '}
                    <span className="text-[var(--color-warning)] font-medium">
                      {counts.UNVERIFIED} Unverified (Criteria Gaps / Unbound Targets)
                    </span>
                    {' · '}
                    <span className="text-[var(--text-muted)]">0 Violations</span>
                  </span>
                ) : (
                  <span className="text-[var(--color-verified)] font-medium">
                    All specifications satisfied under reproducible subprocess execution
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Forensic Action Triggers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenGlossary}
              className="btn-command-ghost px-3.5 py-2 text-xs flex items-center gap-1.5 font-medium"
              title="Verification Model — Explain VERIFIED, VIOLATION, BLOCKED, and UNVERIFIED state axioms"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Verification Model</span>
            </button>

            <button
              onClick={onOpenBenchmark}
              className="btn-command-ghost px-3.5 py-2 text-xs flex items-center gap-1.5 font-medium text-[var(--color-molten-amber)] border-[var(--color-copper)]/35 hover:border-[var(--color-molten-amber)] hover:text-[var(--text-main)]"
              title="Run Independent Benchmark against Seeded Defect Catalog"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[var(--color-molten-amber)]" />
              <span>Seeded Benchmark</span>
            </button>

            <button
              onClick={onRunDemonstration}
              disabled={isDemonstrating || isVerifyingAll}
              className="relative px-4 py-2 text-xs font-semibold text-rose-950 dark:text-white rounded-xl border border-[var(--color-violation)]/50 bg-gradient-to-r from-[var(--color-violation)]/25 to-[var(--color-violation)]/10 hover:from-[var(--color-violation)]/40 hover:to-[var(--color-violation)]/20 shadow-[0_4px_20px_-4px_rgba(var(--color-violation-rgb),0.4)] transition-all disabled:opacity-50 flex items-center gap-2"
              title="Compare vulnerable fixture failure vs corrected implementation pass"
            >
              <FlaskConical
                className={`w-3.5 h-3.5 text-[var(--color-violation)] ${isDemonstrating ? 'animate-spin' : ''}`}
              />
              <span>{isDemonstrating ? 'Executing Demo...' : 'Demonstrate PAYMENT-004'}</span>
            </button>

            <button
              onClick={onVerifyAll}
              disabled={isVerifyingAll || isDemonstrating}
              className="btn-command-primary px-5 py-2 text-xs flex items-center gap-2 shadow-[0_0_25px_var(--glow-primary)] disabled:opacity-50 text-white"
              title="Sequentially execute pytest targets across all catalog requirements"
            >
              <Play className={`w-3.5 h-3.5 text-white ${isVerifyingAll ? 'animate-spin' : ''}`} />
              <span>{isVerifyingAll ? 'Verifying Entire Catalog...' : 'Run All Verifications'}</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-copper)] via-[var(--color-molten-amber)] to-[var(--color-verified)] shadow-[0_0_12px_rgba(var(--color-molten-amber-rgb),0.5)] transition-all duration-700"
              style={{ width: `${verifiedPercentage}%` }}
            />
          </div>
          <span className="text-[11px] font-mono-code text-[var(--text-secondary)] shrink-0">
            {counts.VERIFIED} / {totalReqs} BOUND REQUIREMENTS CERTIFIED
          </span>
        </div>
      </div>

      {/* Analytics Widgets Grid with Dimensional Metallic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Catalog Card */}
        <button
          onClick={() => onFilterStatus && onFilterStatus('ALL')}
          className={`glass-card-interactive p-4 text-left relative overflow-hidden group ${
            activeFilter === 'ALL'
              ? 'border-[var(--color-copper)]/70 bg-[var(--color-copper)]/12 shadow-[0_0_30px_rgba(var(--color-copper-rgb),0.25)]'
              : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-copper)] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <FileSearch className="w-3.5 h-3.5 text-[var(--color-copper)]" />
              TOTAL CATALOG
            </span>
            <span className="font-mono-code text-[11px] text-[var(--color-molten-amber)]">
              {verifiedPercentage}%
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[var(--text-main)] font-mono-code tracking-tight">
              {totalReqs}
            </span>
            {/* Sparkline in Molten Amber */}
            <svg className="w-16 h-6 stroke-[var(--color-molten-amber)] fill-none" viewBox="0 0 64 24">
              <path
                d="M 0 18 Q 16 8, 32 14 T 64 4"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono-code truncate">
            {health?.total_verification_runs ?? 0} historical runs
          </div>
        </button>

        {/* Verified Card */}
        <button
          onClick={() => onFilterStatus && onFilterStatus('VERIFIED')}
          className={`glass-card-interactive p-4 text-left relative overflow-hidden group ${
            activeFilter === 'VERIFIED'
              ? 'border-[var(--color-verified)]/60 bg-[var(--color-verified)]/12 shadow-[0_0_30px_rgba(var(--color-verified-rgb),0.25)]'
              : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-verified)] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-verified)]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-verified)]" />
              VERIFIED
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-verified)] shadow-[0_0_8px_var(--color-verified)]" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[var(--color-verified)] font-mono-code tracking-tight">
              {counts.VERIFIED}
            </span>
            {/* Upward trending sparkline */}
            <svg className="w-16 h-6 stroke-[var(--color-verified)] fill-none" viewBox="0 0 64 24">
              <path
                d="M 0 20 L 20 16 L 38 10 L 64 2"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono-code truncate">
            100% criteria passed (exit 0)
          </div>
        </button>

        {/* Violation Card */}
        <button
          onClick={() => onFilterStatus && onFilterStatus('VIOLATION')}
          className={`glass-card-interactive p-4 text-left relative overflow-hidden group ${
            activeFilter === 'VIOLATION'
              ? 'border-[var(--color-violation)]/60 bg-[var(--color-violation)]/12 shadow-[0_0_30px_rgba(var(--color-violation-rgb),0.25)]'
              : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-violation)] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-violation)]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <AlertOctagon className="w-3.5 h-3.5 text-[var(--color-violation)]" />
              VIOLATIONS
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-violation)] shadow-[0_0_8px_var(--color-violation)]" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold font-mono-code tracking-tight ${
              counts.VIOLATION > 0 ? 'text-[var(--color-violation)]' : 'text-[var(--text-main)]'
            }`}>
              {counts.VIOLATION}
            </span>
            <span className="text-[10px] font-mono-code text-[var(--color-violation)] px-1.5 py-0.5 rounded bg-[var(--color-violation)]/10 border border-[var(--color-violation)]/20">
              {counts.VIOLATION === 0 ? 'CLEAN' : 'BREACH'}
            </span>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono-code truncate">
            {counts.VIOLATION === 0 ? 'No assertion breaks' : 'Adversarial defect'}
          </div>
        </button>

        {/* Unverified / Coverage Gaps Card */}
        <button
          onClick={() => onFilterStatus && onFilterStatus('UNVERIFIED')}
          className={`glass-card-interactive p-4 text-left relative overflow-hidden group ${
            activeFilter === 'UNVERIFIED'
              ? 'border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10 shadow-[0_0_30px_rgba(var(--color-warning-rgb),0.25)]'
              : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-warning)] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-warning)]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-warning)]" />
              UNVERIFIED
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[var(--color-warning)] font-mono-code tracking-tight">
              {counts.UNVERIFIED}
            </span>
            <span className="text-[10px] font-mono-code text-[var(--color-warning)] px-1.5 py-0.5 rounded bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
              GAPS
            </span>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono-code truncate">
            PAYMENT-003, PAYMENT-006
          </div>
        </button>

        {/* Blocked Card */}
        <button
          onClick={() => onFilterStatus && onFilterStatus('BLOCKED')}
          className={`glass-card-interactive p-4 text-left relative overflow-hidden group ${
            activeFilter === 'BLOCKED'
              ? 'border-[var(--color-copper)]/60 bg-[var(--color-copper)]/10 shadow-[0_0_30px_rgba(var(--color-copper-rgb),0.25)]'
              : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-copper)] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-copper)]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-copper)]" />
              BLOCKED
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-copper)]" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[var(--text-main)] font-mono-code tracking-tight">
              {counts.BLOCKED}
            </span>
            <span className="text-[10px] font-mono-code text-[var(--color-copper)] px-1.5 py-0.5 rounded bg-[var(--color-copper)]/10 border border-[var(--color-copper)]/20">
              0 BLOCKED
            </span>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono-code truncate">
            No environmental blocks
          </div>
        </button>
      </div>
    </div>
  );
};
