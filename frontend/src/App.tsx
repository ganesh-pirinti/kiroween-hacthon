import React, { useEffect, useState, useCallback } from 'react';
import {
  DemonstrationResult,
  Evidence,
  Finding,
  Requirement,
  SystemHealth,
  VerificationRun,
} from './types';
import { api } from './services/api';
import { InvestigationOverview } from './components/InvestigationOverview';
import { RequirementsExplorer } from './components/RequirementsExplorer';
import { InvestigationDetail } from './components/InvestigationDetail';
import { EvidenceViewer } from './components/EvidenceViewer';
import { FindingsList } from './components/FindingsList';
import { DemonstrationModal } from './components/DemonstrationModal';
import { StatusGlossaryModal } from './components/StatusGlossaryModal';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<VerificationRun | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState<boolean>(false);
  const [isDemonstrating, setIsDemonstrating] = useState<boolean>(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [demonstrationResult, setDemonstrationResult] = useState<DemonstrationResult | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);

  // Load Initial Data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [healthData, reqsData, findingsData] = await Promise.all([
        api.getHealth(),
        api.getRequirements(),
        api.getFindings(),
      ]);
      setHealth(healthData);
      setRequirements(reqsData);
      setFindings(findingsData);

      // Default to PAYMENT-004 if available, or first requirement
      const targetReq =
        reqsData.find((r) => r.id === 'PAYMENT-004') || reqsData[0];
      if (targetReq) {
        setSelectedRequirementId(targetReq.id);
      }
    } catch (err: any) {
      setErrorMessage(
        `Failed to connect to Ghost Protocol API: ${err.message}. Ensure the FastAPI backend is running on port 8000.`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load runs whenever selected requirement changes
  useEffect(() => {
    if (!selectedRequirementId) return;

    const loadRuns = async () => {
      try {
        const runHistory = await api.getRuns(selectedRequirementId);
        setRuns(runHistory);

        // Select the most recent run if available
        if (runHistory.length > 0) {
          const latest = runHistory[0];
          setSelectedRunId(latest.run_id);
          setSelectedRun(latest);
        } else {
          setSelectedRunId(null);
          setSelectedRun(null);
          setEvidence(null);
        }
      } catch {
        setRuns([]);
      }
    };

    loadRuns();
  }, [selectedRequirementId]);

  // Load evidence whenever selected run changes
  useEffect(() => {
    if (!selectedRunId) {
      setEvidence(null);
      return;
    }

    const loadEvidenceForRun = async () => {
      setIsLoadingEvidence(true);
      try {
        // Find evidence by run
        const runObj = runs.find((r) => r.run_id === selectedRunId);
        setSelectedRun(runObj || null);

        // Fetch evidence for this requirement run
        const allFindings = await api.getFindings(selectedRequirementId || undefined);
        setFindings(allFindings);

        // Fetch evidence directly if we have an evidence ID in findings, or search runs
        // If runObj has finding_ids, fetch findings
        if (runObj) {
          // Check if evidence exists in API
          try {
            // Fetch latest evidence for run
            const runEvList = await fetch(`/api/v1/runs/${runObj.run_id}`)
              .then((r) => r.json())
              .catch(() => null);
            if (runEvList) {
              // Evidence is fetched from direct endpoint
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setIsLoadingEvidence(false);
      }
    };

    loadEvidenceForRun();
  }, [selectedRunId, runs, selectedRequirementId]);

  // Handle on-demand verification for a requirement
  const handleVerifyRequirement = async (id: string) => {
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const result = await api.verifyRequirement(id);

      // Update requirement in state
      setRequirements((prev) =>
        prev.map((r) => (r.id === result.requirement.id ? result.requirement : r))
      );

      // Refresh runs list
      const runHistory = await api.getRuns(id);
      setRuns(runHistory);
      setSelectedRunId(result.run.run_id);
      setSelectedRun(result.run);
      if (result.evidence) {
        setEvidence(result.evidence);
      }

      // Refresh findings
      const allFindings = await api.getFindings();
      setFindings(allFindings);
    } catch (err: any) {
      setErrorMessage(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Verify All
  const handleVerifyAll = async () => {
    setIsVerifyingAll(true);
    setErrorMessage(null);
    try {
      await api.verifyAll();
      const [updatedReqs, updatedFindings] = await Promise.all([
        api.getRequirements(),
        api.getFindings(),
      ]);
      setRequirements(updatedReqs);
      setFindings(updatedFindings);

      if (selectedRequirementId) {
        const runHistory = await api.getRuns(selectedRequirementId);
        setRuns(runHistory);
        if (runHistory.length > 0) {
          setSelectedRunId(runHistory[0].run_id);
          setSelectedRun(runHistory[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Bulk verification failed: ${err.message}`);
    } finally {
      setIsVerifyingAll(false);
    }
  };

  // Handle Demonstration
  const handleRunDemonstration = async () => {
    setIsDemonstrating(true);
    setShowDemoModal(true);
    setDemonstrationResult(null);
    try {
      const demo = await api.runDemonstration();
      setDemonstrationResult(demo);

      // Refresh background data
      const [updatedReqs, updatedFindings] = await Promise.all([
        api.getRequirements(),
        api.getFindings(),
      ]);
      setRequirements(updatedReqs);
      setFindings(updatedFindings);
    } catch (err: any) {
      setErrorMessage(`Demonstration failed: ${err.message}`);
    } finally {
      setIsDemonstrating(false);
    }
  };

  const selectedRequirement =
    requirements.find((r) => r.id === selectedRequirementId) || null;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-[#58a6ff]/30">
      {/* Top Forensic Navigation */}
      <header className="border-b border-[#242b38] bg-[#0d1117]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#161b22] border border-[#30363d] text-[#58a6ff]">
              <ShieldCheck className="w-5 h-5 text-[#58a6ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-white">
                  GHOST PROTOCOL
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d] font-mono-code">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#8b949e]">
                "AI says Done. We demand proof."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#8b949e]">
            <button
              onClick={loadInitialData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8b949e] hover:text-white bg-[#161b22] border border-[#30363d] rounded-md transition-colors disabled:opacity-50"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="hidden sm:inline-block font-mono-code text-[11px] text-[#58a6ff]">
              SQLite Relational Ledger
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Investigation Overview */}
        <InvestigationOverview
          requirements={requirements}
          health={health}
          onVerifyAll={handleVerifyAll}
          onRunDemonstration={handleRunDemonstration}
          onOpenGlossary={() => setShowGlossaryModal(true)}
          isVerifyingAll={isVerifyingAll}
          isDemonstrating={isDemonstrating}
        />

        {/* Two-Column Investigation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Requirements Explorer (5 cols) */}
          <div className="lg:col-span-5">
            <RequirementsExplorer
              requirements={requirements}
              selectedRequirementId={selectedRequirementId}
              onSelectRequirement={(id) => setSelectedRequirementId(id)}
            />
          </div>

          {/* Right Column: Investigation Detail (7 cols) */}
          <div className="lg:col-span-7">
            <InvestigationDetail
              requirement={selectedRequirement}
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={(runId) => setSelectedRunId(runId)}
              onVerify={handleVerifyRequirement}
              isVerifying={isVerifying}
            />
          </div>
        </div>

        {/* 4. Evidence Viewer (Full Width) */}
        <EvidenceViewer
          run={selectedRun}
          evidence={evidence}
          isLoading={isLoadingEvidence}
        />

        {/* 5. Active Findings & Defects */}
        <FindingsList
          findings={findings}
          onSelectRequirement={(reqId) => setSelectedRequirementId(reqId)}
        />
      </main>

      {/* Modals */}
      <DemonstrationModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        result={demonstrationResult}
        isLoading={isDemonstrating}
      />

      <StatusGlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
      />
    </div>
  );
};

export default App;
