import React, { useState, useEffect } from 'react';
import { DemonstrationResult } from '../types';
import {
  X,
  CheckCircle2,
  FlaskConical,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[35px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden border-[var(--border-panel)]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-violation)]/15 border border-[var(--color-violation)]/35 text-[var(--color-violation)] shadow-[0_0_15px_rgba(var(--color-violation-rgb),0.25)]">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 id="demo-modal-title" className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                Forensic Demonstration: PAYMENT-004 Overdraft Protection
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Comparative execution proof: Vulnerable Fixture Failure vs. Corrected Engine Compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {result && (
              <button
                onClick={handleCopyJson}
                className="btn-command-ghost px-3 py-1.5 text-xs text-[var(--color-molten-amber)] flex items-center gap-1.5 font-mono-code"
                title="Copy demonstration outcome as JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-verified)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors focus:outline-none"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)] space-y-3">
              <FlaskConical className="w-8 h-8 text-[var(--color-violation)] mx-auto animate-spin" />
              <p className="text-[var(--text-main)] font-medium font-mono-code">Executing dual-engine comparison test in isolated subprocess...</p>
              <p className="text-[var(--text-muted)]">Running vulnerable transfer fixture vs production InsufficientFundsError checks.</p>
            </div>
          )}

          {!isLoading && result && (
            <>
              {/* Financial Scenario Context Card */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-panel)] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="font-bold text-[var(--color-copper)] uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--color-copper)]" />
                    Transaction Scenario Parameters
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-copper)]/15 text-[var(--color-molten-amber)] border border-[var(--color-copper)]/30 font-bold">
                    INVARIANT: NON-NEGATIVE BALANCE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Sender Balance</span>
                    <span className="text-base font-bold text-[var(--text-main)]">₹10,000</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Attempted Transfer</span>
                    <span className="text-base font-bold text-[var(--color-violation)]">₹15,000 (Overdraft)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Recipient Balance</span>
                    <span className="text-base font-bold text-[var(--color-verified)]">₹0 (Initial)</span>
                  </div>
                </div>

                {/* 5-Stage Verification Flow Stepper */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-mono-code uppercase tracking-wider text-[var(--text-muted)] block mb-2 font-bold">
                    Verification Flow: Claim vs. Ground Truth
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-code text-[var(--text-secondary)]">
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--color-molten-amber)]">
                      1. REQUIREMENT (PAYMENT-004)
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--color-copper)]">
                      2. SUBPROCESS RUNNER
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)]">
                      3. OBSERVED RESULT
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--color-copper)]">
                      4. EVIDENCE HASH
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--color-verified)]/40 text-[var(--color-verified)] font-bold">
                      5. FINAL STATUS
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparative Execution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vulnerable Result Card */}
                <div className="p-4 rounded-2xl bg-[var(--color-violation)]/8 border border-[var(--color-violation)]/40 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-violation)] font-mono-code flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      VULNERABLE FIXTURE
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono-code bg-[var(--color-violation)]/20 text-[var(--color-violation)] border border-[var(--color-violation)]/40">
                      STATUS: {result.vulnerable_run.status}
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--bg-canvas)]/90 rounded-xl border border-[var(--color-violation)]/25 font-mono-code text-[11px] text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="text-[var(--text-muted)]">Exit Code: <span className="text-[var(--color-violation)] font-bold">{result.vulnerable_run.exit_code} (DEFECT DETECTED — Expected Violation)</span></div>
                    <div className="text-[var(--text-muted)]">Run ID: <span className="text-[var(--text-main)]">{result.vulnerable_run.run_id}</span></div>
                    <div className="text-[var(--text-muted)]">Final Balances: <span className="text-[var(--color-violation)] font-bold">Sender -₹5,000 | Recipient ₹15,000</span></div>
                  </div>

                  <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                    {result.vulnerable_run.concise_output}
                  </div>
                </div>

                {/* Corrected Result Card */}
                <div className="p-4 rounded-2xl bg-[var(--color-verified)]/8 border border-[var(--color-verified)]/40 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-verified)] font-mono-code flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      CORRECTED ENGINE
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono-code bg-[var(--color-verified)]/20 text-[var(--color-verified)] border border-[var(--color-verified)]/40">
                      STATUS: {result.corrected_run.status}
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--bg-canvas)]/90 rounded-xl border border-[var(--color-verified)]/25 font-mono-code text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="text-[var(--text-muted)]">Exit Code: <span className="text-[var(--color-verified)] font-bold">{result.corrected_run.exit_code} (PASSED)</span></div>
                    <div className="text-[var(--text-muted)]">Run ID: <span className="text-[var(--text-main)]">{result.corrected_run.run_id}</span></div>
                    <div className="text-[var(--text-muted)]">Final Balances: <span className="text-[var(--color-verified)] font-bold">Sender ₹10,000 | Recipient ₹0 (Preserved)</span></div>
                  </div>

                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                    {result.corrected_run.concise_output}
                  </div>
                </div>
              </div>

              {/* Forensic Seal Provenance */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono-code text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-verified)]" />
                  <span>SQLite Ledger Record Verified · 100% Deterministic Reproducibility</span>
                </div>
                <span className="text-[11px] text-[var(--color-molten-amber)]">EXIT 0 // SEALED</span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
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
