import React, { useState } from 'react';
import { Requirement, VerificationRun } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Play,
  Clock,
  FileCode,
  CheckSquare,
  Terminal,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';

interface Props {
  requirement: Requirement | null;
  runs: VerificationRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onVerify: (requirementId: string) => Promise<void>;
  isVerifying: boolean;
  onOpenCopilot?: (requirementId: string) => void;
}

export const InvestigationDetail: React.FC<Props> = ({
  requirement,
  runs,
  selectedRunId,
  onSelectRun,
  onVerify,
  isVerifying,
  onOpenCopilot,
}) => {
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(text);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  if (!requirement) {
    return (
      <div className="glass-panel h-full flex flex-col items-center justify-center p-12 text-center space-y-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
          <Layers className="w-8 h-8 text-[var(--accent-secondary)]/70" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-main)]">No Specification Selected</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm">
          Select a requirement from the catalog to inspect its acceptance criteria, verified test bindings, and cryptographic ledger history.
        </p>
      </div>
    );
  }

  const uncoveredCriteria = requirement.acceptance_criteria.filter(
    (ac) => !ac.linked_test || !ac.linked_test.trim()
  );

  const isUnbound = requirement.linked_tests.length === 0;

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Requirement Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 border-b border-[rgba(255,255,255,0.08)] pb-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold font-mono-code text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 px-3 py-1 rounded-xl border border-[var(--accent-secondary)]/30 shadow-[0_0_12px_rgba(var(--accent-secondary-rgb),0.2)]">
              {requirement.id}
            </span>
            <StatusBadge status={requirement.status} size="md" />
            {uncoveredCriteria.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2.5 py-1 rounded-xl border border-[var(--color-warning)]/30 shadow-[0_0_10px_rgba(var(--color-warning-rgb),0.2)] font-mono-code">
                <AlertTriangle className="w-3 h-3 text-[var(--color-warning)]" />
                {uncoveredCriteria.length} CRITERIA GAP (UNVERIFIED)
              </span>
            )}
            {isUnbound && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 rounded-xl border border-[rgba(255,255,255,0.08)] font-mono-code">
                UNBOUND SUITE
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">{requirement.title}</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {requirement.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenCopilot && (
            <button
              onClick={() => onOpenCopilot(requirement.id)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 rounded-xl transition-all shadow-[0_0_18px_rgba(var(--accent-primary-rgb),0.25)] focus:outline-none"
              title="Generate candidate test proposals with Copilot (Proposal Only)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Candidate Tests</span>
            </button>
          )}

          <button
            onClick={() => onVerify(requirement.id)}
            disabled={isVerifying}
            className="btn-command-primary px-4 py-2 text-xs flex items-center gap-2 shadow-[0_0_20px_var(--glow-primary)] disabled:opacity-50"
            title={`Execute verified test suite for ${requirement.id}`}
          >
            <Play className={`w-3.5 h-3.5 text-[var(--accent-secondary)] ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Executing Suite...' : 'Verify Requirement'}</span>
          </button>
        </div>
      </div>

      {/* Forensic State Justification Callout */}
      <div
        className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 backdrop-blur-xl ${
          requirement.status === 'VERIFIED'
            ? 'bg-[var(--color-verified)]/10 border-[var(--color-verified)]/30 text-emerald-200 shadow-[0_0_20px_rgba(var(--color-verified-rgb),0.12)]'
            : requirement.status === 'VIOLATION'
            ? 'bg-[var(--color-violation)]/12 border-[var(--color-violation)]/40 text-rose-200 shadow-[0_0_20px_rgba(var(--color-violation-rgb),0.15)]'
            : uncoveredCriteria.length > 0
            ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-amber-200 shadow-[0_0_20px_rgba(var(--color-warning-rgb),0.12)]'
            : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[var(--text-muted)]'
        }`}
      >
        <div className="font-semibold flex items-center gap-1.5 uppercase text-[11px] tracking-wider font-mono-code">
          <ShieldCheck className="w-4 h-4" />
          Status Justification (Ghost Protocol Truth Rules)
        </div>
        <div>
          {requirement.status === 'VERIFIED' ? (
            <p>
              <strong>100% Acceptance Criteria Covered & Passed.</strong> All formal criteria are bound to executable test targets and have passed under reproducible execution with sealed cryptographic evidence.
            </p>
          ) : requirement.status === 'VIOLATION' ? (
            <p>
              <strong>Specification Violation Detected.</strong> Execution of the bound test suite failed formal assertions. An actionable defect finding has been filed with reproduction instructions.
            </p>
          ) : uncoveredCriteria.length > 0 ? (
            <p>
              <strong>Coverage Gap Prevents Verification.</strong> Criterion{' '}
              <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono-code text-[#FFC857] border border-[#FFC857]/30">
                {uncoveredCriteria.map((c) => c.id).join(', ')}
              </code>{' '}
              lacks an executable test binding. Ghost Protocol strictly prohibits marking a requirement as VERIFIED when any criteria remain unproven.
            </p>
          ) : isUnbound ? (
            <p>
              <strong>Unbound Requirement.</strong> No executable test targets are registered in the catalog for this requirement. Subprocess runner returns exit code 5 (0 tests collected).
            </p>
          ) : (
            <p>
              <strong>Execution Pending.</strong> Requirement has bound test targets but has not yet been executed in the active session. Click "Verify Requirement" above to execute.
            </p>
          )}
        </div>
      </div>

      {/* Acceptance Criteria Checklist */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] flex items-center gap-2 font-mono-code">
            <CheckSquare className="w-4 h-4 text-[#6EE7FF]" />
            Formal Acceptance Criteria ({requirement.acceptance_criteria.length})
          </h3>
          <span className="text-[11px] text-[#98A2B3] font-mono-code">
            {requirement.acceptance_criteria.length - uncoveredCriteria.length} Covered /{' '}
            {uncoveredCriteria.length} Gaps
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {requirement.acceptance_criteria.map((ac) => {
            const hasTest = !!ac.linked_test && ac.linked_test.trim().length > 0;
            return (
              <div
                key={ac.id}
                className={`p-3.5 rounded-2xl border text-xs text-[var(--text-secondary)] transition-all ${
                  hasTest
                    ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-panel)]'
                    : 'bg-[#FFC857]/8 border-[#FFC857]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="font-mono-code font-bold text-[var(--color-copper)] text-[11px] shrink-0 mt-0.5">
                      {ac.id}
                    </span>
                    <div className="space-y-1">
                      <span className="leading-relaxed text-[var(--text-main)] font-medium">{ac.description}</span>
                      {hasTest ? (
                        <div className="font-mono-code text-[10px] text-[#00E7A7] truncate max-w-lg flex items-center gap-2">
                          <span>Bound: {ac.linked_test}</span>
                          <button
                            onClick={() => handleCopy(ac.linked_test || '')}
                            className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            title="Copy test target"
                          >
                            {copiedTarget === ac.linked_test ? (
                              <Check className="w-3 h-3 text-[#00E7A7]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="font-mono-code text-[10px] text-[#FFC857] flex items-center gap-1.5">
                          ⚠️ No executable test bound to this criterion. Evaluates strictly as UNVERIFIED.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {hasTest ? (
                      <span
                        className={`text-[10px] font-bold font-mono-code px-2.5 py-1 rounded-full border ${
                          ac.status === 'VERIFIED'
                            ? 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40 shadow-[0_0_10px_rgba(0,231,167,0.2)]'
                            : ac.status === 'VIOLATION'
                            ? 'bg-[#FF5D73]/15 text-[#FF5D73] border-[#FF5D73]/40 shadow-[0_0_10px_rgba(255,93,115,0.2)]'
                            : 'bg-[rgba(255,255,255,0.03)] text-[#98A2B3] border-[rgba(255,255,255,0.08)]'
                        }`}
                      >
                        {ac.status || 'UNVERIFIED'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono-code px-2.5 py-1 rounded-full border bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40">
                        GAP: UNVERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adversarial & Boundary Scenarios Section */}
      {requirement.adversarial_scenarios && requirement.adversarial_scenarios.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] flex items-center gap-2 font-mono-code">
            <ShieldAlert className="w-4 h-4 text-[#FF5D73]" />
            Adversarial & Boundary Scenarios ({requirement.adversarial_scenarios.length})
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {requirement.adversarial_scenarios.map((sc) => (
              <div
                key={sc.scenario_id}
                className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl text-xs text-[var(--text-secondary)] flex items-start justify-between gap-3 hover:border-[var(--border-panel)] transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-code text-[11px] font-bold text-[var(--color-violation)]">
                      {sc.scenario_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-secondary)] uppercase font-bold font-mono-code border border-[var(--border-subtle)]">
                      {sc.category}
                    </span>
                    <span className="font-semibold text-[var(--text-main)]">{sc.title}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{sc.description}</div>
                  <div className="font-mono-code text-[10px] text-[var(--text-muted)] truncate max-w-lg flex items-center gap-1.5">
                    <span>Target: {sc.test_target}</span>
                    <button
                      onClick={() => handleCopy(sc.test_target)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Copy scenario target"
                    >
                      {copiedTarget === sc.test_target ? (
                        <Check className="w-3 h-3 text-[#00E7A7]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {sc.executed ? (
                    <div>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold font-mono-code border ${
                          sc.outcome === 'VERIFIED'
                            ? 'bg-[#00E7A7]/15 text-[#00E7A7] border-[#00E7A7]/40 shadow-[0_0_10px_rgba(0,231,167,0.2)]'
                            : 'bg-[#FF5D73]/15 text-[#FF5D73] border-[#FF5D73]/40 shadow-[0_0_10px_rgba(255,93,115,0.2)]'
                        }`}
                      >
                        {sc.outcome || 'DONE'}
                      </span>
                      {sc.executed_at && (
                        <div className="text-[10px] text-slate-500 mt-1 font-mono-code">
                          {new Date(sc.executed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono-code bg-[rgba(255,255,255,0.03)] text-slate-500 border border-[rgba(255,255,255,0.06)]">
                      NOT EXECUTED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Bound Test Targets */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 font-mono-code">
          <FileCode className="w-4 h-4 text-[var(--color-molten-amber)]" />
          Approved Bound Test Targets
        </h3>
        {requirement.linked_tests.length === 0 ? (
          <div className="p-3.5 bg-[var(--color-warning)]/8 border border-[var(--color-warning)]/30 rounded-2xl text-xs text-[var(--color-warning)] font-mono-code">
            ⚠️ No executable test bound to this requirement in the catalog. Status is strictly UNVERIFIED.
          </div>
        ) : (
          <div className="space-y-2">
            {requirement.linked_tests.map((target, idx) => (
              <div
                key={idx}
                className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl font-mono-code text-[11px] text-[var(--color-verified)] break-all flex items-center justify-between gap-2 hover:border-[var(--color-copper)]/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  <span className="truncate">{target}</span>
                </div>
                <button
                  onClick={() => handleCopy(target)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 p-1"
                  title="Copy bound test target"
                >
                  {copiedTarget === target ? (
                    <Check className="w-3.5 h-3.5 text-[var(--color-verified)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Run History */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 font-mono-code">
            <Clock className="w-4 h-4 text-[var(--color-molten-amber)]" />
            Execution Run History ({runs.length})
          </h3>
          <span className="text-[11px] text-[var(--text-muted)] font-mono-code">
            Select a run to load authentic evidence below
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl text-center text-xs text-[#98A2B3] space-y-1">
            <p>No verification runs recorded yet for this requirement.</p>
            <p className="text-[11px] text-slate-500">
              Click "Verify Requirement" above to execute and capture cryptographic evidence.
            </p>
          </div>
        ) : (
          <div
            className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden divide-y divide-[var(--border-subtle)] max-h-[320px] overflow-y-auto"
            role="list"
            aria-label="Verification Run History"
          >
            {runs.map((run) => {
              const isSelected = run.run_id === selectedRunId;
              const isPass = run.exit_code === 0;
              return (
                <div
                  key={run.run_id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`Select run ${run.run_id}, exit code ${run.exit_code}`}
                  onClick={() => onSelectRun(run.run_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRun(run.run_id);
                    }
                  }}
                  className={`p-3.5 text-xs flex items-center justify-between cursor-pointer transition-all focus:outline-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--accent-secondary)]/15 to-transparent border-l-2 border-[var(--accent-secondary)] shadow-inner'
                      : 'hover:bg-[var(--bg-card-hover)] border-l-2 border-transparent'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-code text-[11px] font-bold text-[var(--accent-secondary)]">
                        {run.run_id}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono-code border ${
                          isPass
                            ? 'bg-[var(--color-verified)]/15 text-[var(--color-verified)] border-[var(--color-verified)]/40 shadow-[0_0_8px_rgba(var(--color-verified-rgb),0.2)]'
                            : 'bg-[var(--color-violation)]/15 text-[var(--color-violation)] border-[var(--color-violation)]/40 shadow-[0_0_8px_rgba(var(--color-violation-rgb),0.2)]'
                        }`}
                      >
                        EXIT {run.exit_code}
                      </span>
                      {run.failure_classification && run.failure_classification !== 'NONE' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono-code bg-[var(--color-violation)]/20 text-[var(--color-violation)] border border-[var(--color-violation)]/40">
                          {run.failure_classification}
                        </span>
                      )}
                      {run.finding_ids && run.finding_ids.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--color-violation)] text-white">
                          {run.finding_ids.length} Finding
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono-code truncate max-w-md">
                      {run.concise_output || run.command}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-[var(--text-muted)] shrink-0 font-mono-code">
                    <div>{new Date(run.timestamp).toLocaleTimeString()}</div>
                    <div className="text-[10px] text-[var(--text-dim)]">{run.duration_ms}ms</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
