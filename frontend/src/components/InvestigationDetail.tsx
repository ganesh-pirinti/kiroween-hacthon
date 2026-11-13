import React from 'react';
import { Requirement, VerificationRun } from '../types';
import { StatusBadge } from './StatusBadge';
import { Play, Clock, FileCode, CheckSquare, Terminal, ShieldAlert, AlertTriangle } from 'lucide-react';

interface Props {
  requirement: Requirement | null;
  runs: VerificationRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onVerify: (requirementId: string) => Promise<void>;
  isVerifying: boolean;
}

export const InvestigationDetail: React.FC<Props> = ({
  requirement,
  runs,
  selectedRunId,
  onSelectRun,
  onVerify,
  isVerifying,
}) => {
  if (!requirement) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0d1117] border border-[#242b38] rounded-lg text-center text-xs text-[#8b949e]">
        Select a requirement from the catalog to inspect its formal criteria, run history, and evidence.
      </div>
    );
  }

  const uncoveredCriteria = requirement.acceptance_criteria.filter(
    (ac) => !ac.linked_test || !ac.linked_test.trim()
  );

  return (
    <div className="bg-[#0d1117] border border-[#242b38] rounded-lg p-5 space-y-6">
      {/* Requirement Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#242b38] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold font-mono-code text-[#58a6ff] bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
              {requirement.id}
            </span>
            <StatusBadge status={requirement.status} size="md" />
            {uncoveredCriteria.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                <AlertTriangle className="w-3 h-3" />
                {uncoveredCriteria.length} Criteria Gap{uncoveredCriteria.length > 1 ? 's' : ''} (UNVERIFIED)
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-2">{requirement.title}</h2>
          <p className="text-xs text-[#8b949e] mt-1 leading-relaxed max-w-2xl">
            {requirement.description}
          </p>
        </div>

        <button
          onClick={() => onVerify(requirement.id)}
          disabled={isVerifying}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] border border-[#388bfd]/50 rounded-md transition-all disabled:opacity-50 shadow-sm shrink-0"
        >
          <Play className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? 'Executing Suite...' : 'Verify Requirement'}
        </button>
      </div>

      {/* Acceptance Criteria Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#58a6ff]" />
            Acceptance Criteria & Test Linkage ({requirement.acceptance_criteria.length})
          </h3>
          <span className="text-[11px] text-[#8b949e]">
            {requirement.acceptance_criteria.length - uncoveredCriteria.length} Covered | {uncoveredCriteria.length} Unverified
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {requirement.acceptance_criteria.map((ac) => {
            const hasTest = !!ac.linked_test && ac.linked_test.trim().length > 0;
            return (
              <div
                key={ac.id}
                className={`p-3 rounded bg-[#161b22] border text-xs text-slate-200 transition-colors ${
                  hasTest ? 'border-[#30363d]' : 'border-amber-800/60 bg-amber-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono-code font-bold text-[#58a6ff] text-[11px] shrink-0 mt-0.5">
                      {ac.id}
                    </span>
                    <div>
                      <span className="leading-relaxed">{ac.description}</span>
                      {hasTest ? (
                        <div className="font-mono-code text-[10px] text-emerald-400 mt-1 truncate max-w-lg">
                          Bound: {ac.linked_test}
                        </div>
                      ) : (
                        <div className="font-mono-code text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                          ⚠️ No executable test bound to this criterion. Evaluates strictly as UNVERIFIED.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {hasTest ? (
                      <span
                        className={`text-[10px] font-bold font-mono-code px-2 py-0.5 rounded border ${
                          ac.status === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : ac.status === 'VIOLATION'
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {ac.status || 'UNVERIFIED'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono-code px-2 py-0.5 rounded border bg-amber-950 text-amber-400 border-amber-800">
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

      {/* Adversarial Scenarios Section */}
      {requirement.adversarial_scenarios && requirement.adversarial_scenarios.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Adversarial & Boundary Scenarios ({requirement.adversarial_scenarios.length})
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {requirement.adversarial_scenarios.map((sc) => (
              <div
                key={sc.scenario_id}
                className="p-3 bg-[#161b22] border border-[#30363d] rounded text-xs text-slate-300 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code text-[11px] font-bold text-red-400">{sc.scenario_id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold font-mono-code">
                      {sc.category}
                    </span>
                    <span className="font-semibold text-white">{sc.title}</span>
                  </div>
                  <div className="text-[11px] text-[#8b949e] mt-1">{sc.description}</div>
                  <div className="font-mono-code text-[10px] text-slate-500 mt-1 truncate max-w-lg">
                    Target: {sc.test_target}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {sc.executed ? (
                    <div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono-code border ${
                          sc.outcome === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-red-950 text-red-400 border-red-800'
                        }`}
                      >
                        EXECUTED: {sc.outcome || 'DONE'}
                      </span>
                      {sc.executed_at && (
                        <div className="text-[10px] text-slate-500 mt-1 font-mono-code">
                          {new Date(sc.executed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono-code bg-slate-900 text-slate-500 border border-slate-800">
                      NOT EXECUTED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bound Test Targets */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#58a6ff]" />
          Approved Bound Test Targets
        </h3>
        {requirement.linked_tests.length === 0 ? (
          <div className="p-3 bg-[#161b22] border border-amber-900/30 rounded text-xs text-amber-400">
            ⚠️ No executable test bound to this requirement. Evaluates strictly as UNVERIFIED.
          </div>
        ) : (
          <div className="space-y-1.5">
            {requirement.linked_tests.map((target, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#161b22] border border-[#30363d] rounded font-mono-code text-[11px] text-emerald-400 break-all flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                {target}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Run History */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#58a6ff]" />
            Execution Run History ({runs.length})
          </h3>
          <span className="text-[11px] text-[#8b949e]">Select a run to view real output</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-6 bg-[#161b22] border border-[#30363d] rounded text-center text-xs text-[#8b949e]">
            No verification runs recorded yet for this requirement. Click "Verify Requirement" above to initiate a run.
          </div>
        ) : (
          <div className="border border-[#242b38] rounded-lg overflow-hidden divide-y divide-[#242b38]">
            {runs.map((run) => {
              const isSelected = run.run_id === selectedRunId;
              const isPass = run.exit_code === 0;
              return (
                <div
                  key={run.run_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRun(run.run_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRun(run.run_id);
                    }
                  }}
                  className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#1f2937] border-l-2 border-[#58a6ff]' : 'hover:bg-[#161b22]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code text-[11px] text-[#58a6ff]">{run.run_id}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono-code ${
                          isPass
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        EXIT {run.exit_code}
                      </span>
                      {run.failure_classification && run.failure_classification !== 'NONE' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono-code bg-red-950/80 text-red-300 border border-red-800/80">
                          {run.failure_classification}
                        </span>
                      )}
                      {run.finding_ids && run.finding_ids.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-900 text-white">
                          {run.finding_ids.length} Finding
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8b949e] font-mono-code truncate max-w-md">
                      {run.concise_output || run.command}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-[#8b949e] shrink-0">
                    <div>{new Date(run.timestamp).toLocaleTimeString()}</div>
                    <div className="text-[10px] text-[#6e7681]">{run.duration_ms}ms</div>
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
