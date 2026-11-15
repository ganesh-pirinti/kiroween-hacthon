import React, { useState } from 'react';
import { Evidence, EvidenceVerificationResult, VerificationRun } from '../types';

type IntegrityVerificationResult = EvidenceVerificationResult;
import { api } from '../services/api';
import {
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  Lock,
  Hash,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  run: VerificationRun | null;
  evidence: Evidence | null;
  isLoading: boolean;
}

export const EvidenceViewer: React.FC<Props> = ({ run, evidence, isLoading }) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isVerifyingSeal, setIsVerifyingSeal] = useState(false);
  const [sealResult, setSealResult] = useState<IntegrityVerificationResult | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: 'sha' | 'cmd' | 'log') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha') {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    }
  };

  const handleVerifySeal = async () => {
    if (!evidence?.evidence_id) return;
    setIsVerifyingSeal(true);
    setSealError(null);
    try {
      const res = await api.verifyEvidenceIntegrity(evidence.evidence_id);
      setSealResult(res);
    } catch (err: any) {
      setSealError(err.message || 'Verification of cryptographic digest failed');
    } finally {
      setIsVerifyingSeal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-10 text-center text-xs text-[var(--text-muted)] space-y-3">
        <div className="p-3 rounded-2xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] inline-block shadow-[0_0_20px_rgba(var(--accent-secondary-rgb),0.25)]">
          <ShieldCheck className="w-6 h-6 animate-pulse" />
        </div>
        <p className="font-mono-code text-[var(--text-main)]">Retrieving verified process evidence and cryptographic integrity hashes...</p>
      </div>
    );
  }

  if (!run && !evidence) {
    return (
      <div className="glass-panel p-10 text-center text-xs text-[var(--text-muted)] space-y-2">
        <Terminal className="w-6 h-6 text-[var(--text-muted)] mx-auto opacity-50" />
        <p>Select a verification run to inspect its process log output, exit code, and cryptographic evidence.</p>
      </div>
    );
  }

  const rawOutput = evidence?.payload || run?.concise_output || '(No raw output captured)';
  const sha256 = evidence?.integrity_metadata?.sha256 || 'HASH_PENDING';
  const command = run?.command || 'python -m pytest';

  const filteredOutputLines = searchTerm
    ? rawOutput.split('\n').filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
    : null;

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Evidence Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--accent-primary)]/12 text-[var(--accent-secondary)] border border-[var(--accent-primary)]/25">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] font-mono-code">
              Forensic Evidence Log & Telemetry
            </h3>
            {evidence?.evidence_id && (
              <span className="text-[10px] font-mono-code text-[var(--accent-secondary)]">
                EVIDENCE_ID: {evidence.evidence_id}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-mono-code text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]">
            RUN: <strong className="text-[var(--text-main)]">{run?.run_id}</strong>
          </span>
          <span
            className={`text-[10px] px-3 py-1 rounded-full font-bold font-mono-code border ${
              run?.exit_code === 0
                ? 'bg-[var(--color-verified)]/15 text-[var(--color-verified)] border-[var(--color-verified)]/40 shadow-[0_0_10px_rgba(var(--color-verified-rgb),0.2)]'
                : 'bg-[var(--color-violation)]/15 text-[var(--color-violation)] border-[var(--color-violation)]/40 shadow-[0_0_10px_rgba(var(--color-violation-rgb),0.2)]'
            }`}
          >
            EXIT CODE {run?.exit_code}
          </span>
          {run?.failure_classification && run.failure_classification !== 'NONE' && (
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold font-mono-code bg-[var(--color-violation)]/20 text-[var(--color-violation)] border border-[var(--color-violation)]/40 flex items-center gap-1.5">
              <AlertOctagon className="w-3 h-3" />
              {run.failure_classification}
            </span>
          )}
        </div>
      </div>

      {/* Terminal Output Console */}
      <div className="rounded-2xl bg-[#030406]/90 border border-[rgba(255,255,255,0.09)] overflow-hidden shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] scanline-effect">
        <div className="px-4 py-2.5 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-verified)] inline-block shadow-[0_0_8px_var(--color-verified)]" />
            <span className="font-mono-code text-slate-200">pytest-process-stdout-stderr</span>
            <span className="text-[10px] font-mono-code text-[var(--text-dim)]">
              {rawOutput.length} bytes · {rawOutput.split('\n').length} lines
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find in log..."
                className="pl-7 pr-2.5 py-1 text-[10px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-secondary)]/60 font-mono-code"
              />
            </div>
            <button
              onClick={() => copyToClipboard(rawOutput, 'log')}
              className="flex items-center gap-1.5 text-[10px] text-[var(--accent-secondary)] hover:text-[var(--text-main)] px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:bg-[var(--accent-secondary)]/10 transition-all font-mono-code"
              title="Copy complete raw process log"
            >
              {copiedLog ? <Check className="w-3 h-3 text-[var(--color-verified)]" /> : <Copy className="w-3 h-3" />}
              {copiedLog ? 'Copied' : 'Copy Raw Log'}
            </button>
          </div>
        </div>

        <pre className="p-5 font-mono-code text-[11px] text-slate-200 overflow-x-auto max-h-[340px] leading-relaxed whitespace-pre-wrap selection:bg-[var(--accent-primary)]/30">
          {filteredOutputLines ? filteredOutputLines.join('\n') : rawOutput}
        </pre>
      </div>

      {/* Deterministic Reproduction Command Box */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono-code flex items-center justify-between">
          <span>Deterministic CLI Reproduction Command</span>
          <button
            onClick={() => copyToClipboard(command, 'cmd')}
            className="flex items-center gap-1 text-[10px] text-[var(--color-molten-amber)] hover:underline focus:outline-none"
          >
            {copiedCmd ? <Check className="w-3 h-3 text-[var(--color-verified)]" /> : <Copy className="w-3 h-3" />}
            {copiedCmd ? 'Copied' : 'Copy CLI Command'}
          </button>
        </label>
        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs font-mono-code text-[var(--text-secondary)] break-all select-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-molten-amber)] select-none font-bold">$</span>
            <span className="text-[var(--text-main)] font-semibold">{command}</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Seal Verification & Integrity Card */}
      <div className="glass-card-secondary p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code block">
                Cryptographic Integrity Seal & Audit Provenance
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                SHA-256 process payload digest stored in immutable SQLite ledger
              </span>
            </div>
          </div>

          {evidence?.evidence_id && (
            <button
              onClick={handleVerifySeal}
              disabled={isVerifyingSeal}
              className="btn-command-primary px-3.5 py-1.5 text-[11px] flex items-center gap-2 disabled:opacity-50"
              title="Cryptographically verify SHA-256 seal and trace run in database"
            >
              <ShieldCheck className={`w-3.5 h-3.5 text-white ${isVerifyingSeal ? 'animate-spin' : ''}`} />
              <span>{isVerifyingSeal ? 'Verifying Seal...' : 'Verify Cryptographic Seal'}</span>
            </button>
          )}
        </div>

        {/* Live Seal Verification Result Banner */}
        {sealResult && (
          <div className="p-4 rounded-2xl bg-[var(--color-verified)]/10 border border-[var(--color-verified)]/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-verified)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[var(--text-main)] block">
                Cryptographic Seal Verified (Authentic Artifact)
              </span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Stored SHA-256 digest matches live recomputed payload hash. Verification run{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-black/50 font-mono-code text-[var(--text-main)]">
                  {sealResult.run_id}
                </code>{' '}
                is authentically traced in the SQLite evidence ledger.
              </p>
              <div className="text-[10px] text-[var(--color-verified)] font-mono-code">
                Verified at: {new Date(sealResult.verified_at).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {sealError && (
          <div className="p-4 rounded-2xl bg-[var(--color-violation)]/15 border border-[var(--color-violation)]/40 text-xs text-red-800 dark:text-red-200 flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[var(--color-violation)] shrink-0" />
            <span>Integrity Verification Failed: {sealError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* SHA-256 Digest Box */}
          <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--text-main)] font-mono-code">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                Evidence SHA-256 Digest
              </span>
              <button
                onClick={() => copyToClipboard(sha256, 'sha')}
                className="text-[var(--accent-secondary)] hover:underline"
                title="Copy SHA-256 digest"
              >
                {copiedSha ? (
                  <Check className="w-3.5 h-3.5 text-[var(--color-verified)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="font-mono-code text-[11px] text-[var(--accent-secondary)] break-all select-all bg-black/5 dark:bg-black/40 p-2 rounded-xl border border-[var(--border-subtle)]">
              {sha256}
            </div>
          </div>

          {/* Code & Test Fingerprints */}
          <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5 font-mono-code">
              <Hash className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Code & Test Fingerprints
            </div>
            <div className="space-y-1.5 font-mono-code text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Code Fingerprint:</span>
                <span
                  className="text-[var(--color-verified)] truncate max-w-[200px]"
                  title={run?.code_fingerprint}
                >
                  {run?.code_fingerprint ? `${run.code_fingerprint.slice(0, 24)}...` : 'UNAVAILABLE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Test Fingerprint:</span>
                <span
                  className="text-[var(--accent-secondary)] truncate max-w-[200px]"
                  title={run?.test_fingerprint}
                >
                  {run?.test_fingerprint ? `${run.test_fingerprint.slice(0, 24)}...` : 'UNAVAILABLE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps & Environment Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] text-[var(--text-muted)] font-mono-code pt-1">
          <div className="p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
            <span className="block text-[10px] text-[var(--text-muted)]">Duration</span>
            <span className="text-[var(--text-main)] font-bold">{run?.duration_ms ?? 0} ms</span>
          </div>
          <div className="p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
            <span className="block text-[10px] text-[var(--text-muted)]">Timestamp</span>
            <span className="text-[var(--text-secondary)]">
              {run?.timestamp ? new Date(run.timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
          <div className="p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
            <span className="block text-[10px] text-[var(--text-muted)]">Execution Status</span>
            <span className="text-[var(--color-verified)] font-bold">{run?.execution_status ?? 'COMPLETED'}</span>
          </div>
          <div className="p-2.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
            <span className="block text-[10px] text-[var(--text-muted)]">Artifact Type</span>
            <span className="text-[var(--text-secondary)]">{evidence?.artifact_type ?? 'PROCESS_LOG'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
