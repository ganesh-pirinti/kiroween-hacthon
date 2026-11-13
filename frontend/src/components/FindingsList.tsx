import React from 'react';
import { Finding } from '../types';
import { Terminal, ArrowRight, ShieldAlert, Code } from 'lucide-react';

interface Props {
  findings: Finding[];
  onSelectRequirement: (requirementId: string) => void;
}

export const FindingsList: React.FC<Props> = ({ findings, onSelectRequirement }) => {
  if (findings.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-[#242b38] rounded-lg p-6 text-center text-xs text-[#8b949e]">
        Zero active defects or specification violations detected. All executed runs satisfy their formal acceptance criteria.
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-red-950/40 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#242b38] pb-3">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Active Specification Violations ({findings.length})
        </div>
        <span className="text-[11px] text-[#8b949e]">Supported by real test evidence</span>
      </div>

      <div className="space-y-3">
        {findings.map((f) => {
          const isCritical = f.severity === 'CRITICAL';
          return (
            <div
              key={f.finding_id}
              className={`p-4 rounded-lg border transition-all ${
                isCritical
                  ? 'bg-red-950/20 border-red-500/50 shadow-sm'
                  : 'bg-[#161b22] border-[#30363d]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono-code ${
                      isCritical
                        ? 'bg-red-900 text-red-200 border border-red-700'
                        : 'bg-amber-900 text-amber-200 border border-amber-700'
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="font-mono-code text-xs font-bold text-white">
                    {f.finding_id}
                  </span>
                  <span className="text-xs text-[#8b949e]">on</span>
                  <button
                    onClick={() => onSelectRequirement(f.requirement_id)}
                    className="font-mono-code text-xs font-bold text-[#58a6ff] hover:underline flex items-center gap-1"
                  >
                    {f.requirement_id}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] text-[#8b949e]">
                  {new Date(f.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Technical Explanation */}
              <p className="mt-2 text-xs font-medium text-red-200 leading-relaxed">
                {f.explanation}
              </p>

              {/* Real Code Context / Vulnerability Note */}
              {f.requirement_id === 'PAYMENT-004' && (
                <div className="mt-3 p-3 bg-[#0a0d14] rounded border border-red-900/40 text-[11px] font-mono-code space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                    <Code className="w-3.5 h-3.5" />
                    Vulnerability Root Cause (PAYMENT-004 Defect)
                  </div>
                  <div className="text-slate-300">
                    <span className="text-red-400 font-bold">- Omitted:</span> `if sender.balance &lt; amt: raise InsufficientFundsError`
                  </div>
                  <div className="text-slate-300">
                    <span className="text-emerald-400 font-bold">+ Fix:</span> Enforce available balance check before executing debit & credit.
                  </div>
                </div>
              )}

              {/* Reproduction Instruction Box */}
              <div className="mt-3 pt-2 border-t border-[#30363d]/50 flex items-center gap-2 text-[11px] text-[#8b949e]">
                <Terminal className="w-3 h-3 text-[#58a6ff] shrink-0" />
                <span className="font-mono-code text-[10px] text-slate-300 truncate">
                  {f.reproduction_instructions}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
