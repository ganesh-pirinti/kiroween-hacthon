import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusGlossaryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-[#242b38] rounded-xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#242b38] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#58a6ff]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Ghost Protocol — Verification State Machine
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-[#161b22] rounded border border-[#30363d] text-slate-300 leading-relaxed">
            <strong className="text-white block mb-1">"AI says Done. We demand proof."</strong>
            Ghost Protocol evaluates requirements strictly against reproducible execution evidence.
            Prose statements from AI coding agents have zero evidential weight.
          </div>

          <div className="space-y-3">
            {/* VERIFIED */}
            <div className="p-3 rounded bg-[#161b22] border border-emerald-900/40 space-y-1">
              <div className="flex items-center justify-between">
                <StatusBadge status="VERIFIED" size="sm" />
                <span className="font-mono-code text-[10px] text-emerald-400">Process Exit Code 0</span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                Required checks have executed and passed with cryptographic evidence.
                All assertions defined in the formal acceptance criteria are satisfied under real execution.
              </p>
            </div>

            {/* VIOLATION */}
            <div className="p-3 rounded bg-[#161b22] border border-red-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <StatusBadge status="VIOLATION" size="sm" />
                <span className="font-mono-code text-[10px] text-red-400">Process Exit Code 1</span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                At least one executed check demonstrates a requirement failure (e.g. assertion mismatch,
                unhandled exception, or missing overdraft check). Automatically generates a defect Finding.
              </p>
            </div>

            {/* BLOCKED */}
            <div className="p-3 rounded bg-[#161b22] border border-amber-900/40 space-y-1">
              <div className="flex items-center justify-between">
                <StatusBadge status="BLOCKED" size="sm" />
                <span className="font-mono-code text-[10px] text-amber-400">Exit Code 2, 3, 4 / Timeout</span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                Execution could not complete because of a dependency, environment, syntax error, or safety restriction.
                <strong>Never represented as a failure of the target feature.</strong>
              </p>
            </div>

            {/* UNVERIFIED */}
            <div className="p-3 rounded bg-[#161b22] border border-[#242b38] space-y-1">
              <div className="flex items-center justify-between">
                <StatusBadge status="UNVERIFIED" size="sm" />
                <span className="font-mono-code text-[10px] text-slate-400">Exit Code 5 / Unbound</span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                Insufficient evidence exists to make a reliable conclusion; the requirement has no bound test suite,
                or 0 matching tests were collected. <strong>Never converted into a pass.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#161b22] border-t border-[#242b38] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-white rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
