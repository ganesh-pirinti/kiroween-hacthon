import React, { useState, useEffect } from 'react';
import { RiskAnalysisReport } from '../types';
import { api } from '../services/api';
import {
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ListOrdered,
  Flame,
  Info,
} from 'lucide-react';

interface Props {
  onSelectRequirement: (id: string) => void;
  onVerifyRequirement?: (id: string) => Promise<void>;
}

export const RiskPrioritizationView: React.FC<Props> = ({
  onSelectRequirement,
}) => {
  const [report, setReport] = useState<RiskAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRisk = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getRiskAnalysis();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load risk analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRisk();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-panel p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
        <Flame className="w-8 h-8 text-[var(--color-warning)] mx-auto animate-pulse" />
        <p className="text-[var(--text-main)] font-medium font-mono-code">Computing Explainable Risk Factors...</p>
        <p className="text-[var(--text-secondary)]">Evaluating severity, acceptance criteria coverage, status, and findings.</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="glass-panel p-8 bg-[#FF5D73]/10 border-[#FF5D73]/40 text-xs text-red-700 dark:text-red-200 space-y-3">
        <p className="font-bold text-[var(--text-main)] text-sm">Risk Evaluation Error</p>
        <p>{error}</p>
        <button
          onClick={loadRisk}
          className="btn-command-ghost px-4 py-1.5 text-xs text-[var(--text-main)]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Posture Banner */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-warning)]/60 to-transparent" />

        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 text-[var(--color-warning)] shadow-sm">
            <Flame className="w-6 h-6 text-[var(--color-warning)]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                Explainable Risk Prioritization & Remediation Backlog
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                  report.overall_risk_posture === 'LOW'
                    ? 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40 shadow-[0_0_8px_rgba(0,231,167,0.2)]'
                    : 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40 shadow-[0_0_8px_rgba(255,200,87,0.2)]'
                }`}
              >
                POSTURE: {report.overall_risk_posture}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Deterministic risk scores (0–100) computed from observable violations, coverage gaps, blocked checks, and code churn.
            </p>
          </div>
        </div>

        <button
          onClick={loadRisk}
          className="btn-command-ghost px-3.5 py-2 text-xs flex items-center gap-1.5 font-medium font-mono-code"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-evaluate Posture</span>
        </button>
      </div>

      {/* Highest Priority Action Callout */}
      {report.highest_priority_action && (
        <div className="glass-panel p-5 bg-[#FFC857]/8 border-[#FFC857]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,200,87,0.15)]">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#FFC857]/15 text-[#FFC857] shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFC857] font-mono-code">
                  PRIMARY RECOMMENDED REMEDIATION
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-black/40 text-[var(--text-main)] font-mono-code border border-[#FFC857]/30">
                  {report.highest_priority_action.requirement_id}
                </span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-main)]">
                {report.highest_priority_action.action}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Detail: {report.highest_priority_action.detail}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => onSelectRequirement(report.highest_priority_action!.requirement_id)}
              className="btn-command-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            >
              <span>Inspect in Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Ordered Action Backlog */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 font-mono-code">
            <ListOrdered className="w-4 h-4 text-[var(--color-copper)]" />
            Prioritized Engineering Action Backlog ({report.action_backlog.length})
          </h3>
          <span className="text-[11px] text-[var(--text-muted)] font-mono-code">
            Ordered by Severity & Urgency
          </span>
        </div>

        <div className="space-y-3">
          {report.action_backlog.map((item) => (
            <div
              key={item.priority}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-panel)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3.5">
                <span className="w-6 h-6 rounded-full bg-[var(--color-copper)]/10 text-[var(--color-copper)] border border-[var(--color-copper)]/30 flex items-center justify-center font-bold font-mono-code text-[11px] shrink-0 mt-0.5">
                  {item.priority}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-code font-bold text-[var(--color-copper)]">
                      {item.requirement_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-main)] font-mono-code border border-[var(--border-subtle)]">
                      URGENCY: {item.urgency}
                    </span>
                    <span className="font-semibold text-[var(--text-main)]">{item.action}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">{item.detail}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => onSelectRequirement(item.requirement_id)}
                  className="btn-command-ghost px-3 py-1.5 text-xs flex items-center gap-1 font-mono-code"
                >
                  <span>Inspect</span>
                  <ArrowRight className="w-3 h-3 text-[var(--color-copper)]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirement Risk Profile Matrix */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 font-mono-code">
            <Info className="w-4 h-4 text-[var(--color-copper)]" />
            Requirement Risk Decomposition Matrix ({report.risk_breakdown.length})
          </h3>
          <span className="text-xs font-mono-code text-[var(--text-muted)]">
            Observable Contributing Factor Weights
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {report.risk_breakdown.map((r) => {
            const isHigh = r.risk_score >= 50;
            const isModerate = r.risk_score >= 25 && r.risk_score < 50;

            return (
              <div
                key={r.requirement_id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono-code font-bold text-[var(--color-copper)]">
                      {r.requirement_id}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                        isHigh
                          ? 'bg-[#FF5D73]/15 text-[#FF5D73] border-[#FF5D73]/40'
                          : isModerate
                          ? 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40'
                          : 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40'
                      }`}
                    >
                      {r.risk_category} ({r.risk_score}/100)
                    </span>
                    <span className="font-semibold text-[var(--text-main)]">{r.title}</span>
                  </div>

                  {/* Factor Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {r.contributing_factors.map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono-code px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.04)] text-[#98A2B3] border border-[rgba(255,255,255,0.07)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => onSelectRequirement(r.requirement_id)}
                    className="btn-command-ghost px-3 py-1.5 text-xs text-[#6EE7FF] font-mono-code"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
