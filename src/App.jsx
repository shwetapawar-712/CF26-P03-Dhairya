import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import CompilerStudio from './components/CompilerStudio';
import DashboardView from './components/DashboardView';
import WorkflowsListView from './components/WorkflowsListView';
import VerificationMatrixView from './components/VerificationMatrixView';
import ComplianceRuleLibrary from './components/ComplianceRuleLibrary';
import AuditLogDashboard from './components/AuditLogDashboard';
import VersionViewer from './components/VersionViewer';

import { verifyPolicy, runScenario } from './api/client';

export default function App() {
  // DEFAULT TO COMPILER STUDIO AS PRIMARY HERO SCREEN
  const [activeTab, setActiveTab] = useState('studio');

  // Initial Empty State — Waiting for user input or scenario selection
  const [policyText, setPolicyText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [executionState, setExecutionState] = useState(null);

  const handleCompile = async () => {
    if (!policyText.trim()) return;
    setIsLoading(true);
    try {
      const res = await verifyPolicy(policyText);
      setPipelineResult(res);
      setSelectedScenario(null);
    } catch (err) {
      console.error('Pipeline compilation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScenario = async (scenarioId) => {
    setSelectedScenario(scenarioId);
    setIsLoading(true);
    try {
      const res = await runScenario(scenarioId);
      setPipelineResult(res);
      if (res.policy_text) {
        setPolicyText(res.policy_text);
      }
    } catch (err) {
      console.error(`Failed to run scenario ${scenarioId}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFixText = (fixedText) => {
    setPolicyText(fixedText);
    setIsLoading(true);
    verifyPolicy(fixedText)
      .then((res) => {
        setPipelineResult(res);
        setSelectedScenario(null);
      })
      .finally(() => setIsLoading(false));
  };

  const isLastBuildPassed = pipelineResult?.verification?.passed;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* Fixed Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Scrollable Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <HeaderBar
          activeTab={activeTab}
          isCompiling={isLoading}
          lastBuildPassed={isLastBuildPassed}
        />

        {/* View Router Main Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'studio' && (
            <CompilerStudio
              policyText={policyText}
              onChangePolicyText={setPolicyText}
              selectedScenario={selectedScenario}
              onSelectScenario={handleRunScenario}
              pipelineResult={pipelineResult}
              isLoading={isLoading}
              onCompile={handleCompile}
              onReset={() => {
                setPolicyText('');
                setPipelineResult(null);
                setSelectedScenario(null);
              }}
              onApplyFixText={handleApplyFixText}
              executionState={executionState}
              onExecutionChange={(st) => setExecutionState(st)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView onNavigateToStudio={() => setActiveTab('studio')} />
          )}

          {activeTab === 'workflows' && <WorkflowsListView />}

          {activeTab === 'verification' && <VerificationMatrixView />}

          {activeTab === 'compliance' && <ComplianceRuleLibrary />}

          {activeTab === 'audit' && <AuditLogDashboard />}

          {activeTab === 'versions' && <VersionViewer />}

          {activeTab === 'settings' && (
            <div className="saas-card p-6 text-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">System Settings</h3>
              <p className="text-slate-600">FastAPI Backend API Connection: <code className="bg-slate-100 p-1 rounded font-mono">http://localhost:8000/api</code></p>
              <p className="text-slate-600">PyCasbin Policy Path: <code className="bg-slate-100 p-1 rounded font-mono">backend/app/rbac/policy.csv</code></p>
              <p className="text-slate-600">NetworkX Verifier Engine: <code className="bg-slate-100 p-1 rounded font-mono">backend/app/services/graph_verifier.py</code></p>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="saas-card p-6 text-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">NLC Compiler Architecture Help</h3>
              <p className="text-slate-600 leading-relaxed">
                NLC converts plain-English business policies into formally verified, machine-executable directed workflow graphs.
                Every policy passes through 8 verification stages before execution is allowed.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
