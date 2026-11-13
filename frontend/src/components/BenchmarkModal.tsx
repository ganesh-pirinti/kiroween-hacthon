import React, { useState } from 'react';
import { BenchmarkReport } from '../types';
import { api } from '../services/api';
import { X, Play, ShieldAlert, CheckCircle, BarChart3, AlertTriangle, Cpu } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0d1117] border border-[#242b38] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#242b38] bg-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1f6feb]/10 border border-[#1f6feb]/30 rounded-lg text-[#58a6ff]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Ghost Protocol Benchmark Harness
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  REPRODUCIBLE
                </span>
              </h2>
              <p className="text-xs text-[#8b949e]">
                Baseline Happy-Path Tests vs Ghost Protocol Verification across 7 Isolated Fixtures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] rounded-md transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Benchmark...' : report ? 'Re-run Benchmark' : 'Execute Benchmark'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-md">
              {error}
            </div>
          )}

          {!report && !isRunning && (
            <div className="text-center py-12 space-y-3">
              <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Benchmark Ready to Execute</p>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                Evaluates detection accuracy across 6 intentionally seeded defects (omitted overdraft, non-atomic mutation, negative amount injection, zero amount, self-transfer, monetary fee leak) plus 1 clean reference control.
              </p>
              <button
                onClick={handleRunBenchmark}
                className="mt-2 px-4 py-2 bg-[#1f6feb] text-white rounded font-semibold text-xs hover:bg-[#388bfd]"
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
                <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Baseline Suite (Happy-Path)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold font-mono-code">
                      {report.baseline_metrics.defect_detection_rate}% DETECTION
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono-code text-red-400">
                    {report.baseline_metrics.true_positives} / {report.baseline_metrics.seeded_defects_tested}
                    <span className="text-xs font-normal text-slate-400 ml-2">Defects Caught</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#30363d]/50">
                    <div>
                      <span className="text-slate-500">False Negatives (Missed):</span>{' '}
                      <span className="text-red-400 font-bold">{report.baseline_metrics.false_negatives}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">False Alarms (FP):</span>{' '}
                      <span className="text-emerald-400 font-bold">{report.baseline_metrics.false_positives}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Clean Specificity:</span>{' '}
                      <span className="text-slate-200">{report.baseline_metrics.specificity}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Suite Accuracy:</span>{' '}
                      <span className="text-slate-200">{report.baseline_metrics.accuracy}%</span>
                    </div>
                  </div>
                </div>

                {/* Ghost Protocol Card */}
                <div className="p-4 bg-[#161b22] border border-emerald-900/60 rounded-lg space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Ghost Protocol (Adversarial)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold font-mono-code">
                      {report.ghost_metrics.defect_detection_rate}% DETECTION
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono-code text-emerald-400">
                    {report.ghost_metrics.true_positives} / {report.ghost_metrics.seeded_defects_tested}
                    <span className="text-xs font-normal text-slate-400 ml-2">Defects Caught</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-950">
                    <div>
                      <span className="text-slate-500">False Negatives (Missed):</span>{' '}
                      <span className="text-emerald-400 font-bold">{report.ghost_metrics.false_negatives}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">False Alarms (FP):</span>{' '}
                      <span className="text-emerald-400 font-bold">{report.ghost_metrics.false_positives}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Clean Specificity:</span>{' '}
                      <span className="text-emerald-300">{report.ghost_metrics.specificity}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Suite Accuracy:</span>{' '}
                      <span className="text-emerald-300 font-bold">{report.ghost_metrics.accuracy}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Conclusion Banner */}
              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-xs leading-relaxed text-slate-300">
                <span className="font-bold text-[#58a6ff]">Benchmark Conclusion: </span>
                {report.comparative_advantage.conclusion} Execution finished in{' '}
                <span className="font-mono-code text-white font-bold">{report.execution_duration_ms}ms</span> in an isolated environment.
              </div>

              {/* Detailed Breakdown Matrix Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                  Fixture-by-Fixture Verification Breakdown
                </h3>
                <div className="border border-[#242b38] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#242b38]">
                      <tr>
                        <th className="p-2.5 font-semibold">Fixture ID</th>
                        <th className="p-2.5 font-semibold">Requirement</th>
                        <th className="p-2.5 font-semibold">Type</th>
                        <th className="p-2.5 font-semibold">Baseline Outcome</th>
                        <th className="p-2.5 font-semibold">Ghost Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242b38]">
                      {report.case_results.map((c) => (
                        <tr key={c.defect_id} className="hover:bg-[#161b22]/50 transition-colors">
                          <td className="p-2.5 font-mono-code font-bold text-slate-200">
                            {c.defect_id}
                            <div className="text-[10px] text-slate-400 font-normal">{c.name}</div>
                          </td>
                          <td className="p-2.5 font-mono-code text-[#58a6ff]">{c.target_requirement}</td>
                          <td className="p-2.5">
                            {c.is_defective ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono-code bg-red-950 text-red-400 border border-red-800">
                                SEEDED DEFECT
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono-code bg-emerald-950 text-emerald-400 border border-emerald-800">
                                CLEAN CONTROL
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono-code text-[11px]">
                            {c.baseline_classification === 'FALSE_NEGATIVE' ? (
                              <span className="text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                MISSED (FN)
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                CLEAN (TN)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono-code text-[11px]">
                            {c.ghost_classification === 'TRUE_POSITIVE' ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                CAUGHT (TP - {c.ghost_findings_count} violations)
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                CLEAN PASS (TN)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Execution Environment & Methodology */}
              <div className="p-3 bg-[#161b22]/50 border border-[#30363d] rounded text-[11px] text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500 font-semibold">Environment:</span> Python {report.environment.python_version} ({report.environment.platform} - {report.environment.os})
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Methodology:</span> {report.methodology.isolation} {report.methodology.verification}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
