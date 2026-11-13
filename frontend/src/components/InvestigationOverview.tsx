import React from 'react';
import { Requirement, SystemHealth } from '../types';
import { ShieldAlert, Play, FlaskConical, HelpCircle, Activity, BarChart3 } from 'lucide-react';

interface Props {
  requirements: Requirement[];
  health: SystemHealth | null;
  onVerifyAll: () => Promise<void>;
  onRunDemonstration: () => Promise<void>;
  onOpenGlossary: () => void;
  onOpenBenchmark: () => void;
  isVerifyingAll: boolean;
  isDemonstrating: boolean;
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
}) => {
  const counts = requirements.reduce(
    (acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    },
    { VERIFIED: 0, VIOLATION: 0, BLOCKED: 0, UNVERIFIED: 0 } as Record<string, number>
  );

  const hasViolations = counts.VIOLATION > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg bg-[#0d1117] border border-[#242b38]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#58a6ff]">
            <Activity className="w-5 h-5 text-[#58a6ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                Forensic Posture {health?.version ? `(${health.version})` : ''}
              </span>
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  hasViolations ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
                }`}
              />
            </div>
            <p className="text-sm font-medium text-white">
              {hasViolations
                ? `${counts.VIOLATION} active requirement violation(s) detected with real evidence`
                : 'All tested requirements satisfy acceptance criteria'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenGlossary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8b949e] hover:text-white bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-md transition-colors"
            title="Explain VERIFIED, VIOLATION, BLOCKED, and UNVERIFIED states"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Verification Model
          </button>

          <button
            onClick={onOpenBenchmark}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#58a6ff] hover:text-white bg-[#161b22] hover:bg-[#1f6feb]/20 border border-[#1f6feb]/40 rounded-md transition-colors"
            title="Run Independent Benchmark against Seeded Defects"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#58a6ff]" />
            Seeded Benchmark
          </button>

          <button
            onClick={onRunDemonstration}
            disabled={isDemonstrating || isVerifyingAll}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-950/80 hover:bg-red-900 border border-red-700/60 rounded-md transition-all disabled:opacity-50"
          >
            <FlaskConical className={`w-3.5 h-3.5 text-red-400 ${isDemonstrating ? 'animate-spin' : ''}`} />
            {isDemonstrating ? 'Executing Demo...' : 'Demonstrate PAYMENT-004 Bug & Fix'}
          </button>

          <button
            onClick={onVerifyAll}
            disabled={isVerifyingAll || isDemonstrating}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] border border-[#388bfd]/40 rounded-md transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isVerifyingAll ? 'animate-spin' : ''}`} />
            {isVerifyingAll ? 'Verifying All...' : 'Run All Verifications'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Verified Card */}
        <div className="p-4 rounded-lg bg-[#0d1117] border border-emerald-900/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>VERIFIED</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono-code">{counts.VERIFIED}</span>
            <span className="text-xs text-[#8b949e]">requirements</span>
          </div>
          <div className="mt-1 text-[11px] text-[#8b949e]">Checks passed with sealed evidence</div>
        </div>

        {/* Violation Card */}
        <div
          className={`p-4 rounded-lg bg-[#0d1117] border transition-colors ${
            hasViolations ? 'border-red-600/60 bg-red-950/10' : 'border-red-950/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-medium">
            <span>VIOLATIONS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-400 font-mono-code">{counts.VIOLATION}</span>
            <span className="text-xs text-[#8b949e]">defects</span>
          </div>
          <div className="mt-1 text-[11px] text-[#8b949e]">Executed tests failed specification</div>
        </div>

        {/* Blocked Card */}
        <div className="p-4 rounded-lg bg-[#0d1117] border border-amber-900/40">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>BLOCKED</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono-code">{counts.BLOCKED}</span>
            <span className="text-xs text-[#8b949e]">aborted</span>
          </div>
          <div className="mt-1 text-[11px] text-[#8b949e]">Harness or environment restriction</div>
        </div>

        {/* Unverified Card */}
        <div className="p-4 rounded-lg bg-[#0d1117] border border-[#242b38]">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>UNVERIFIED</span>
            <span className="w-2 h-2 rounded-full bg-slate-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono-code">{counts.UNVERIFIED}</span>
            <span className="text-xs text-[#8b949e]">pending</span>
          </div>
          <div className="mt-1 text-[11px] text-[#8b949e]">No executable test bound or executed</div>
        </div>
      </div>
    </div>
  );
};
