import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import InteractivePipelineBar from './components/InteractivePipelineBar';
import PolicyEditorIDE from './components/PolicyEditorIDE';
import WorkflowGraphVisualizer from './components/WorkflowGraphVisualizer';
import VerificationInspector from './components/VerificationInspector';
import CompilerTerminalConsole from './components/CompilerTerminalConsole';
import StageDetailModal from './components/StageDetailModal';
import FixPreviewModal from './components/FixPreviewModal';
import WhatIfPanel from './components/WhatIfPanel';
import WorkflowsListView from './components/WorkflowsListView';
import ComplianceRuleLibrary from './components/ComplianceRuleLibrary';
import AuditLogDashboard from './components/AuditLogDashboard';
import VersionViewer from './components/VersionViewer';
import ExecutionSimulator from './components/ExecutionSimulator';
import LandingPage from './components/LandingPage';

import {
  verifyPolicy,
  runScenario,
  createExecution,
  stepExecution,
  approveExecutionStep,
  resetExecution
} from './api/client';
import { Lock, CheckCircle2, XCircle, Play, Pause, SkipForward, RotateCcw, AlertTriangle } from 'lucide-react';


export default function App() {
  // ── Routing (path-based SPA) ──
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigateTo = useCallback((path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Global Theme ──
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vf-theme') || 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('vf-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Body overflow: scrollable on landing, hidden on dashboard ──
  useEffect(() => {
    const isLanding = currentPath === '/' || currentPath === '';
    if (isLanding) {
      document.body.classList.add('landing-page');
    } else {
      document.body.classList.remove('landing-page');
    }
  }, [currentPath]);

  // ── Landing page view ──
  const isLandingView = currentPath === '/' || currentPath === '';

  if (isLandingView) {
    return (
      <LandingPage
        onNavigateToApp={() => navigateTo('/app')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ══════════════════════════════════════════════════════════
  // DASHBOARD (existing — unchanged below this line)
  // ══════════════════════════════════════════════════════════

  return <Dashboard theme={theme} onToggleTheme={toggleTheme} onNavigateHome={() => navigateTo('/')} />;
}

function Dashboard({ theme, onToggleTheme, onNavigateHome }) {
  // Navigation & View Mode State
  const [activeTab, setActiveTab] = useState('studio');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [centerTab, setCenterTab] = useState('workflow'); // 'workflow' | 'ir' | 'execution'
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeOverlayModal, setActiveOverlayModal] = useState(null); // 'workflows' | 'compliance' | 'audit' | 'versions' | 'whatif'

  // Resizable Panel Width (Left Policy Studio, default 28%)
  const [leftPanelWidth, setLeftPanelWidth] = useState(28);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);

  // Policy & Pipeline Data State
  const [policyText, setPolicyText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);

  // Execution State — tracks active workflow execution session
  // executionSession: { workflow_id, state: { execution_log, step_states, is_complete, ... } }
  const [executionSession, setExecutionSession] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedViolationForFix, setSelectedViolationForFix] = useState(null);
  const [selectedStageForInspection, setSelectedStageForInspection] = useState(null);

  // Animated Verification Gate Banner State
  const [gateBanner, setGateBanner] = useState(null); // { type: 'passed' | 'blocked', message: '' }

  // Drag resizer mouse handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingResizer) return;
      const windowWidth = window.innerWidth;
      const newWidthPct = (e.clientX / windowWidth) * 100;
      if (newWidthPct >= 22 && newWidthPct <= 40) {
        setLeftPanelWidth(newWidthPct);
      }
    };
    const handleMouseUp = () => setIsDraggingResizer(false);

    if (isDraggingResizer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingResizer]);

  // Handle policy compilation
  const handleCompile = async (textToCompile = policyText) => {
    if (!textToCompile.trim()) return;
    setIsLoading(true);
    setIsConsoleOpen(true);
    setExecutionSession(null); // Reset execution on new compile
    try {
      const res = await verifyPolicy(textToCompile);
      setPipelineResult(res);
      setSelectedScenario(null);

      // Trigger animated verification gate overlay
      if (res.verification?.passed) {
        setGateBanner({ type: 'passed', message: 'Gate Opened — Workflow Verified' });
        // Prepare execution session with verification token
        if (res.workflow_ir) {
          try {
            const execResult = await createExecution(res.workflow_ir, res.verification.verification_id);
            // execResult = { workflow_id: "...", state: { execution_log: [...], step_states: {...}, ... } }
            setExecutionSession({
              workflow_id: execResult.workflow_id,
              state: execResult.state || execResult,
            });
          } catch (execErr) {
            console.error('Could not initialize execution session:', execErr);
            setExecutionSession(null);
          }
        }
      } else {
        setGateBanner({ type: 'blocked', message: res.verification?.summary || 'Gate Blocked — Verification Violations Detected' });
        setExecutionSession(null);
        if (centerTab === 'execution') {
          setCenterTab('workflow');
        }
      }

      setTimeout(() => setGateBanner(null), 3500);
    } catch (err) {
      console.error('Pipeline compilation failed:', err);
      setExecutionSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Demo Scenarios
  const handleRunScenario = async (scenarioId) => {
    setSelectedScenario(scenarioId);
    setIsLoading(true);
    setIsConsoleOpen(true);
    setExecutionSession(null);
    try {
      const res = await runScenario(scenarioId);
      setPipelineResult(res);
      if (res.policy_text) {
        setPolicyText(res.policy_text);
      }
      if (res.verification?.passed) {
        setGateBanner({ type: 'passed', message: 'Gate Opened — Workflow Verified' });
        if (res.workflow_ir) {
          try {
            const execResult = await createExecution(res.workflow_ir, res.verification.verification_id);
            setExecutionSession({
              workflow_id: execResult.workflow_id,
              state: execResult.state || execResult,
            });
          } catch (execErr) {
            console.error('Could not initialize execution session:', execErr);
          }
        }
      } else {
        setGateBanner({ type: 'blocked', message: res.verification?.summary || 'Gate Blocked' });
        setExecutionSession(null);
        if (centerTab === 'execution') {
          setCenterTab('workflow');
        }
      }
      setTimeout(() => setGateBanner(null), 3500);
    } catch (err) {
      console.error(`Failed to run scenario ${scenarioId}:`, err);
      setExecutionSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Automated One-Click Hackathon Demo
  const handleRunDemo = async () => {
    const demoPolicy = "Whenever we purchase 100 Laptops from Lenovo India for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.";
    setPolicyText(demoPolicy);
    await handleCompile(demoPolicy);
  };

  // Handle Policy Text Editing (Invalidates previous execution on edit)
  const handlePolicyTextChange = (newText) => {
    setPolicyText(newText);
    if (executionSession) {
      setExecutionSession(null);
    }
  };

  // Handle Apply Auto-Fix Text
  const handleApplyFixText = (fixedText) => {
    setPolicyText(fixedText);
    setSelectedViolationForFix(null);
    handleCompile(fixedText);
  };

  // Execution state change handler from ExecutionSimulator
  const handleExecutionChange = (newState) => {
    setExecutionSession(prev => ({
      ...prev,
      state: newState,
    }));
  };

  // Sidebar navigation handler
  const handleSelectNavTab = (tabId) => {
    if (tabId === 'studio') {
      setActiveTab('studio');
      setActiveOverlayModal(null);
    } else {
      setActiveOverlayModal(tabId);
    }
  };

  const isLastBuildPassed = pipelineResult?.verification?.passed;
  // The workflow_id used for execution steps — from the execution session
  const activeWorkflowId = executionSession?.workflow_id || pipelineResult?.workflow_id;
  // State data for the WorkflowGraphVisualizer overlay
  const graphExecutionState = executionSession?.state || null;

  return (
    <div className="flex h-screen w-screen vf-bg-primary vf-text-primary font-sans overflow-hidden select-none">
      {/* Collapsible Left Sidebar */}
      {!isFocusMode && (
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
          activeTab={activeTab}
          onSelectTab={handleSelectNavTab}
          onNavigateHome={onNavigateHome}
        />
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header Row */}
        <HeaderBar
          onNavigateHome={onNavigateHome}
          theme={theme}
          onToggleTheme={onToggleTheme}
          isCompiling={isLoading}
          lastBuildPassed={isLastBuildPassed}
          onCompile={() => handleCompile()}
          onVerify={() => handleCompile()}
          onExecute={() => setCenterTab('execution')}
          onRunDemo={handleRunDemo}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          isConsoleOpen={isConsoleOpen}
          onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
          pipelineResult={pipelineResult}
        />

        {/* Pipeline Row (GitHub Actions Style) */}
        {!isFocusMode && (
          <InteractivePipelineBar
            stepsResult={pipelineResult?.steps}
            onStageClick={(stageNum) => setSelectedStageForInspection(stageNum)}
            isRunning={isLoading}
          />
        )}

        {/* Animated Verification Gate Banner */}
        {gateBanner && (
          <div
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border shadow-2xl flex items-center gap-3 font-bold text-xs animate-bounce ${
              gateBanner.type === 'passed'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-900/50'
                : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-900/50'
            }`}
          >
            {gateBanner.type === 'passed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
            <span>🔒 VERIFICATION GATE: {gateBanner.message.toUpperCase()}</span>
          </div>
        )}

        {/* 3-Panel IDE Workspace Grid */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Left Panel: Policy Studio */}
          {!isFocusMode && (
            <div style={{ width: `${leftPanelWidth}%` }} className="h-full flex-shrink-0">
              <PolicyEditorIDE
                policyText={policyText}
                onChangePolicyText={handlePolicyTextChange}
                onCompile={() => handleCompile()}
                isLoading={isLoading}
                onReset={() => {
                  setPolicyText('');
                  setPipelineResult(null);
                  setExecutionSession(null);
                  setSelectedScenario(null);
                }}
                selectedScenario={selectedScenario}
                onSelectScenario={handleRunScenario}
              />
            </div>
          )}

          {/* Drag Resizer Divider */}
          {!isFocusMode && (
            <div
              onMouseDown={() => setIsDraggingResizer(true)}
              className="panel-resizer flex-shrink-0"
              title="Drag to resize Policy Studio panel"
            />
          )}

          {/* Center Panel: Tabbed Canvas View (Workflow | IR JSON | Execution) */}
          <div className="flex-1 flex flex-col h-full vf-bg-primary min-w-0 relative">
            {/* Center Panel Navigation Tabs */}
            <div className="h-8 vf-bg-secondary border-b vf-border px-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-1 vf-bg-card-alt p-0.5 rounded text-[11px] font-semibold">
                <button
                  onClick={() => setCenterTab('workflow')}
                  className={`px-3 py-0.5 rounded transition-all cursor-pointer ${
                    centerTab === 'workflow' ? 'bg-indigo-600 text-white shadow-sm' : 'vf-text-secondary hover:text-slate-200'
                  }`}
                >
                  Workflow Canvas
                </button>
                <button
                  onClick={() => setCenterTab('ir')}
                  className={`px-3 py-0.5 rounded transition-all cursor-pointer ${
                    centerTab === 'ir' ? 'bg-indigo-600 text-white shadow-sm' : 'vf-text-secondary hover:text-slate-200'
                  }`}
                >
                  IR JSON
                </button>
                <button
                  onClick={() => setCenterTab('execution')}
                  className={`px-3 py-0.5 rounded transition-all cursor-pointer ${
                    centerTab === 'execution' ? 'bg-indigo-600 text-white shadow-sm' : 'vf-text-secondary hover:text-slate-200'
                  }`}
                >
                  Execution View
                  {executionSession && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Floating Canvas Controls Toolbar during Execution (on workflow tab) */}
              {executionSession && centerTab === 'workflow' && (
                <div className="flex items-center gap-1 vf-bg-card border vf-border rounded px-2 py-0.5 text-xs">
                  <span className="text-[10px] vf-text-secondary font-mono">
                    Progress: {executionSession.state?.progress?.completed || 0}/{executionSession.state?.progress?.total || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Center Tab Body */}
            <div className="flex-1 h-full relative overflow-hidden">
              {centerTab === 'workflow' && (
                <WorkflowGraphVisualizer
                  graphData={pipelineResult?.graph_data}
                  workflowIr={pipelineResult?.workflow_ir}
                  executionState={graphExecutionState}
                  onNodeClick={(node) => setSelectedNode(node)}
                />
              )}

              {centerTab === 'ir' && (
                <pre className="p-4 vf-bg-gutter text-cyan-400 font-mono text-xs overflow-auto w-full h-full leading-relaxed" style={{ color: 'var(--vf-code-text)' }}>
                  {pipelineResult?.workflow_ir
                    ? JSON.stringify(pipelineResult.workflow_ir, null, 2)
                    : '// Intermediate Representation JSON empty. Compile a policy first.'}
                </pre>
              )}

              {centerTab === 'execution' && (
                <div className="p-4 vf-bg-gutter h-full overflow-y-auto space-y-4">
                  {/* Execution Tab Header */}
                  <div className="flex items-center justify-between border-b vf-border pb-2">
                    <span className="font-bold vf-text-primary text-sm font-mono">Execution State Engine</span>
                    {executionSession ? (
                      <span className="badge badge-green text-[9px] animate-pulse">Runtime Active</span>
                    ) : isLastBuildPassed === false ? (
                      <span className="badge badge-red text-[9px]">Gate Blocked</span>
                    ) : (
                      <span className="badge vf-bg-card-alt vf-text-secondary text-[9px]">No Active Execution</span>
                    )}
                  </div>


                  {/* Gate Blocked State */}
                  {!executionSession && pipelineResult && !isLastBuildPassed && (
                    <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Execution Blocked — Verification Gate Failed
                      </div>
                      <p className="text-rose-400/80 text-[11px] leading-relaxed">
                        {pipelineResult.verification?.summary || 'Workflow failed verification checks. Fix all blocking violations before execution.'}
                      </p>
                      {pipelineResult.verification?.violations?.filter(v => ['critical', 'high', 'error'].includes(v.severity?.toLowerCase())).slice(0, 4).map((v, i) => (
                        <div key={i} className="text-[10px] text-rose-300 bg-rose-950/50 rounded px-2 py-1 border border-rose-800/30">
                          ✕ {v.problem}: {v.cause?.slice(0, 120)}{v.cause?.length > 120 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Not Yet Compiled */}
                  {!pipelineResult && (
                    <div className="text-slate-500 italic text-sm text-center py-12">
                      Compile a policy first to enable workflow execution.
                    </div>
                  )}

                  {/* Active Execution via ExecutionSimulator */}
                  {executionSession && (
                    <ExecutionSimulator
                      workflowId={executionSession.workflow_id}
                      workflowIr={pipelineResult?.workflow_ir}
                      onExecutionChange={handleExecutionChange}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Verification Inspector */}
          {!isFocusMode && (
            <div className="w-[22%] min-w-[240px] max-w-[320px] h-full flex-shrink-0">
              <VerificationInspector
                pipelineResult={pipelineResult}
                selectedNode={selectedNode}
                onApplyFixText={handleApplyFixText}
                onOpenFixModal={(v) => setSelectedViolationForFix(v)}
                onOpenWhatIfModal={() => setActiveOverlayModal('whatif')}
                onExecuteWorkflow={() => setCenterTab('execution')}
                isExecuting={centerTab === 'execution'}
              />
            </div>
          )}
        </div>

        {/* Bottom Collapsible Terminal Drawer */}
        <CompilerTerminalConsole
          pipelineResult={pipelineResult}
          isCompiling={isLoading}
          isOpen={isConsoleOpen}
          onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
        />
      </div>

      {/* Interactive Modal Overlays */}
      {selectedStageForInspection && (
        <StageDetailModal
          stageNumber={selectedStageForInspection}
          pipelineResult={pipelineResult}
          onClose={() => setSelectedStageForInspection(null)}
        />
      )}

      {selectedViolationForFix && (
        <FixPreviewModal
          violation={selectedViolationForFix}
          currentPolicyText={policyText}
          onConfirmApply={handleApplyFixText}
          onClose={() => setSelectedViolationForFix(null)}
        />
      )}

      {activeOverlayModal === 'whatif' && (
        <WhatIfPanel
          workflowIr={pipelineResult?.workflow_ir}
          onClose={() => setActiveOverlayModal(null)}
        />
      )}

      {activeOverlayModal === 'workflows' && (
        <WorkflowsListView
          onClose={() => setActiveOverlayModal(null)}
          pipelineResult={pipelineResult}
          onLoadWorkflow={(wf) => {
            if (wf.ir_json) {
              setPipelineResult(prev => ({ ...prev, workflow_ir: wf.ir_json, graph_data: wf.graph_json }));
            }
            setActiveOverlayModal(null);
          }}
        />
      )}

      {activeOverlayModal === 'compliance' && (
        <ComplianceRuleLibrary onClose={() => setActiveOverlayModal(null)} />
      )}

      {activeOverlayModal === 'audit' && (
        <AuditLogDashboard onClose={() => setActiveOverlayModal(null)} />
      )}

      {activeOverlayModal === 'versions' && (
        <VersionViewer onClose={() => setActiveOverlayModal(null)} />
      )}
    </div>
  );
}
