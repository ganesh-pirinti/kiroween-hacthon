import React, { useState, useMemo } from 'react';
import { Finding } from '../types';
import { Terminal, ArrowRight, ShieldAlert, Code, Copy, Check, Filter } from 'lucide-react';

interface Props {
  findings: Finding[];
  onSelectRequirement: (requirementId: string) => void;
}

export const FindingsList: React.FC<Props> = ({ findings, onSelectRequirement }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCmd = (id: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFindings = useMemo(() => {
    if (severityFilter === 'ALL') return findings;
    return findings.filter((f) => f.severity === severityFilter);
  }, [findings, severityFilter]);

  if (findings.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-xs text-[#98A2B3]">
        Zero active defects or specification violations detected. All executed runs satisfy their formal acceptance criteria.
      </div>
    );
  }

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'];

  return (
    <div className="glass-panel p-6 space-y-5 border-[#FF5D73]/25 shadow-[0_0_35px_-10px_rgba(255,93,115,0.2)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <div className="flex items-center gap-2.5 text-[#FF5D73] font-bold text-xs uppercase tracking-wider font-mono-code">
          <div className="p-1.5 rounded-lg bg-[#FF5D73]/15 text-[#FF5D73]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span>Active Specification Violations ({findings.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#98A2B3] uppercase font-semibold flex items-center gap-1 font-mono-code">
            <Filter className="w-3 h-3 text-slate-500" />
            Severity:
          </span>
          {severities.map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 text-[10px] font-mono-code font-bold rounded-lg transition-all ${
                severityFilter === sev
                  ? 'bg-[#FF5D73]/20 text-[#FF5D73] border border-[#FF5D73]/40 shadow-[0_0_10px_rgba(255,93,115,0.25)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3.5">
        {filteredFindings.map((f) => {
          const isCritical = f.severity === 'CRITICAL';
          return (
            <div
              key={f.finding_id}
              className={`p-4 rounded-2xl border transition-all ${
                isCritical
                  ? 'bg-gradient-to-r from-[#FF5D73]/12 via-[var(--bg-card)] to-[var(--bg-card)] border-[#FF5D73]/35 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono-code ${
                      isCritical
                        ? 'bg-[#FF5D73]/20 text-[#FF5D73] border border-[#FF5D73]/40 shadow-[0_0_8px_rgba(255,93,115,0.3)]'
                        : 'bg-[#FFC857]/20 text-[#FFC857] border border-[#FFC857]/40'
                    }`}
                  >
                    {f.severity}
                  </span>
                  {f.failure_classification && f.failure_classification !== 'NONE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono-code bg-[#FF5D73]/15 text-[#FF5D73] border border-[#FF5D73]/30">
                      {f.failure_classification}
                    </span>
                  )}
                  <span className="font-mono-code text-xs font-bold text-[var(--text-main)]">
                    {f.finding_id}
                  </span>
                  {f.run_id && (
                    <span className="text-[10px] font-mono-code text-[var(--text-muted)]">
                      via {f.run_id}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">on</span>
                  <button
                    onClick={() => onSelectRequirement(f.requirement_id)}
                    className="font-mono-code text-xs font-bold text-[var(--color-copper)] hover:underline flex items-center gap-1 focus:outline-none"
                    title={`Inspect requirement ${f.requirement_id}`}
                  >
                    {f.requirement_id}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono-code">
                  {new Date(f.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Technical Explanation */}
              <p className="mt-3 text-xs font-medium text-rose-900 dark:text-rose-200 leading-relaxed">
                {f.explanation}
              </p>

              {/* Real Code Context / Vulnerability Note for PAYMENT-004 */}
              {f.requirement_id === 'PAYMENT-004' && (
                <div className="mt-3.5 p-3.5 bg-[#030406]/80 rounded-xl border border-[#FF5D73]/30 text-[11px] font-mono-code space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#FF5D73] font-bold">
                    <Code className="w-3.5 h-3.5" />
                    Vulnerability Root Cause (PAYMENT-004 Defect)
                  </div>
                  <div className="text-slate-300">
                    <span className="text-[#FF5D73] font-bold">- Omitted:</span> `if sender.balance &lt; amt: raise InsufficientFundsError`
                  </div>
                  <div className="text-slate-300">
                    <span className="text-[#00E7A7] font-bold">+ Fix:</span> Enforce available balance check before executing debit & credit.
                  </div>
                </div>
              )}

              {/* Reproduction Instruction Box with copy button */}
              <div className="mt-3.5 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3 text-[11px] text-[#98A2B3]">
                <div className="flex items-center gap-2 truncate">
                  <Terminal className="w-3.5 h-3.5 text-[#6EE7FF] shrink-0" />
                  <span className="font-mono-code text-[10px] text-slate-300 truncate">
                    {f.reproduction_instructions}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCmd(f.finding_id, f.reproduction_instructions)}
                  className="flex items-center gap-1 text-[10px] text-[#6EE7FF] hover:underline shrink-0 font-mono-code"
                  title="Copy reproduction command"
                >
                  {copiedId === f.finding_id ? (
                    <Check className="w-3 h-3 text-[#00E7A7]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === f.finding_id ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
