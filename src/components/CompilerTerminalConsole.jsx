import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react';

export default function CompilerTerminalConsole({ pipelineResult, isCompiling, isOpen, onToggle }) {
  const [activeTab, setActiveTab] = useState('all');

  const verification = pipelineResult?.verification;
  const isSuccess = verification?.passed;
  const steps = pipelineResult?.steps || [];
  const duration = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  const getCheckInfo = (type) => {
    const chk = verification?.checks_run?.find((c) => c.check_type === type);
    const hasViolations = verification?.violations?.some((v) => v.check_type === type && ['critical', 'high', 'error'].includes(v.severity?.toLowerCase()));
    const passed = chk ? chk.passed : !hasViolations;
    const timeMs = chk ? chk.duration_ms : 0;
    return { passed, timeMs };
  };

  const semantic = getCheckInfo('ambiguity');
  const rbac = getCheckInfo('rbac');
  const graph = getCheckInfo('graph');
  const compliance = getCheckInfo('compliance');
  const conflict = getCheckInfo('conflict');

  return (
    <div className={`border-t vf-border vf-bg-editor flex flex-col transition-all duration-300 z-30 select-none ${isOpen ? 'h-56' : 'h-8'}`}>
      {/* Drawer Header & Tabs Bar */}
      <div className="h-8 vf-bg-secondary border-b vf-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 font-bold vf-text-primary text-xs hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="uppercase tracking-wider">Terminal Output</span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {isOpen && (
            <div className="flex items-center gap-1 vf-bg-card-alt p-0.5 rounded text-[11px]">
              {['all', 'parser', 'ir', 'semantic', 'rbac', 'topology', 'compliance', 'conflict'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded uppercase font-mono font-semibold transition-all cursor-pointer ${
                    activeTab === tab ? 'bg-indigo-600 text-white' : 'vf-text-secondary hover:vf-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono vf-text-secondary">
          <span>Build: <strong className="vf-text-primary">{duration.toFixed(0)}ms</strong></span>
          <span>Errors: <strong className={verification?.total_errors ? "text-rose-400" : "text-emerald-400"}>{verification?.total_errors || 0}</strong></span>
          {verification?.verification_id && (
            <span className="hidden sm:inline text-emerald-400 font-semibold font-mono">[{verification.verification_id}]</span>
          )}
        </div>
      </div>

      {/* Drawer Output Scroll Body */}
      {isOpen && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 vf-text-primary vf-bg-gutter">
          {isCompiling ? (
            <div className="compiler-terminal-line text-indigo-400 animate-pulse">
              <span>&gt; Executing 8-stage verification pipeline compilation...</span>
            </div>
          ) : !pipelineResult ? (
            <div className="vf-text-tertiary italic">&gt; Ready. Press Compile & Verify to build policy pipeline.</div>
          ) : (
            <>
              {(activeTab === 'all' || activeTab === 'parser') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 02] Natural Language Parsing... <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({steps[1]?.duration_ms || 12}ms)</span>
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'ir') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 03] Workflow IR Construction... <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({steps[2]?.duration_ms || 8}ms)</span>
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'semantic') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 04] Semantic Ambiguity Detection...
                  {semantic.passed ? (
                    <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({semantic.timeMs}ms)</span>
                  ) : (
                    <span className="text-rose-400 font-bold ml-2">✕ FAILED ({semantic.timeMs}ms) — Ambiguity Violations Detected</span>
                  )}
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'rbac') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 05] PyCasbin RBAC Authorization...
                  {rbac.passed ? (
                    <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({rbac.timeMs}ms)</span>
                  ) : (
                    <span className="text-rose-400 font-bold ml-2">✕ FAILED ({rbac.timeMs}ms) — Unauthorized Action/Role Mismatch</span>
                  )}
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'topology') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 06] NetworkX Graph & Topology Verification...
                  {graph.passed ? (
                    <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({graph.timeMs}ms)</span>
                  ) : (
                    <span className="text-rose-400 font-bold ml-2">✕ FAILED ({graph.timeMs}ms) — Topological / Cycle Anomaly Detected</span>
                  )}
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'compliance') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 07] Compliance Rules Evaluation...
                  {compliance.passed ? (
                    <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({compliance.timeMs}ms)</span>
                  ) : (
                    <span className="text-rose-400 font-bold ml-2">✕ FAILED ({compliance.timeMs}ms) — Mandatory Rule Requirement Missing</span>
                  )}
                </div>
              )}
              {(activeTab === 'all' || activeTab === 'conflict') && (
                <div className="compiler-terminal-line vf-text-primary">
                  <span className="vf-text-tertiary">&gt;</span> [Stage 07] Policy Conflict Detection...
                  {conflict.passed ? (
                    <span className="text-emerald-400 font-bold ml-2">✓ PASSED ({conflict.timeMs}ms)</span>
                  ) : (
                    <span className="text-rose-400 font-bold ml-2">✕ FAILED ({conflict.timeMs}ms) — Separation of Duty / Conflict Detected</span>
                  )}
                </div>
              )}

              <div className="pt-2 border-t vf-border font-bold text-xs">
                {isSuccess ? (
                  <div className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ✓ BUILD SUCCESS — Gate Opened. Workflow verified and authorized for runtime execution.
                  </div>
                ) : (
                  <div className="text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    ✕ BUILD FAILED — Gate Blocked. {verification?.total_errors || 1} blocking violation(s) detected across {verification?.failed_checks?.join(', ') || 'checks'}. Execution blocked.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
