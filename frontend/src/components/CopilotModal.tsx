import React, { useState, useEffect } from 'react';
import { CopilotReport } from '../types';
import { api } from '../services/api';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string | null;
}

export const CopilotModal: React.FC<Props> = ({ isOpen, onClose, requirementId }) => {
  const [data, setData] = useState<CopilotReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && requirementId) {
      setIsLoading(true);
      api.getCopilotProposals(requirementId)
        .then((res) => setData(res))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, requirementId]);

  if (!isOpen) return null;

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[30px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-modal-title"
    >
      <div className="glass-panel max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden border-[rgba(255,255,255,0.12)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#8B7DFF]/15 text-[#8B7DFF] border border-[#8B7DFF]/30 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="copilot-modal-title" className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                  AI Test Synthesis Copilot
                </h2>
                <span className="text-[10px] font-mono-code font-bold px-2.5 py-0.5 rounded-full bg-[#8B7DFF]/20 text-[#8B7DFF] border border-[#8B7DFF]/40">
                  PROPOSAL ONLY · NOT PROOF
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Candidate test implementations for unverified criteria gaps. Cannot certify code without execution.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Integrity Warning */}
          <div className="p-4 rounded-2xl bg-[#8B7DFF]/10 border border-[#8B7DFF]/30 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
            <div className="font-bold flex items-center gap-2 uppercase tracking-wide font-mono-code text-[#8B7DFF]">
              <Info className="w-4 h-4" />
              Ghost Protocol Integrity Axiom
            </div>
            <p className="text-[11px] text-purple-800 dark:text-purple-100 leading-relaxed font-sans">
              Ghost Protocol strictly prohibits artificial completion checkmarks. Any candidate test proposed here is purely an engineering proposal. It carries zero evidential weight until bound to catalog specifications and successfully executed through the subprocess runner.
            </p>
          </div>

          {isLoading && (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
              <RefreshCw className="w-8 h-8 text-[#8B7DFF] mx-auto animate-spin" />
              <p className="text-[var(--text-main)] font-medium font-mono-code">Synthesizing candidate test harnesses for {requirementId}...</p>
            </div>
          )}

          {!isLoading && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono-code text-[var(--text-muted)]">
                <span>Requirement: <strong className="text-[var(--text-main)]">{data.requirement_id}</strong> ({data.title})</span>
                <span>Proposals: <strong className="text-[#8B7DFF]">{data.total_proposals}</strong></span>
              </div>

              <div className="space-y-3.5">
                {data.proposals.map((prop) => (
                  <div
                    key={prop.proposal_id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 hover:border-[var(--border-panel)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-code font-bold text-xs text-[#8B7DFF]">
                            {prop.criterion_id}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-main)]">
                            {prop.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{prop.description}</p>
                      </div>

                      <button
                        onClick={() => handleCopyCode(prop.proposal_id, prop.suggested_test_path)}
                        className="btn-command-ghost px-3 py-1.5 text-xs text-[#8B7DFF] flex items-center gap-1.5 font-mono-code shrink-0"
                        title="Copy proposed test target"
                      >
                        {copiedId === prop.proposal_id ? <Check className="w-3.5 h-3.5 text-[#00E7A7]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === prop.proposal_id ? 'Copied' : 'Copy Test'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-[#030406]/90 border border-[var(--border-subtle)] p-3 overflow-x-auto">
                      <pre className="font-mono-code text-[11px] text-purple-200 whitespace-pre">
                        {prop.suggested_test_path}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-end">
          <button
            onClick={onClose}
            className="btn-command-ghost px-5 py-2 text-xs text-[var(--text-main)]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
