import React, { useState, useEffect } from 'react';
import { AuditReportResponse } from '../types';
import { api } from '../services/api';
import {
  X,
  Download,
  Copy,
  Check,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [report, setReport] = useState<AuditReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const loadReport = async (fmt: 'markdown' | 'json') => {
    setIsLoading(true);
    try {
      const data = await api.getAuditReport(fmt);
      setReport(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport(format);
    }
  }, [isOpen, format]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report.content], {
      type: format === 'markdown' ? 'text/markdown' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghost_protocol_audit_report_${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[30px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[var(--panel-shadow)] overflow-hidden border-[var(--border-panel)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-copper)]/15 text-[var(--color-copper)] border border-[var(--color-copper)]/30 shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="audit-modal-title" className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code flex items-center gap-2">
                Formal Compliance Audit Report
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-[#00E7A7]/15 text-[#00E7A7] border border-[#00E7A7]/40">
                  EXPORT READY
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Comprehensive formal audit certificate with system telemetry, scorecard, criteria matrix, and cryptographic hashes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex items-center rounded-xl bg-[var(--bg-card)] p-1 border border-[var(--border-subtle)]">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1 text-xs font-mono-code font-bold rounded-lg transition-all ${
                  format === 'markdown'
                    ? 'bg-[var(--color-copper)]/20 text-[var(--color-copper)] border border-[var(--color-copper)]/30 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-3 py-1 text-xs font-mono-code font-bold rounded-lg transition-all ${
                  format === 'json'
                    ? 'bg-[var(--color-copper)]/20 text-[var(--color-copper)] border border-[var(--color-copper)]/30 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors focus:outline-none"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading && (
            <div className="p-16 text-center text-xs text-[var(--text-muted)] space-y-3">
              <RefreshCw className="w-8 h-8 text-[var(--color-molten)] mx-auto animate-spin" />
              <p className="text-[var(--text-main)] font-medium font-mono-code">Compiling formal verification report from SQLite ledger...</p>
            </div>
          )}

          {!isLoading && report && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono-code">
                <span>Generated At: {new Date(report.generated_at).toLocaleString()}</span>
                <span>Format: {report.format.toUpperCase()}</span>
              </div>

              <div className="rounded-2xl bg-[#030406]/95 border border-[var(--border-subtle)] p-5 overflow-x-auto max-h-[500px] shadow-inner">
                <pre className="font-mono-code text-[11px] text-slate-200 leading-relaxed whitespace-pre selection:bg-[#6EE7FF]/30">
                  {report.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-mono-code">
            Immutable SHA-256 Provenance Embedded
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="btn-command-ghost px-4 py-2 text-xs flex items-center gap-1.5 font-mono-code text-[var(--text-main)]"
              title="Copy audit report text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-verified)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="btn-command-primary px-4 py-2 text-xs flex items-center gap-1.5"
              title="Download formal audit report file"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download .{format === 'markdown' ? 'md' : 'json'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
