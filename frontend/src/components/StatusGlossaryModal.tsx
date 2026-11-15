import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusGlossaryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[30px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
    >
      <div className="glass-panel max-w-2xl w-full flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden border-[rgba(255,255,255,0.12)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-copper)]/15 text-[var(--color-copper)] border border-[var(--color-copper)]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="glossary-modal-title" className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                Ghost Protocol — Verification State Machine
              </h2>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Formal State Definitions & Cryptographic Truth Rules
              </span>
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] leading-relaxed">
            <strong className="block mb-1 text-sm font-bold font-mono-code text-[var(--color-copper)]">
              "AI says Done. We demand proof."
            </strong>
            Ghost Protocol evaluates specifications strictly against reproducible subprocess execution evidence.
            Prose statements, conversational summaries, or synthetic checkmarks from AI coding agents carry{' '}
            <strong className="text-[var(--color-violation)]">zero evidential weight</strong>.
          </div>

          <div className="space-y-3">
            {/* VERIFIED */}
            <div className="p-4 rounded-2xl bg-[#00E7A7]/8 border border-[#00E7A7]/30 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <StatusBadge status="VERIFIED" size="sm" />
                <span className="font-mono-code text-[11px] font-bold text-[#00E7A7]">
                  Process Exit Code 0 · 100% Criteria Bound
                </span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Required test targets executed and passed cleanly. All assertions defined in the formal acceptance criteria are proven under real execution, and cryptographic process evidence is permanently sealed in SQLite.
              </p>
            </div>

            {/* VIOLATION */}
            <div className="p-4 rounded-2xl bg-[#FF5D73]/8 border border-[#FF5D73]/30 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <StatusBadge status="VIOLATION" size="sm" />
                <span className="font-mono-code text-[11px] font-bold text-[#FF5D73]">
                  Process Exit Code 1 (Defect Finding)
                </span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                An executed test suite demonstrated a formal specification failure (e.g. assertion failure, unhandled error, or omitted overdraft validation). Automatically generates an actionable defect <strong>Finding</strong> with reproduction instructions.
              </p>
            </div>

            {/* BLOCKED */}
            <div className="p-4 rounded-2xl bg-[#FFC857]/8 border border-[#FFC857]/30 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <StatusBadge status="BLOCKED" size="sm" />
                <span className="font-mono-code text-[11px] font-bold text-[#FFC857]">
                  Process Timeout / Harness Error
                </span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Execution was prevented by environment errors, timeout limits (15s default), missing dependencies, or unhandled runner exceptions. Does not constitute a code pass.
              </p>
            </div>

            {/* UNVERIFIED */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center justify-between">
                <StatusBadge status="UNVERIFIED" size="sm" />
                <span className="font-mono-code text-[11px] font-bold text-[var(--text-muted)]">
                  Unbound Tests or Criteria Gaps
                </span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Default safe state. A requirement remains UNVERIFIED whenever acceptance criteria lack bound executable tests or test targets are unregistered in the catalog (e.g., PAYMENT-003, PAYMENT-006).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-end">
          <button
            onClick={onClose}
            className="btn-command-ghost px-5 py-2 text-xs text-[var(--text-main)]"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
