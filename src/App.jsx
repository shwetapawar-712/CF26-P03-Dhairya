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
import TerminalLoader from './components/TerminalLoader';
import LoginPage from './components/LoginPage';
import PendingRequestCard from './components/PendingRequestCard';

import {
  verifyPolicy,
  runScenario,
  createExecution,
  stepExecution,
  approveExecutionStep,
  resetExecution,
  getCurrentUser,
  logout,
  createApprovalRequest,
  getApprovalRequests,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
} from './api/client';
import { Lock, CheckCircle2, XCircle, Play, Pause, SkipForward, RotateCcw, AlertTriangle, Clock, LogOut, User } from 'lucide-react';


export default function App() {
  // ── Initial Startup Terminal Splash Loader (Only runs once per session) ──
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('vf_splash_initialized');
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('vf_splash_initialized', 'true');
    setShowSplash(false);
  }, []);

  // ── Authentication State ──
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // restore session on mount

  useEffect(() => {
    // Attempt to restore session from stored token on app load
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user);
    setShowLoginPage(false);
    navigateTo('/app');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentUser(null);
    navigateTo('/'); // Return to landing after logout
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Login Page Visibility ──
  const handleNavigateToApp = useCallback(() => {
    if (currentUser) {
      navigateTo('/app');
    } else {
      setShowLoginPage(true);
    }
  }, [currentUser, navigateTo]);

  const handleHideLogin = useCallback(() => {
    setShowLoginPage(false);
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

  // ── Main Render ──
  const isLandingView = currentPath === '/' || currentPath === '';
  const isDashboardView = currentPath === '/app' || currentPath.startsWith('/app');

  // While restoring session, show a minimal loading state
  // (but still show the splash animation on top if needed)
  if (authLoading) {
    return (
      <>
        {showSplash && <TerminalLoader onComplete={handleSplashComplete} />}
        <div className="min-h-screen vf-bg-primary flex items-center justify-center">
          <div className="flex items-center gap-3 vf-text-secondary text-sm">
            <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            Loading VeriFlow…
          </div>
        </div>
      </>
    );
  }

  // If user is authenticated and on /app → show dashboard
  if (isDashboardView && currentUser) {
    return (
      <>
        {showSplash && <TerminalLoader onComplete={handleSplashComplete} />}
        <Dashboard
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigateHome={() => navigateTo('/')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // If user is on /app but NOT authenticated → show login page
  if (isDashboardView && !currentUser) {
    return (
      <>
        {showSplash && <TerminalLoader onComplete={handleSplashComplete} />}
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBack={() => navigateTo('/')}
        />
      </>
    );
  }

  // Landing view (or any unauthenticated state):
  // Animation → Landing → [Get Started / Sign In clicked] → LoginPage → Dashboard
  return (
    <>
      {showSplash && <TerminalLoader onComplete={handleSplashComplete} />}

      {/* Login page overlays the landing page when user clicks Sign In / Get Started */}
      {showLoginPage && !currentUser ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBack={handleHideLogin}
        />
      ) : (
        <LandingPage
          onNavigateToApp={handleNavigateToApp}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </>
  );
}

function Dashboard({ theme, onToggleTheme, onNavigateHome, currentUser, onLogout }) {
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
  const [executionSession, setExecutionSession] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedViolationForFix, setSelectedViolationForFix] = useState(null);
  const [selectedStageForInspection, setSelectedStageForInspection] = useState(null);

  // Animated Verification Gate Banner State
  const [gateBanner, setGateBanner] = useState(null); // { type: 'passed' | 'blocked' | 'waiting', message: '' }

  // ── Approval State ────────────────────────────────────────────────────────
  // approvalStatus: null | 'waiting' | 'approved' | 'rejected'
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [approvalRequestId, setApprovalRequestId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // manager: list of pending requests

  // Manager: the request currently being reviewed in the inspector
  const [activeManagerRequest, setActiveManagerRequest] = useState(null);
  const [isApprovingRequest, setIsApprovingRequest] = useState(false);

  // Load approval requests on mount and when needed (for Manager and Employee)
  const refreshPendingRequests = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const reqs = await getApprovalRequests();
      setPendingRequests(reqs || []);
      return reqs || [];
    } catch (err) {
      console.error('Could not fetch approval requests:', err);
      return [];
    }
  }, [currentUser]);

  // Open an approval request — fetches full data and restores workflow, policy text, approval, and execution state
  const handleOpenRequest = useCallback(async (req) => {
    if (!req) return;
    try {
      const fullReq = await getApprovalRequest(req.id);
      if (currentUser?.app_role === 'manager' && fullReq.status === 'pending') {
        setActiveManagerRequest(fullReq);
      } else {
        setActiveManagerRequest(null);
      }

      // Restore workflow IR + graph
      if (fullReq.ir_json && Object.keys(fullReq.ir_json).length > 0) {
        setPipelineResult({
          workflow_ir: fullReq.ir_json,
          graph_data: fullReq.graph_json || null,
          workflow_id: fullReq.workflow_id,
          verification: {
            passed: true,
            execution_allowed: fullReq.status === 'approved' || currentUser?.app_role === 'manager',
            verification_id: fullReq.verification_id,
            score: 100,
            risk_level: 'LOW',
          },
        });
      }

      // Restore policy text
      if (fullReq.policy_text) {
        setPolicyText(fullReq.policy_text);
      }

      // Map status
      const statusMap = {
        pending: 'waiting',
        approved: 'approved',
        rejected: 'rejected',
      };
      setApprovalStatus(statusMap[fullReq.status] || fullReq.status);
      setApprovalRequestId(fullReq.id);

      // Reconnect active execution session if approved or in execution
      if (fullReq.status === 'approved' || fullReq.workflow_status === 'executing' || fullReq.workflow_status === 'completed') {
        try {
          const execState = await getExecutionState(fullReq.workflow_id);
          if (execState && !execState.error) {
            setExecutionSession({
              workflow_id: fullReq.workflow_id,
              state: execState,
            });
          }
        } catch (e) {
          // Execution not initialized yet
        }
      } else {
        setExecutionSession(null);
      }

      setCenterTab('workflow');
    } catch (err) {
      console.error('Could not load approval request:', err);
    }
  }, [currentUser]);

  // Handle loading a workflow from WorkflowsListView modal
  const handleLoadWorkflow = useCallback(async (wf) => {
    if (!wf) return;
    if (wf.ir_json && Object.keys(wf.ir_json).length > 0) {
      setPipelineResult({
        workflow_ir: wf.ir_json,
        graph_data: wf.graph_json || null,
        workflow_id: wf.workflow_id,
        verification: {
          passed: wf.status !== 'blocked' && wf.status !== 'failed',
          execution_allowed: wf.status === 'approved' || wf.status === 'completed' || wf.status === 'executing' || currentUser?.app_role === 'manager',
          verification_id: wf.verification_id,
          score: 100,
          risk_level: 'LOW',
        },
      });
    }
    if (wf.policy_text || wf.description) {
      setPolicyText(wf.policy_text || wf.description);
    }
    if (wf.status === 'waiting_for_manager') {
      setApprovalStatus('waiting');
    } else if (wf.status === 'approved' || wf.approval_status === 'approved') {
      setApprovalStatus('approved');
    } else if (wf.status === 'rejected' || wf.approval_status === 'rejected') {
      setApprovalStatus('rejected');
    } else {
      setApprovalStatus(null);
    }
    setApprovalRequestId(wf.approval_request_id || null);

    if (wf.status === 'approved' || wf.status === 'executing' || wf.status === 'completed') {
      try {
        const execState = await getExecutionState(wf.workflow_id);
        if (execState && !execState.error) {
          setExecutionSession({
            workflow_id: wf.workflow_id,
            state: execState,
          });
        }
      } catch (e) {
        // Not active yet
      }
    } else {
      setExecutionSession(null);
    }
    setActiveOverlayModal(null);
  }, [currentUser]);

  useEffect(() => {
    refreshPendingRequests().then((reqs) => {
      // Auto-load latest submitted workflow for Employee on initial mount if nothing is loaded yet
      if (currentUser?.app_role === 'employee' && reqs && reqs.length > 0 && !pipelineResult) {
        handleOpenRequest(reqs[0]);
      }
    });
    // Poll every 10 seconds for real-time status synchronization
    const interval = setInterval(refreshPendingRequests, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingRequests, currentUser]);

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
    setExecutionSession(null);
    setApprovalStatus(null);
    setApprovalRequestId(null);
    // Clear any active manager review when recompiling
    setActiveManagerRequest(null);
    try {
      const res = await verifyPolicy(textToCompile);
      setPipelineResult(res);
      setSelectedScenario(null);

      if (res.verification?.passed) {
        if (currentUser?.app_role === 'manager') {
          // Manager verified a workflow — show gate passed but do NOT auto-execute.
          // Manager can execute directly (no employee approval needed for their own compilations).
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
          // Employee: verification passed → create approval request for manager
          setGateBanner({ type: 'waiting', message: 'Verification Passed — Awaiting Manager Approval' });
          if (res.workflow_ir && res.workflow_id) {
            try {
              const approvalRes = await createApprovalRequest({
                workflowId: res.workflow_id,
                policyText: textToCompile,
                workflowName: res.workflow_ir?.workflow_name || 'Workflow',
                verificationId: res.verification?.verification_id || '',
              });
              setApprovalStatus('waiting');
              setApprovalRequestId(approvalRes.id);
            } catch (approvalErr) {
              console.error('Could not create approval request:', approvalErr);
              setApprovalStatus(null);
            }
          }
        }
      } else {
        setGateBanner({ type: 'blocked', message: res.verification?.summary || 'Gate Blocked — Verification Violations Detected' });
        setExecutionSession(null);
        setApprovalStatus(null);
        if (centerTab === 'execution') {
          setCenterTab('workflow');
        }
      }

      setTimeout(() => setGateBanner(null), 4000);
    } catch (err) {
      console.error('Pipeline compilation failed:', err);
      setExecutionSession(null);
      setApprovalStatus(null);
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
    setApprovalStatus(null);
    setActiveManagerRequest(null);
    try {
      const res = await runScenario(scenarioId);
      setPipelineResult(res);
      if (res.policy_text) {
        setPolicyText(res.policy_text);
      }
      if (res.verification?.passed) {
        if (currentUser?.app_role === 'manager') {
          // Manager running a scenario — allow direct execution (no approval loop needed)
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
          setGateBanner({ type: 'waiting', message: 'Verification Passed — Awaiting Manager Approval' });
          if (res.workflow_ir && res.workflow_id) {
            try {
              const approvalRes = await createApprovalRequest({
                workflowId: res.workflow_id,
                policyText: res.policy_text || '',
                workflowName: res.workflow_ir?.workflow_name || 'Workflow',
                verificationId: res.verification?.verification_id || '',
              });
              setApprovalStatus('waiting');
              setApprovalRequestId(approvalRes.id);
            } catch (approvalErr) {
              console.error('Could not create approval request:', approvalErr);
            }
          }
        }
      } else {
        setGateBanner({ type: 'blocked', message: res.verification?.summary || 'Gate Blocked' });
        setExecutionSession(null);
        setApprovalStatus(null);
        if (centerTab === 'execution') {
          setCenterTab('workflow');
        }
      }
      setTimeout(() => setGateBanner(null), 4000);
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
    if (approvalStatus) {
      setApprovalStatus(null);
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

  // Manager clicks Approve in the VerificationInspector footer or PendingRequestCard
  const handleManagerApproveAction = useCallback(async (req) => {
    if (!req) return;
    setIsApprovingRequest(true);
    try {
      const result = await approveRequest(req.id);
      const irJson = result.request?.ir_json || req.ir_json;
      const verificationId = result.request?.verification_id || req.verification_id;

      setApprovalStatus('approved');
      setApprovalRequestId(req.id);

      // Load the approved IR and start execution
      if (irJson && Object.keys(irJson).length > 0) {
        setPipelineResult(prev => ({
          ...prev,
          workflow_ir: irJson,
          workflow_id: req.workflow_id,
          verification: prev?.verification || {
            passed: true,
            execution_allowed: true,
            verification_id: verificationId,
            score: 100,
            risk_level: 'LOW',
          },
        }));

        try {
          const execResult = await createExecution(irJson, verificationId, req.workflow_id);
          setExecutionSession({
            workflow_id: execResult.workflow_id || req.workflow_id,
            state: execResult.state || execResult,
          });
          setCenterTab('execution');
        } catch (execErr) {
          console.warn('Execution auto-start notice:', execErr);
        }
      }

      setGateBanner({ type: 'passed', message: `Manager Approved: Workflow "${req.workflow_name || req.workflow_id}" is cleared for execution!` });
      setTimeout(() => setGateBanner(null), 5000);

      setActiveManagerRequest(null);
      await refreshPendingRequests();
    } catch (err) {
      console.error('Approval failed:', err);
      setGateBanner({ type: 'blocked', message: err?.response?.data?.detail || 'Approval failed. Please check server logs.' });
      setTimeout(() => setGateBanner(null), 5000);
    } finally {
      setIsApprovingRequest(false);
    }
  }, [refreshPendingRequests]);

  // Manager clicks Reject in the VerificationInspector footer or PendingRequestCard
  const handleManagerRejectAction = useCallback(async (req, reason = '') => {
    if (!req) return;
    setIsApprovingRequest(true);
    try {
      await rejectRequest(req.id, reason);
      setApprovalStatus('rejected');
      setApprovalRequestId(req.id);
      setActiveManagerRequest(null);
      setExecutionSession(null);
      setGateBanner({ type: 'blocked', message: `Request Rejected: "${req.workflow_name || req.workflow_id}" is blocked.` });
      setTimeout(() => setGateBanner(null), 5000);
      await refreshPendingRequests();
    } catch (err) {
      console.error('Rejection failed:', err);
      setGateBanner({ type: 'blocked', message: err?.response?.data?.detail || 'Rejection failed.' });
      setTimeout(() => setGateBanner(null), 5000);
      throw err; // Let inspector display the error
    } finally {
      setIsApprovingRequest(false);
    }
  }, [refreshPendingRequests]);

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
  const activeWorkflowId = executionSession?.workflow_id || pipelineResult?.workflow_id;
  const graphExecutionState = executionSession?.state || null;
  const isManager = currentUser?.app_role === 'manager';

  // Execute button behavior:
  // - Manager: always executes if gate passed (or direct if already has execution)
  // - Employee: blocked if waiting_for_manager
  const canExecute = isLastBuildPassed && (isManager || (!isManager && approvalStatus !== 'waiting'));

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
          currentUser={currentUser}
          onLogout={onLogout}
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
                : gateBanner.type === 'waiting'
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-900/50'
                : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-900/50'
            }`}
          >
            {gateBanner.type === 'passed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : gateBanner.type === 'waiting' ? (
              <Clock className="w-5 h-5 text-amber-400" />
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
                  setApprovalStatus(null);
                  setApprovalRequestId(null);
                }}
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
                    ) : approvalStatus === 'waiting' ? (
                      <span className="badge badge-yellow text-[9px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Awaiting Manager Approval
                      </span>
                    ) : isLastBuildPassed === false ? (
                      <span className="badge badge-red text-[9px]">Gate Blocked</span>
                    ) : (
                      <span className="badge vf-bg-card-alt vf-text-secondary text-[9px]">No Active Execution</span>
                    )}
                  </div>

                  {/* Waiting for Manager State */}
                  {!executionSession && pipelineResult && isLastBuildPassed && approvalStatus === 'waiting' && (
                    <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Awaiting Manager Approval
                      </div>
                      <p className="text-amber-400/80 text-[11px] leading-relaxed">
                        Verification passed successfully. This workflow has been submitted to the Manager for review.
                        Execution will begin once the Manager approves the request.
                      </p>
                      <div className="text-[10px] text-amber-300/60 font-mono">
                        Request ID: #{approvalRequestId}
                      </div>
                    </div>
                  )}

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
            <div className="w-[22%] min-w-[240px] max-w-[320px] h-full flex-shrink-0 flex flex-col">
              <VerificationInspector
                pipelineResult={pipelineResult}
                selectedNode={selectedNode}
                onApplyFixText={handleApplyFixText}
                onOpenFixModal={(v) => setSelectedViolationForFix(v)}
                onOpenWhatIfModal={() => setActiveOverlayModal('whatif')}
                onExecuteWorkflow={() => setCenterTab('execution')}
                isExecuting={centerTab === 'execution'}
                currentUser={currentUser}
                approvalStatus={approvalStatus}
                activeManagerRequest={activeManagerRequest}
                onApproveRequest={handleManagerApproveAction}
                onRejectRequest={handleManagerRejectAction}
                isApprovingRequest={isApprovingRequest}
              />

              {/* Approval Requests Panel (Manager pending or Employee submitted workflows) */}
              {pendingRequests.length > 0 && (
                <div className="border-t vf-border vf-bg-card p-3 overflow-y-auto" style={{ maxHeight: '40vh' }}>
                  <PendingRequestCard
                    requests={pendingRequests}
                    onOpenRequest={handleOpenRequest}
                    activeRequestId={activeManagerRequest?.id || approvalRequestId}
                    isManager={isManager}
                    onApproveRequest={handleManagerApproveAction}
                    onRejectRequest={handleManagerRejectAction}
                    isApprovingRequest={isApprovingRequest}
                  />
                </div>
              )}
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
          onLoadWorkflow={handleLoadWorkflow}
          currentUser={currentUser}
        />
      )}

      {activeOverlayModal === 'compliance' && (
        <ComplianceRuleLibrary
          onClose={() => setActiveOverlayModal(null)}
          currentUser={currentUser}
        />
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
