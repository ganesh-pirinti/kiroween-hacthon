import React, { useState, useEffect } from 'react';
import { ImpactAnalysisReport } from '../types';
import { api } from '../services/api';
import {
  GitCommit,
  RefreshCw,
  CheckCircle2,
  Play,
  FileCode,
  Hash,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  onVerifyRequirement: (id: string) => Promise<void>;
  onVerifyAll: () => Promise<void>;
  isVerifyingAll: boolean;
}

export const ChangeImpactView: React.FC<Props> = ({
  onVerifyRequirement,
  onVerifyAll,
  isVerifyingAll,
}) => {
  const [report, setReport] = useState<ImpactAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImpact = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getImpactAnalysis();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load change impact analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImpact();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-panel p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
        <GitCommit className="w-8 h-8 text-[var(--color-copper)] mx-auto animate-spin" />
        <p className="text-[var(--text-main)] font-medium font-mono-code">Computing Repository SHA-256 Fingerprints...</p>
        <p className="text-[var(--text-secondary)]">Comparing live source and test files against stored evidence ledger.</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="glass-panel p-8 bg-[#FF5D73]/10 border-[#FF5D73]/40 text-xs text-red-700 dark:text-red-200 space-y-3">
        <p className="font-bold text-[var(--text-main)] text-sm">Impact Analysis Error</p>
        <p>{error}</p>
        <button
          onClick={loadImpact}
          className="btn-command-ghost px-4 py-1.5 text-xs text-[var(--text-main)]"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-copper)]/60 to-transparent" />

        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-[var(--color-copper)]/15 border border-[var(--color-copper)]/30 text-[var(--color-copper)] shadow-sm">
            <GitCommit className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                Change Impact & Stale Evidence Analyzer
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                  summary.all_fresh
                    ? 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40 shadow-[0_0_10px_rgba(0,231,167,0.25)]'
                    : 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40 shadow-[0_0_10px_rgba(255,200,87,0.25)]'
                }`}
              >
                {summary.all_fresh ? 'ALL EVIDENCE FRESH' : `${summary.stale_evidence} STALE CHECKS`}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Detects source code or test changes that invalidate existing proof. Distinguishes fresh evidence from stale assertions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadImpact}
            className="btn-command-ghost px-3.5 py-2 text-xs flex items-center gap-1.5 font-medium font-mono-code"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-scan Hashes</span>
          </button>
          {!summary.all_fresh && (
            <button
              onClick={onVerifyAll}
              disabled={isVerifyingAll}
              className="btn-command-primary px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-[#6EE7FF]" />
              <span>{isVerifyingAll ? 'Rerunning All...' : 'Rerun All to Refresh Proof'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Target File Fingerprints Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-main)] flex items-center gap-2 text-xs font-mono-code">
              <FileCode className="w-4 h-4 text-[var(--color-copper)]" />
              Target Source File: <code>backend/app/payment.py</code>
            </span>
            <span className="text-[10px] font-mono-code text-[var(--color-verified)] bg-[var(--color-verified)]/10 px-2 py-0.5 rounded-full border border-[var(--color-verified)]/30">
              LIVE DISK
            </span>
          </div>
          <div className="font-mono-code text-[11px] text-[var(--color-copper)] break-all select-all p-3 bg-black/5 dark:bg-black/60 rounded-xl border border-[var(--border-subtle)]">
            {report.current_source_sha256}
          </div>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-main)] flex items-center gap-2 text-xs font-mono-code">
              <Hash className="w-4 h-4 text-[var(--color-copper)]" />
              Test Suite: <code>backend/tests/test_payment.py</code>
            </span>
            <span className="text-[10px] font-mono-code text-[var(--color-verified)] bg-[var(--color-verified)]/10 px-2 py-0.5 rounded-full border border-[var(--color-verified)]/30">
              LIVE DISK
            </span>
          </div>
          <div className="font-mono-code text-[11px] text-[var(--color-copper)] break-all select-all p-3 bg-black/5 dark:bg-black/60 rounded-xl border border-[var(--border-subtle)]">
            {report.current_test_sha256}
          </div>
        </div>
      </div>

      {/* Requirement Freshness Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 font-mono-code">
            <ShieldCheck className="w-4 h-4 text-[var(--color-copper)]" />
            Evidence Freshness Matrix ({report.requirements.length})
          </h3>
          <span className="text-xs font-mono-code text-[var(--text-muted)]">
            {summary.fresh_evidence} Fresh · {summary.stale_evidence} Stale · {summary.unbound_requirements} Unbound
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {report.requirements.map((item) => {
            const isFresh = item.freshness_status === 'FRESH';
            const isStale = item.freshness_status === 'STALE_CODE' || item.freshness_status === 'STALE_TEST';

            return (
              <div
                key={item.requirement_id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  isStale
                    ? 'bg-[#FFC857]/8 hover:bg-[#FFC857]/12'
                    : 'hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono-code font-bold text-[var(--color-copper)]">
                      {item.requirement_id}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                        isFresh
                          ? 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40 shadow-[0_0_8px_rgba(0,231,167,0.2)]'
                          : isStale
                          ? 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40 shadow-[0_0_8px_rgba(255,200,87,0.2)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {item.freshness_status}
                    </span>
                    <span className="font-semibold text-[var(--text-main)]">{item.title}</span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)]">{item.reason}</p>

                  {item.last_verified_at && (
                    <div className="text-[10px] font-mono-code text-slate-500">
                      Last Verified: {new Date(item.last_verified_at).toLocaleString()} (Run: {item.latest_run_id})
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2.5">
                  {item.needs_rerun ? (
                    <button
                      onClick={() => onVerifyRequirement(item.requirement_id)}
                      className="btn-command-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                      title="Rerun checks to seal fresh evidence"
                    >
                      <Play className="w-3 h-3 text-[#6EE7FF]" />
                      <span>Rerun Check</span>
                    </button>
                  ) : isFresh ? (
                    <span className="text-[11px] font-mono-code text-[#00E7A7] flex items-center gap-1.5 bg-[#00E7A7]/10 px-2.5 py-1 rounded-full border border-[#00E7A7]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sealed & Fresh
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono-code text-slate-500">
                      Unbound in catalog
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
