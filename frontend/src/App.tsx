import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="border-b border-[#30363d] pb-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="text-[#58a6ff]">GHOST PROTOCOL</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                Foundation v1.0.0
              </span>
            </h1>
            <p className="text-lg font-medium text-[#8b949e] mt-1">
              "AI says Done. We demand proof."
            </p>
          </div>
          <div className="text-right text-xs text-[#8b949e]">
            Zero-Trust Independent Verification
          </div>
        </div>
      </header>

      <main className="space-y-8">
        <section className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Core Product Principles</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-[#8b949e]">
            <li className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
              <strong className="text-white block mb-1">1. Evidence before claims</strong>
              Never trust an AI agent's prose. Verification requires real execution records.
            </li>
            <li className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
              <strong className="text-white block mb-1">2. Unverified ≠ Verified</strong>
              Unverified requirements must never be marked verified without active tests.
            </li>
            <li className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
              <strong className="text-white block mb-1">3. Real test results</strong>
              Real process outputs and exit codes are distinguished from generated explanations.
            </li>
            <li className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
              <strong className="text-white block mb-1">4. Reproducible findings</strong>
              Every finding includes deterministic terminal commands and linked SHA-256 evidence.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default App;
