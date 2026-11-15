import React, { useState, useEffect } from 'react';
import { BenchmarkReport } from '../types';
import { api } from '../services/api';
import {
  X,
  Play,
  CheckCircle,
  BarChart3,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState<'ALL' | 'DEFECTS' | 'CLEAN'>('ALL');
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

  useEffect(() => {
    if (isOpen && !report) {
      api.getLatestBenchmark()
        .then((data) => setReport(data))
        .catch(() => {});
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.runBenchmark();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Benchmark execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCases = report?.case_results.filter((c) => {
    if (caseFilter === 'DEFECTS') return c.is_defective;
    if (caseFilter === 'CLEAN') return !c.is_defective;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[30px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="benchmark-modal-title"
    >
      <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden border-[rgba(255,255,255,0.12)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--color-copper)]/15 border border-[var(--color-copper)]/30 rounded-xl text-[var(--color-copper)] shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="benchmark-modal-title" className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code flex items-center gap-2">
                Ghost Protocol Benchmark Harness
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-[#00E7A7]/15 text-[#00E7A7] border border-[#00E7A7]/40">
                  REPRODUCIBLE
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Baseline Happy-Path Tests vs Ghost Protocol Verification across 7 Isolated Fixtures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {report && (
              <button
                onClick={handleCopyJson}
                className="btn-command-ghost px-3 py-1.5 text-xs text-[var(--color-molten-amber)] hover:text-[var(--text-main)] flex items-center gap-1.5 font-mono-code"
                title="Copy benchmark report JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00E7A7]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            )}
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="btn-command-primary px-3.5 py-1.5 text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 text-white ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Benchmark...' : report ? 'Re-run Benchmark' : 'Execute Benchmark'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-colors focus:outline-none"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--text-secondary)]">
          {error && (
            <div className="p-4 bg-[#FF5D73]/15 border border-[#FF5D73]/40 text-red-700 dark:text-red-200 rounded-2xl">
              {error}
            </div>
          )}

          {!report && isRunning && (
            <div className="text-center py-16 space-y-3">
              <Cpu className="w-10 h-10 text-[var(--color-copper)] mx-auto animate-spin" />
              <p className="text-sm font-semibold text-[var(--text-main)] font-mono-code">Executing Seeded Benchmark Suite...</p>
              <p className="text-xs text-[var(--text-muted)]">
                Evaluating 7 fixture services against baseline and adversarial verification harnesses.
              </p>
            </div>
          )}

          {!report && !isRunning && (
            <div className="text-center py-12 space-y-3">
              <Cpu className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-main)]">Benchmark Ready to Execute</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Evaluates detection accuracy across 6 intentionally seeded defects (omitted overdraft, non-atomic mutation, negative amount injection, zero amount, self-transfer, monetary fee leak) plus 1 clean reference control.
              </p>
              <button
                onClick={handleRunBenchmark}
                className="btn-command-primary px-5 py-2 text-xs font-semibold text-white mt-2"
              >
                Start Verification Benchmark
              </button>
            </div>
          )}

          {report && (
            <>
              {/* Scorecard Hero Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baseline Card */}
                <div className="p-5 rounded-2xl bg-[#FF5D73]/8 border border-[#FF5D73]/30 space-y-3 shadow-[0_0_20px_rgba(255,93,115,0.12)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#FF5D73] uppercase tracking-wider text-[11px] font-mono-code">
                      Baseline Suite (Happy-Path)
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FF5D73]/20 text-[#FF5D73] border border-[#FF5D73]/40 font-bold font-mono-code">
                      {report.baseline_metrics.defect_detection_rate}% DETECTION
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono-code text-[#FF5D73]">
                    {report.baseline_metrics.true_positives} / {report.baseline_metrics.seeded_defects_tested}
                    <span className="text-xs font-normal text-slate-400 ml-2">Defects Caught</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#FF5D73]/20 font-mono-code">
                    <div>
                      <span className="text-[#98A2B3]">Missed (FN):</span>{' '}
                      <span className="text-[#FF5D73] font-bold">{report.baseline_metrics.false_negatives}</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">False Alarms (FP):</span>{' '}
                      <span className="text-[#00E7A7] font-bold">{report.baseline_metrics.false_positives}</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">Specificity:</span>{' '}
                      <span className="text-slate-200">{report.baseline_metrics.specificity}%</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">Accuracy:</span>{' '}
                      <span className="text-slate-200">{report.baseline_metrics.accuracy}%</span>
                    </div>
                  </div>
                </div>

                {/* Ghost Protocol Card */}
                <div className="p-5 rounded-2xl bg-[#00E7A7]/8 border border-[#00E7A7]/35 space-y-3 shadow-[0_0_20px_rgba(0,231,167,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00E7A7] uppercase tracking-wider text-[11px] font-mono-code flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Ghost Protocol (Adversarial)
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#00E7A7]/20 text-[#00E7A7] border border-[#00E7A7]/40 font-bold font-mono-code">
                      {report.ghost_metrics.defect_detection_rate}% DETECTION
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono-code text-[#00E7A7]">
                    {report.ghost_metrics.true_positives} / {report.ghost_metrics.seeded_defects_tested}
                    <span className="text-xs font-normal text-slate-400 ml-2">Defects Caught</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#00E7A7]/20 font-mono-code">
                    <div>
                      <span className="text-[#98A2B3]">Missed (FN):</span>{' '}
                      <span className="text-[#00E7A7] font-bold">{report.ghost_metrics.false_negatives}</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">False Alarms (FP):</span>{' '}
                      <span className="text-[#00E7A7] font-bold">{report.ghost_metrics.false_positives}</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">Specificity:</span>{' '}
                      <span className="text-emerald-300">{report.ghost_metrics.specificity}%</span>
                    </div>
                    <div>
                      <span className="text-[#98A2B3]">Accuracy:</span>{' '}
                      <span className="text-emerald-300 font-bold">{report.ghost_metrics.accuracy}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparative Advantage Callout */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <span className="font-bold text-[var(--text-main)] text-xs uppercase tracking-wide flex items-center gap-2 font-mono-code">
                  <BarChart3 className="w-4 h-4 text-[var(--color-copper)]" />
                  Empirical Verification Conclusion
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {report.comparative_advantage.conclusion}
                </p>
                <div className="text-[11px] text-[var(--text-muted)] font-mono-code pt-1 flex items-center gap-4">
                  <span>Execution Duration: {report.execution_duration_ms}ms</span>
                  <span>Platform: {report.environment.platform}</span>
                  <span>Benchmark ID: {report.benchmark_id}</span>
                </div>
              </div>

              {/* Case Results List with Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] flex items-center gap-2 font-mono-code">
                    <Cpu className="w-4 h-4 text-[#6EE7FF]" />
                    Fixture Execution Breakdown ({filteredCases?.length})
                  </h3>

                  <div className="flex items-center gap-1.5">
                    {(['ALL', 'DEFECTS', 'CLEAN'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setCaseFilter(filter)}
                        className={`px-2.5 py-1 text-[10px] font-mono-code font-bold rounded-lg transition-all ${
                          caseFilter === filter
                            ? 'bg-[var(--color-copper)]/20 text-[var(--color-copper)] border border-[var(--color-copper)]/40 font-bold'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredCases?.map((c) => {
                    return (
                      <div
                        key={c.defect_id}
                        className={`p-3.5 rounded-2xl border text-xs transition-colors ${
                          c.is_defective
                            ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-panel)]'
                            : 'bg-[#00E7A7]/8 border-[#00E7A7]/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono-code font-bold text-[var(--color-copper)]">
                                {c.defect_id}
                              </span>
                              <span className="font-semibold text-[var(--text-main)]">{c.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] font-mono-code border border-[var(--border-subtle)]">
                                Req: {c.target_requirement}
                              </span>
                            </div>

                            <div className="text-[11px] text-[var(--text-muted)] font-mono-code">
                              {c.summary}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] text-slate-500 font-mono-code">Baseline:</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono-code font-bold ${
                                  c.baseline_classification === 'FALSE_NEGATIVE'
                                    ? 'bg-[#FF5D73]/20 text-[#FF5D73] border border-[#FF5D73]/40'
                                    : 'bg-[rgba(255,255,255,0.05)] text-slate-400'
                                }`}
                              >
                                {c.baseline_classification}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] text-slate-500 font-mono-code">Ghost:</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono-code font-bold ${
                                  c.ghost_classification === 'TRUE_POSITIVE' ||
                                  c.ghost_classification === 'TRUE_NEGATIVE'
                                    ? 'bg-[#00E7A7]/20 text-[#00E7A7] border border-[#00E7A7]/40 shadow-[0_0_8px_rgba(0,231,167,0.2)]'
                                    : 'bg-[#FF5D73]/20 text-[#FF5D73] border border-[#FF5D73]/40'
                                }`}
                              >
                                {c.ghost_classification}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex justify-end">
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
