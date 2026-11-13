import React, { useState } from 'react';
import { Evidence, VerificationRun } from '../types';
import { Terminal, Copy, Check, ShieldCheck, Cpu, Clock, Hash } from 'lucide-react';

interface Props {
  run: VerificationRun | null;
  evidence: Evidence | null;
  isLoading: boolean;
}

export const EvidenceViewer: React.FC<Props> = ({ run, evidence, isLoading }) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const copyToClipboard = (text: string, type: 'sha' | 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha') {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-[#0d1117] border border-[#242b38] rounded-lg text-center text-xs text-[#8b949e]">
        Retrieving verified process evidence and cryptographic integrity hashes...
      </div>
    );
  }

  if (!run && !evidence) {
    return (
      <div className="p-8 bg-[#0d1117] border border-[#242b38] rounded-lg text-center text-xs text-[#8b949e]">
        Select a verification run to inspect its process log output, exit code, and cryptographic evidence.
      </div>
    );
  }

  const rawOutput = evidence?.payload || run?.concise_output || '(No raw output captured)';
  const sha256 = evidence?.integrity_metadata?.sha256 || 'HASH_PENDING';
  const command = run?.command || 'python -m pytest';

  return (
    <div className="bg-[#0d1117] border border-[#242b38] rounded-lg p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-[#242b38] pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#58a6ff]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            Forensic Evidence Log & Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code text-[#8b949e]">
            RUN: {run?.run_id}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono-code ${
              run?.exit_code === 0
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-red-950 text-red-400 border border-red-800'
            }`}
          >
            EXIT CODE {run?.exit_code}
          </span>
        </div>
      </div>

      {/* Terminal Output Console */}
      <div className="rounded-lg bg-[#05070a] border border-[#1b222c] overflow-hidden">
        <div className="px-3.5 py-2 bg-[#0a0d13] border-b border-[#1b222c] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span className="font-mono-code">pytest-process-stdout-stderr</span>
          <span className="text-[10px] font-mono-code text-[#6e7681]">
            {rawOutput.length} bytes
          </span>
        </div>
        <pre className="p-4 font-mono-code text-[11px] text-slate-200 overflow-x-auto max-h-[300px] leading-relaxed whitespace-pre-wrap selection:bg-[#58a6ff]/30">
          {rawOutput}
        </pre>
      </div>

      {/* Deterministic Reproduction Command Box */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center justify-between">
          <span>Reproduction Command (Deterministic CLI Execution)</span>
          <button
            onClick={() => copyToClipboard(command, 'cmd')}
            className="flex items-center gap-1 text-[10px] text-[#58a6ff] hover:text-[#79c0ff]"
          >
            {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedCmd ? 'Copied' : 'Copy Command'}
          </button>
        </label>
        <div className="p-2.5 bg-[#161b22] border border-[#30363d] rounded text-xs font-mono-code text-slate-300 break-all select-all">
          {command}
        </div>
      </div>

      {/* Provenance & Cryptographic Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* SHA-256 Digest Card */}
        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#58a6ff]" />
              Evidence SHA-256 Digest
            </span>
            <button
              onClick={() => copyToClipboard(sha256, 'sha')}
              className="text-[#58a6ff] hover:text-[#79c0ff]"
              title="Copy SHA-256"
            >
              {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="font-mono-code text-[11px] text-[#58a6ff] break-all select-all">
            {sha256}
          </div>
        </div>

        {/* Code Fingerprint Card */}
        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-[#58a6ff]" />
            Target Code Fingerprint
          </div>
          <div className="font-mono-code text-[11px] text-emerald-400 break-all select-all">
            {run?.code_fingerprint || 'UNAVAILABLE'}
          </div>
        </div>

        {/* Execution Duration & Timestamps */}
        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded space-y-1 text-xs text-[#8b949e]">
          <div className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#58a6ff]" />
            Execution Elapsed Time
          </div>
          <div className="flex justify-between text-[11px] pt-1">
            <span>Duration:</span>
            <span className="font-mono-code text-white">{run?.duration_ms} ms</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Start:</span>
            <span className="font-mono-code text-slate-400">
              {run?.start_time ? new Date(run.start_time).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Environment Specs */}
        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded space-y-1 text-xs text-[#8b949e]">
          <div className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-[#58a6ff]" />
            Execution Environment
          </div>
          <div className="flex justify-between text-[11px] pt-1">
            <span>Runtime:</span>
            <span className="font-mono-code text-white">
              Python {run?.environment_info?.python_version || '3.11'}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Platform:</span>
            <span className="font-mono-code text-white">
              {run?.environment_info?.platform || 'win32'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
