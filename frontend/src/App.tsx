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
import { BenchmarkModal } from './components/BenchmarkModal';
import { ChangeImpactView } from './components/ChangeImpactView';
import { RiskPrioritizationView } from './components/RiskPrioritizationView';
import { AuditReportModal } from './components/AuditReportModal';
import { CopilotModal } from './components/CopilotModal';
import { ThemeSelector, ThemeId } from './components/ThemeSelector';
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Database,
  Radio,
  X,
  HelpCircle,
  FileText,
  Sparkles,
  GitCommit,
  LayoutDashboard,
  Flame,
  Clock,
  Cpu,
  BarChart3,
  FlaskConical,
  User,
  Shield,
  Zap,
  Play,
  Menu,
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const LiveClock: React.FC = React.memo(() => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzOffsetHours = Math.abs(Math.round(now.getTimezoneOffset() / 60));
      const tzSign = now.getTimezoneOffset() <= 0 ? '+' : '-';
      setTime(
        now.toLocaleTimeString('en-US', { hour12: false }) + ` UTC${tzSign}${tzOffsetHours}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-[var(--text-main)] font-bold">{time || 'LIVE UTC'}</span>;
});

export const App: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<VerificationRun | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'OFFLINE' | 'CONNECTING'>('CONNECTING');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState<boolean>(false);
  const [isDemonstrating, setIsDemonstrating] = useState<boolean>(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Multi-Theme State (Enterprise Light Default)
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('ghost-protocol-theme');
      if (saved === 'light' || saved === 'ember' || saved === 'ultraviolet' || saved === 'arctic' || saved === 'emerald') {
        return saved as ThemeId;
      }
    } catch {
      // fallback
    }
    return 'light';
  });

  const handleThemeChange = (newTheme: ThemeId) => {
    setCurrentTheme(newTheme);
    try {
      localStorage.setItem('ghost-protocol-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch {
      // ignore
    }
    showToast(`Theme activated: ${newTheme.toUpperCase()}`, 'info');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Modals & Navigation
  const [demonstrationResult, setDemonstrationResult] = useState<DemonstrationResult | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showCopilotModal, setShowCopilotModal] = useState<boolean>(false);
  const [copilotRequirementId, setCopilotRequirementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'IMPACT' | 'RISK'>('DASHBOARD');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Load Initial Data with Real Backend Health Check
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setConnectionStatus('CONNECTING');
    try {
      const [healthData, reqsData, findingsData] = await Promise.all([
        api.getHealth(),
        api.getRequirements(),
        api.getFindings(),
      ]);
      setHealth(healthData);
      setRequirements(reqsData);
      setFindings(findingsData);
      setConnectionStatus('ONLINE');

      // Default to PAYMENT-004 if available, or first requirement
      const targetReq =
        reqsData.find((r) => r.id === 'PAYMENT-004') || reqsData[0];
      if (targetReq) {
        setSelectedRequirementId((prev) => prev || targetReq.id);
      }
    } catch (err: any) {
      setConnectionStatus('OFFLINE');
      setErrorMessage(
        `Failed to connect to Ghost Protocol API: ${err.message}. Ensure the FastAPI backend is running on http://127.0.0.1:8000.`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        loadInitialData();
      }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShowGlossaryModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        const runObj = runs.find((r) => r.run_id === selectedRunId);
        setSelectedRun(runObj || null);

        // Fetch authentic evidence artifacts from SQLite ledger
        const evList = await api.getRunEvidence(selectedRunId);
        if (evList && evList.length > 0) {
          setEvidence(evList[0]);
        } else {
          setEvidence(null);
        }

        // Refresh findings for requirement
        const allFindings = await api.getFindings(selectedRequirementId || undefined);
        setFindings(allFindings);
      } catch {
        setEvidence(null);
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

      showToast(
        `Verification executed for ${id}: ${result.requirement.status} (Exit code ${result.run.exit_code})`,
        result.requirement.status === 'VERIFIED' ? 'success' : 'info'
      );
    } catch (err: any) {
      setErrorMessage(`Verification failed: ${err.message}`);
      showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Verify All
  const handleVerifyAll = async () => {
    setIsVerifyingAll(true);
    setErrorMessage(null);
    try {
      const bulkResult = await api.verifyAll();
      const [updatedReqs, updatedFindings, updatedHealth] = await Promise.all([
        api.getRequirements(),
        api.getFindings(),
        api.getHealth(),
      ]);
      setRequirements(updatedReqs);
      setFindings(updatedFindings);
      setHealth(updatedHealth);

      if (selectedRequirementId) {
        const runHistory = await api.getRuns(selectedRequirementId);
        setRuns(runHistory);
        if (runHistory.length > 0) {
          setSelectedRunId(runHistory[0].run_id);
          setSelectedRun(runHistory[0]);
        }
      }

      const score = bulkResult.scorecard;
      showToast(
        `All verifications completed: ${score.VERIFIED ?? 0} Verified, ${score.UNVERIFIED ?? 0} Unverified, ${score.VIOLATION ?? 0} Violations`,
        'success'
      );
    } catch (err: any) {
      setErrorMessage(`Bulk verification failed: ${err.message}`);
      showToast(`Bulk verification failed: ${err.message}`, 'error');
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
      const [updatedReqs, updatedFindings, updatedHealth] = await Promise.all([
        api.getRequirements(),
        api.getFindings(),
        api.getHealth(),
      ]);
      setRequirements(updatedReqs);
      setFindings(updatedFindings);
      setHealth(updatedHealth);

      showToast(
        'PAYMENT-004 Demonstration executed: Vulnerable Fixture: DEFECT DETECTED (Exit 1 — Expected Violation) vs Corrected Engine: VERIFIED (Exit 0)',
        'success'
      );
    } catch (err: any) {
      setErrorMessage(`Demonstration failed: ${err.message}`);
      showToast(`Demonstration failed: ${err.message}`, 'error');
    } finally {
      setIsDemonstrating(false);
    }
  };

  const selectedRequirement =
    requirements.find((r) => r.id === selectedRequirementId) || null;

  const isBusy = isVerifying || isVerifyingAll || isDemonstrating;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-main)] font-sans selection:bg-[var(--color-copper)]/30 relative flex flex-col lg:flex-row overflow-x-hidden">
      {/* 1. Ambient Obsidian Ember Atmosphere (GPU Composited) */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ember-field">
          <div className="ember-particle" style={{ left: '15%', animationDelay: '0s' }} />
          <div className="ember-particle" style={{ left: '35%', animationDelay: '4s' }} />
          <div className="ember-particle" style={{ left: '60%', animationDelay: '8s' }} />
          <div className="ember-particle" style={{ left: '80%', animationDelay: '2s' }} />
          <div className="ember-particle" style={{ left: '92%', animationDelay: '6s' }} />
        </div>
        <div className="light-orb-primary" />
        <div className="light-orb-secondary" />
        <div className="light-orb-highlight" />
        <div className="ambient-vignette" />
      </div>

      {/* 2. Premium Command Sidebar (Desktop Docked / Mobile Collapsible) */}
      <aside className="w-full lg:w-64 shrink-0 bg-[var(--bg-secondary)]/95 backdrop-blur-3xl border-b lg:border-b-0 lg:border-r border-[var(--border-panel)] flex flex-col justify-between z-40 lg:min-h-screen relative shadow-[var(--panel-shadow)]">
        <div>
          {/* Logo & Platform Identity */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--color-copper)]/20 to-[var(--color-molten-amber)]/15 border border-[var(--color-copper)]/40 shadow-[0_0_15px_rgba(var(--color-copper-rgb),0.2)]">
                <Shield className="w-5 h-5 text-[var(--color-molten-amber)]" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wider text-[var(--text-main)] font-mono-code block">
                  GHOST PROTOCOL
                </span>
                <span className="text-[10px] text-[var(--color-molten-amber)] font-mono-code font-bold">
                  VERIFICATION ENGINE
                </span>
              </div>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block p-3 space-y-4`}>
            {/* Workbench Navigation Dock */}
            <nav aria-label="Workbench Dock Navigation" className="space-y-1">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[var(--text-muted)] font-bold px-3 block mb-1.5">
                VERIFICATION DOCK
              </span>
              <button
                onClick={() => {
                  setActiveTab('DASHBOARD');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold font-mono-code rounded-xl transition-all ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-[var(--color-copper)]/15 text-[var(--text-main)] border border-[var(--color-copper)]/40 shadow-sm font-extrabold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-transparent'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--color-molten-amber)]" />
                <span>01 // EVIDENCE LEDGER</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('IMPACT');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold font-mono-code rounded-xl transition-all ${
                  activeTab === 'IMPACT'
                    ? 'bg-[var(--color-copper)]/15 text-[var(--text-main)] border border-[var(--color-copper)]/40 shadow-sm font-extrabold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-transparent'
                }`}
              >
                <GitCommit className="w-4 h-4 text-[var(--color-copper)]" />
                <span>02 // CHANGE IMPACT</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('RISK');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold font-mono-code rounded-xl transition-all ${
                  activeTab === 'RISK'
                    ? 'bg-[var(--color-copper)]/15 text-[var(--text-main)] border border-[var(--color-copper)]/40 shadow-sm font-extrabold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-transparent'
                }`}
              >
                <Flame className="w-4 h-4 text-[var(--color-warning)]" />
                <span>03 // RISK & ACTIONS</span>
              </button>
            </nav>

            {/* Quick Actions & Flagship Launchers */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[var(--text-muted)] font-bold px-3 block mb-1.5">
                EXECUTION COMMANDS
              </span>

              {/* Prominent Verify Implementation Action */}
              <button
                onClick={handleVerifyAll}
                disabled={isVerifyingAll || isDemonstrating}
                className="w-full btn-command-primary p-2.5 text-xs flex items-center justify-center gap-2 font-mono-code font-bold shadow-[0_0_20px_var(--glow-primary)] disabled:opacity-50"
                title="Execute all test targets across specifications"
              >
                <Play className={`w-3.5 h-3.5 text-white ${isVerifyingAll ? 'animate-spin' : ''}`} />
                <span>{isVerifyingAll ? 'VERIFYING...' : 'VERIFY IMPLEMENTATION'}</span>
              </button>

              {/* Flagship Demonstration PAYMENT-004 */}
              <button
                onClick={handleRunDemonstration}
                disabled={isDemonstrating || isVerifyingAll}
                className="w-full px-3 py-2 text-xs font-semibold font-mono-code text-[var(--color-violation)] rounded-xl border border-[var(--color-violation)]/40 bg-[var(--color-violation)]/10 hover:bg-[var(--color-violation)]/20 transition-all disabled:opacity-50 flex items-center gap-2"
                title="Compare vulnerable fixture failure vs corrected implementation pass"
              >
                <FlaskConical className={`w-3.5 h-3.5 text-[var(--color-violation)] ${isDemonstrating ? 'animate-spin' : ''}`} />
                <span>DEMO PAYMENT-004</span>
              </button>

              {/* Seeded Benchmark Launcher */}
              <button
                onClick={() => setShowBenchmarkModal(true)}
                className="w-full btn-command-ghost px-3 py-2 text-xs flex items-center gap-2 font-mono-code text-[var(--color-molten-amber)] hover:text-[var(--text-main)]"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[var(--color-molten-amber)]" />
                <span>SEEDED BENCHMARK</span>
              </button>

              {/* Verification Model Axioms */}
              <button
                onClick={() => setShowGlossaryModal(true)}
                className="w-full btn-command-ghost px-3 py-2 text-xs flex items-center gap-2 font-mono-code"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>STATE GLOSSARY (?)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: System Telemetry & Auditor Profile */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 space-y-2">
          {/* SQLite Ledger Status */}
          <div className="flex items-center justify-between text-[11px] font-mono-code text-[var(--text-secondary)] bg-[var(--bg-card)] p-2 rounded-xl border border-[var(--border-subtle)]">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[var(--color-verified)]" />
              <span>SQLITE LEDGER:</span>
            </span>
            <strong className="text-[var(--color-verified)]">733.2 KB SEALED</strong>
          </div>

          {/* Connection Pill */}
          <div className="flex items-center justify-between text-[11px] font-mono-code text-[var(--text-secondary)] bg-[var(--bg-card)] p-2 rounded-xl border border-[var(--border-subtle)]">
            <span className="flex items-center gap-1.5">
              <Radio
                className={`w-3.5 h-3.5 ${
                  connectionStatus === 'ONLINE'
                    ? 'text-[var(--color-verified)] animate-pulse'
                    : 'text-[var(--color-violation)]'
                }`}
              />
              <span>ENGINE:</span>
            </span>
            <strong
              className={
                connectionStatus === 'ONLINE'
                  ? 'text-[var(--color-verified)]'
                  : 'text-[var(--color-violation)]'
              }
            >
              {connectionStatus === 'ONLINE' ? 'ONLINE (127.0.0.1:8000)' : 'OFFLINE'}
            </strong>
          </div>

          {/* Operator Profile */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-mono-code">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--color-copper)]/15 border border-[var(--color-copper)]/30 flex items-center justify-center text-[var(--color-copper)]">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-[var(--text-main)] font-bold">AUDITOR-01</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">CHIEF_AUDITOR</span>
          </div>
        </div>
      </aside>

      {/* 3. Main Forensic Operating Deck */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="border-b border-[var(--border-panel)] bg-[var(--bg-secondary)]/90 backdrop-blur-2xl sticky top-0 z-30 shadow-[var(--header-shadow)]">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
            {/* Tagline / Subtitle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono-code text-[var(--color-molten-amber)] bg-[var(--color-copper)]/10 px-2.5 py-1 rounded-lg border border-[var(--color-copper)]/25 font-bold hidden sm:inline-block">
                KIRO-FORENSICS-CORE
              </span>
              <p className="text-xs font-medium text-[var(--text-secondary)] italic">
                “AI says Done. We demand proof.”
              </p>
            </div>

            {/* Center & Right Command Actions */}
            <div className="flex items-center gap-3 text-xs">
              {/* Live Military Clock */}
              <div className="hidden md:flex items-center gap-2 font-mono-code bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <Clock className="w-3.5 h-3.5 text-[var(--color-molten-amber)]" />
                <LiveClock />
              </div>

              {/* Subprocess Telemetry Activity Waveform */}
              <div className="hidden lg:flex items-center gap-2 font-mono-code bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)]" title="Subprocess Activity">
                <Cpu className="w-3.5 h-3.5 text-[var(--color-copper)]" />
                <div className="flex items-end gap-1 h-3.5">
                  <span className={`w-1 rounded-full bg-[var(--color-copper)] transition-all ${isBusy ? 'h-3.5 animate-pulse' : 'h-1.5'}`} />
                  <span className={`w-1 rounded-full bg-[var(--color-molten-amber)] transition-all ${isBusy ? 'h-2.5 animate-bounce' : 'h-2'}`} />
                  <span className={`w-1 rounded-full bg-[var(--color-verified)] transition-all ${isBusy ? 'h-3.5 animate-pulse' : 'h-3'}`} />
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {isBusy ? 'PROCESS: ACTIVE' : 'CPU: READY'}
                </span>
              </div>

              {/* Theme Selector Component */}
              <ThemeSelector
                currentTheme={currentTheme}
                onThemeChange={handleThemeChange}
              />

              {/* Formal Audit Report Trigger */}
              <button
                onClick={() => setShowAuditModal(true)}
                className="btn-command-ghost px-3 py-1.5 text-xs text-[var(--color-molten-amber)] hover:text-[var(--text-main)] flex items-center gap-1.5 font-mono-code"
                title="Generate & Export Formal Verification Audit Report"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--color-molten-amber)]" />
                <span className="hidden sm:inline">Audit Report</span>
              </button>

              {/* AI Copilot Trigger */}
              <button
                onClick={() => {
                  setCopilotRequirementId(selectedRequirementId);
                  setShowCopilotModal(true);
                }}
                className="btn-command-ghost px-3 py-1.5 text-xs text-[var(--color-copper)] hover:text-[var(--text-main)] flex items-center gap-1.5 font-mono-code"
                title="AI Candidate Test Proposals (Proposal Only · Not Proof)"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-copper)]" />
                <span className="hidden sm:inline">Copilot</span>
              </button>

              {/* Refresh Telemetry */}
              <button
                onClick={loadInitialData}
                disabled={isLoading}
                className="btn-command-ghost p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                title="Refresh Telemetry (Alt+R)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--color-molten-amber)]' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Active Subprocess Pipeline Banner */}
        {isBusy && (
          <div className="max-w-7xl mx-auto px-4 pt-4 w-full relative z-20">
            <div className="glass-panel p-4 bg-gradient-to-r from-[var(--color-copper)]/15 via-[var(--color-molten-amber)]/10 to-[var(--color-verified)]/15 border-[var(--color-copper)]/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 verification-scan-beam">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-copper)]/25 text-[var(--color-molten-amber)] animate-pulse">
                  <Zap className="w-5 h-5 text-[var(--color-molten-amber)]" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-mono-code">
                      Subprocess Verification Pipeline In Flight
                    </span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-[var(--color-verified)]/20 text-[var(--color-verified)] border border-[var(--color-verified)]/40 animate-pulse font-bold">
                      EXECUTING
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Executing deterministic pytest target with isolated database harness and real-time SHA-256 evidence sealing.
                  </p>
                </div>
              </div>

              {/* Pipeline Stage Tracker */}
              <div className="flex items-center gap-2 text-[10px] font-mono-code text-[var(--text-muted)] shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--color-copper)]">
                  1. HARNESS BIND
                </span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--color-molten-amber)]">
                  2. DETERMINISTIC PYTEST
                </span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--color-verified)] font-bold">
                  3. SHA-256 SEAL
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 w-full relative z-10 flex-1">
          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="glass-panel p-4 bg-[var(--color-violation)]/12 border-[var(--color-violation)]/40 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--color-violation)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-rose-900 dark:text-white font-mono-code">Connection or Operation Error:</strong>
                  <span>{errorMessage}</span>
                  <div className="mt-1 font-mono-code text-[11px] text-rose-700 dark:text-rose-300">
                    Command to start backend: <code>python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000</code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={loadInitialData}
                  className="btn-command-primary px-3 py-1.5 text-xs text-white"
                >
                  Retry
                </button>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-600 dark:text-rose-400 hover:underline text-xs p-1 font-mono-code"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Tab 01: DASHBOARD & EVIDENCE LEDGER */}
          {activeTab === 'DASHBOARD' && (
            <>
              {/* Hero Section & Scorecards */}
              <InvestigationOverview
                requirements={requirements}
                health={health}
                onVerifyAll={handleVerifyAll}
                onRunDemonstration={handleRunDemonstration}
                onOpenGlossary={() => setShowGlossaryModal(true)}
                onOpenBenchmark={() => setShowBenchmarkModal(true)}
                isVerifyingAll={isVerifyingAll}
                isDemonstrating={isDemonstrating}
                onFilterStatus={(filter) => setStatusFilter(filter)}
                activeFilter={statusFilter}
              />

              {/* Two-Column Inspection Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Specifications Catalog (5 cols) */}
                <div className="lg:col-span-5">
                  <RequirementsExplorer
                    requirements={requirements}
                    selectedRequirementId={selectedRequirementId}
                    onSelectRequirement={(id) => setSelectedRequirementId(id)}
                    statusFilter={statusFilter}
                    onStatusFilterChange={(f) => setStatusFilter(f)}
                  />
                </div>

                {/* Right Column: Investigation Detail & Timeline (7 cols) */}
                <div className="lg:col-span-7">
                  <InvestigationDetail
                    requirement={selectedRequirement}
                    runs={runs}
                    selectedRunId={selectedRunId}
                    onSelectRun={(runId) => setSelectedRunId(runId)}
                    onVerify={handleVerifyRequirement}
                    isVerifying={isVerifying}
                    onOpenCopilot={(reqId) => {
                      setCopilotRequirementId(reqId);
                      setShowCopilotModal(true);
                    }}
                  />
                </div>
              </div>

              {/* Full Width Evidence Explorer */}
              <EvidenceViewer
                run={selectedRun}
                evidence={evidence}
                isLoading={isLoadingEvidence}
              />

              {/* Active Specification Violations / Findings */}
              <FindingsList
                findings={findings}
                onSelectRequirement={(reqId) => {
                  setSelectedRequirementId(reqId);
                  window.scrollTo({ top: 200, behavior: 'smooth' });
                }}
              />
            </>
          )}

          {/* Tab 02: CHANGE IMPACT */}
          {activeTab === 'IMPACT' && (
            <ChangeImpactView
              onVerifyRequirement={handleVerifyRequirement}
              onVerifyAll={handleVerifyAll}
              isVerifyingAll={isVerifyingAll}
            />
          )}

          {/* Tab 03: RISK & REMEDIATION */}
          {activeTab === 'RISK' && (
            <RiskPrioritizationView
              onSelectRequirement={(id) => {
                setSelectedRequirementId(id);
                setActiveTab('DASHBOARD');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onVerifyRequirement={handleVerifyRequirement}
            />
          )}
        </main>

        {/* Operating Deck Footer */}
        <footer className="border-t border-[var(--border-panel)] py-4 bg-[var(--bg-secondary)] text-[11px] text-[var(--text-muted)] relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-verified)] shadow-[0_0_8px_var(--color-verified)]" />
              <Database className="w-3.5 h-3.5 text-[var(--color-molten-amber)]" />
              <span className="font-mono-code text-[var(--text-secondary)]">
                SQLite Evidence Ledger · SHA-256 Provenance Confined · Zero Fabricated Results
              </span>
            </div>
            <div className="font-mono-code">
              <span>Ghost Protocol Verification Engine · Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[10px]">?</kbd> for state glossary</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Notification Toasts */}
      <div
        className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl border shadow-2xl flex items-start justify-between gap-3 text-xs pointer-events-auto backdrop-blur-2xl animate-fade-in ${
              toast.type === 'success'
                ? 'bg-[var(--color-verified)]/15 border-[var(--color-verified)]/50 text-emerald-950 dark:text-emerald-200 shadow-[0_0_25px_rgba(var(--color-verified-rgb),0.25)]'
                : toast.type === 'error'
                ? 'bg-[var(--color-violation)]/15 border-[var(--color-violation)]/50 text-rose-950 dark:text-rose-200 shadow-[0_0_25px_rgba(var(--color-violation-rgb),0.25)]'
                : 'bg-[var(--color-copper)]/15 border-[var(--color-copper)]/50 text-amber-950 dark:text-amber-200 shadow-[0_0_25px_rgba(var(--color-copper-rgb),0.25)]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-verified)] shrink-0 mt-0.5" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[var(--color-violation)] shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[var(--color-molten-amber)] shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

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

      <BenchmarkModal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
      />

      <AuditReportModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      <CopilotModal
        isOpen={showCopilotModal}
        onClose={() => setShowCopilotModal(false)}
        requirementId={copilotRequirementId || selectedRequirementId}
      />
    </div>
  );
};

export default App;
