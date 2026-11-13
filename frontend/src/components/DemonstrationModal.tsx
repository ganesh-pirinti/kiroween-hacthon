import React from 'react';
import { DemonstrationResult } from '../types';
import { X, ShieldAlert, CheckCircle2, FlaskConical } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: DemonstrationResult | null;
  isLoading: boolean;
}

export const DemonstrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  result,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-[#242b38] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#242b38] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Ground-Truth Demonstration: PAYMENT-004 Overdraft Protection
              </h2>
              <p className="text-xs text-[#8b949e]">
                Comparing real execution outcomes: Vulnerable baseline vs. Corrected implementation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Target Scenario Card */}
          <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs space-y-1.5">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Scenario Definition (PAYMENT-004)
            </span>
            <p className="text-slate-300 leading-relaxed">
              "When a transfer amount exceeds the sender's available balance, the transfer must be rejected and neither account balance may change."
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono-code text-[11px]">
              <div className="p-2 bg-[#0d1117] rounded border border-[#242b38]">
                <span className="text-[#8b949e] block text-[10px]">Initial Sender Balance</span>
                <span className="text-white font-bold">₹10,000</span>
              </div>
              <div className="p-2 bg-[#0d1117] rounded border border-[#242b38]">
                <span className="text-[#8b949e] block text-[10px]">Attempted Transfer</span>
                <span className="text-red-400 font-bold">₹15,000</span>
              </div>
              <div className="p-2 bg-[#0d1117] rounded border border-[#242b38]">
                <span className="text-[#8b949e] block text-[10px]">Expected Outcome</span>
                <span className="text-emerald-400 font-bold">Rejected; Balances Intact</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#8b949e] space-y-2">
              <FlaskConical className="w-8 h-8 text-[#58a6ff] mx-auto animate-spin" />
              <p>Executing adversarial subprocess test suites in isolated runner...</p>
            </div>
          ) : result ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Vulnerable Run */}
              <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/50 space-y-3">
                <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-red-200 uppercase tracking-wide">
                      1. Vulnerable Fixture Run
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono-code bg-red-900 text-red-100 border border-red-700">
                    EXIT {result.vulnerable_run.exit_code} (VIOLATION)
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-[#8b949e]">Run ID:</span>{' '}
                    <span className="font-mono-code text-white">{result.vulnerable_run.run_id}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">Real Process Result:</span>{' '}
                    <span className="font-mono-code text-red-400 block p-2 bg-[#0a0d14] rounded border border-red-900/50 mt-1">
                      {result.vulnerable_run.concise_output}
                    </span>
                  </div>
                </div>

                {result.vulnerable_run.finding && (
                  <div className="p-2.5 bg-red-900/40 rounded border border-red-700/60 text-[11px] space-y-1">
                    <span className="font-bold text-red-200 block">
                      Discovered Defect ({result.vulnerable_run.finding.finding_id}):
                    </span>
                    <p className="text-red-100">{result.vulnerable_run.finding.explanation}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Corrected Run */}
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                      2. Corrected Implementation Run
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono-code bg-emerald-900 text-emerald-100 border border-emerald-700">
                    EXIT {result.corrected_run.exit_code} (VERIFIED)
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-[#8b949e]">Run ID:</span>{' '}
                    <span className="font-mono-code text-white">{result.corrected_run.run_id}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">Real Process Result:</span>{' '}
                    <span className="font-mono-code text-emerald-400 block p-2 bg-[#0a0d14] rounded border border-emerald-900/50 mt-1">
                      {result.corrected_run.concise_output}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-900/30 rounded border border-emerald-700/50 text-[11px] space-y-1">
                  <span className="font-bold text-emerald-200 block">Specification Satisfied:</span>
                  <p className="text-emerald-100">
                    Transfer strictly rejected with InsufficientFundsError; both sender and recipient balances remain unmodified.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#8b949e]">
              No demonstration execution data currently available.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#242b38] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-white rounded transition-colors"
          >
            Close Demonstration
          </button>
        </div>
      </div>
    </div>
  );
};
