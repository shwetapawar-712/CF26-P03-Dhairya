import React from 'react';
import {
  ShieldCheck, ShieldAlert, Cpu, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, BarChart2, Activity, Wrench, Play, Lock, HelpCircle, KeyRound, AlertOctagon
} from 'lucide-react';

const CORE_CHECKS = [
  { name: 'Semantic Analysis', key: 'ambiguity' },
  { name: 'RBAC Authorization', key: 'rbac' },
  { name: 'Graph Topology', key: 'graph' },
  { name: 'Compliance Rules', key: 'compliance' },
  { name: 'Conflict Detection', key: 'conflict' },
];

export default function VerificationInspector({
  pipelineResult,
  selectedNode,
  onApplyFixText,
  onOpenFixModal,
  onOpenWhatIfModal,
  onExecuteWorkflow,
  isExecuting,
}) {
  const verification = pipelineResult?.verification;
  const workflowIr = pipelineResult?.workflow_ir;
  const steps = workflowIr?.steps || [];
  const roles = Array.from(new Set(steps.map((s) => s.role).filter(Boolean)));

  // Server-computed Verification Score & Risk Level (Single Source of Truth)
  const score = verification ? (verification.score ?? (verification.passed ? 100 : 40)) : '--';
  const riskLevel = verification ? (verification.risk_level || (verification.passed ? 'LOW' : 'HIGH')) : 'LOW';

  let riskBadgeClass = 'badge-green';
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    riskBadgeClass = 'badge-red';
  } else if (riskLevel === 'MEDIUM') {
    riskBadgeClass = 'badge-yellow';
  }

  // Dynamic Check Status Map
  const checkStatusMap = {};
  CORE_CHECKS.forEach((chk) => {
    if (!verification) {
      checkStatusMap[chk.key] = { name: chk.name, pass: null, violations: [] };
    } else {
      const foundCheck = verification.checks_run?.find((c) => c.check_type === chk.key);
      const violationsForType = (verification.violations || []).filter((v) => v.check_type === chk.key);
      const isPassed = foundCheck ? foundCheck.passed : !violationsForType.some((v) => ['critical', 'high', 'error'].includes(v.severity?.toLowerCase()));
      checkStatusMap[chk.key] = {
        name: chk.name,
        pass: isPassed,
        violations: violationsForType,
      };
    }
  });

  const failedChecks = Object.values(checkStatusMap).filter((c) => c.pass === false);
  const passedChecks = Object.values(checkStatusMap).filter((c) => c.pass === true);

  // Timestamps / Durations
  const totalCompileDuration = (pipelineResult?.steps || []).reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  return (
    <div className="w-full h-full vf-bg-card border-l vf-border flex flex-col overflow-hidden text-xs">
      {/* Panel Header */}
      <div className="p-3 border-b vf-border flex items-center justify-between vf-bg-secondary">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold vf-text-primary uppercase tracking-wider text-[11px]">
            Verification Inspector
          </h3>
        </div>
        {verification && (
          <span className={`badge font-bold ${verification.passed ? 'badge-green' : 'badge-red'}`}>
            {verification.passed ? 'GATE PASSED' : 'GATE BLOCKED'}
          </span>
        )}
      </div>

      {/* Main Inspector Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Verification Token / Security ID (when passed) */}
        {verification?.verification_id && (
          <div className="p-2 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold">VERIFICATION ID</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold tracking-wider">
              {verification.verification_id}
            </span>
          </div>
        )}

        {/* Selected Node Inspector Drawer */}
        {selectedNode ? (
          <div className="vf-card p-3 space-y-2 border-indigo-500/50 bg-indigo-950/20">
            <div className="flex items-center justify-between border-b vf-border pb-2">
              <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" /> Node Details
              </span>
              <span className="badge badge-purple text-[9px]">{selectedNode.type || 'Action'}</span>
            </div>
            <div className="space-y-1">
              <div>
                <span className="text-[10px] vf-text-secondary block font-semibold uppercase">Action</span>
                <span className="font-bold vf-text-primary text-xs">{selectedNode.data?.label || selectedNode.id}</span>
              </div>
              <div>
                <span className="text-[10px] vf-text-secondary block font-semibold uppercase">Assigned Role</span>
                <span className="text-indigo-400 font-mono text-xs">{selectedNode.data?.role || 'Unspecified'}</span>
              </div>
              <div>
                <span className="text-[10px] vf-text-secondary block font-semibold uppercase">Security Scope</span>
                <span className="vf-text-primary text-[11px]">PyCasbin RBAC Policy</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Verification Score & Risk Card */}
        <div className="vf-card p-3 space-y-2 text-center vf-bg-card-alt">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold vf-text-secondary uppercase">Verification Score</span>
            <span className={`badge ${riskBadgeClass}`}>Risk: {riskLevel}</span>
          </div>
          <div className="flex items-baseline justify-center gap-1 my-1">
            <span className="text-3xl font-extrabold vf-text-primary font-mono">
              {typeof score === 'number' ? score : score}
            </span>
            <span className="text-xs vf-text-secondary font-mono">/ 100</span>
          </div>
          <div className="w-full vf-bg-editor h-1.5 rounded-full overflow-hidden border vf-border-subtle">
            <div
              className={`h-full transition-all duration-500 ${
                typeof score === 'number' && score >= 85
                  ? 'bg-emerald-500'
                  : typeof score === 'number' && score >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${typeof score === 'number' ? score : 0}%` }}
            />
          </div>
        </div>

        {/* 5 Core Verification Checks (Dynamic Single Source of Truth) */}
        <div className="vf-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold vf-text-secondary uppercase tracking-wider block">
              5 Authoritative Checks
            </span>
            {verification && (
              <span className="text-[10px] font-mono vf-text-secondary">
                {passedChecks.length}/5 Passed
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {CORE_CHECKS.map((chk, i) => {
              const statusObj = checkStatusMap[chk.key];
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b vf-border-subtle last:border-0">
                  <span className="vf-text-primary font-medium">{chk.name}</span>
                  {statusObj.pass === null ? (
                    <span className="vf-text-tertiary text-[10px] font-mono">IDLE</span>
                  ) : statusObj.pass ? (
                    <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PASS
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold text-[10px] flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Human-Readable Failure Report (Section 10) */}
        {verification && !verification.passed && (
          <div className="vf-card p-3 border-rose-500/50 bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-900/50 pb-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                <AlertOctagon className="w-3 h-4" /> VERIFICATION FAILED
              </div>
              <span className="badge badge-red text-[9px]">GATE BLOCKED</span>
            </div>

            {/* Check Breakdown */}
            <div className="space-y-1 text-[11px]">
              {failedChecks.length > 0 && (
                <div className="text-rose-300">
                  <span className="font-bold text-[10px] uppercase block text-rose-400">Failed Checks:</span>
                  {failedChecks.map((fc, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-rose-300">
                      <XCircle className="w-3 h-3 text-rose-400" /> {fc.name}
                    </div>
                  ))}
                </div>
              )}

              {passedChecks.length > 0 && (
                <div className="text-emerald-300 pt-1">
                  <span className="font-bold text-[10px] uppercase block text-emerald-400">Passed Checks:</span>
                  {passedChecks.map((pc, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {pc.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Violations Explainability */}
            <div className="space-y-2.5 pt-1">
              <span className="font-bold text-[10px] vf-text-primary uppercase tracking-wider block">
                Detailed Violation Reports ({verification.violations?.length || 0}):
              </span>
              {verification.violations?.map((v, idx) => (
                <div key={idx} className="p-2.5 vf-bg-card-alt rounded border border-rose-900/60 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-xs">{v.problem}</span>
                    <span className={`badge ${
                      ['critical', 'high', 'error'].includes(v.severity?.toLowerCase()) ? 'badge-red' : 'badge-yellow'
                    } text-[9px] uppercase font-bold`}>
                      {v.severity}
                    </span>
                  </div>
                  <p className="vf-text-secondary leading-relaxed">
                    <strong className="vf-text-primary">Cause:</strong> {v.cause}
                  </p>
                  <div className="p-2 vf-bg-editor rounded border vf-border text-[10px] text-emerald-400">
                    💡 <strong>Suggested Fix:</strong> {v.suggested_fix}
                  </div>
                  <button
                    onClick={() => onOpenFixModal && onOpenFixModal(v)}
                    className="btn btn-primary text-xs w-full mt-1 py-1"
                  >
                    <Wrench className="w-3 h-3" /> Auto-Fix Violation
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Timeline */}
        <div className="vf-card p-3 space-y-2 font-mono text-[11px]">
          <span className="text-[10px] font-bold vf-text-secondary uppercase tracking-wider block">
            Pipeline Execution Timeline
          </span>
          <div className="space-y-1.5 vf-text-secondary text-[10px]">
            {(pipelineResult?.steps || []).map((step) => {
              const isStepPassed = step.status === 'passed';
              const isStepBlocked = step.status === 'blocked';
              return (
                <div key={step.step_number} className="flex justify-between items-center">
                  <span className="truncate pr-2">
                    0{step.step_number}. {step.step_name}
                  </span>
                  <span className={isStepPassed ? 'text-emerald-400 font-bold' : isStepBlocked ? 'text-rose-400 font-bold' : 'vf-text-tertiary'}>
                    {isStepPassed ? '✓' : isStepBlocked ? '✕ BLOCKED' : 'IDLE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compiler Statistics Panel */}
        <div className="vf-card p-3 space-y-2">
          <span className="text-[10px] font-bold vf-text-secondary uppercase tracking-wider block">
            Compiler Statistics
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="p-1.5 vf-bg-editor rounded border vf-border">
              <span className="vf-text-secondary text-[9px] block">Nodes</span>
              <span className="font-bold vf-text-primary">{steps.length + 2}</span>
            </div>
            <div className="p-1.5 vf-bg-editor rounded border vf-border">
              <span className="vf-text-secondary text-[9px] block">Edges</span>
              <span className="font-bold vf-text-primary">{steps.length + 1}</span>
            </div>
            <div className="p-1.5 vf-bg-editor rounded border vf-border">
              <span className="vf-text-secondary text-[9px] block">Roles</span>
              <span className="font-bold vf-text-primary">{roles.length}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] vf-text-secondary font-mono pt-1">
            <span>Pipeline Duration: {totalCompileDuration.toFixed(0)}ms</span>
            <span>Gate: {verification?.passed ? 'OPENED' : 'LOCKED'}</span>
          </div>
        </div>
      </div>

      {/* Inspector Footer Actions (Strictly Security Gated) */}
      <div className="p-3 border-t vf-border vf-bg-secondary flex items-center justify-between gap-2">
        <button
          onClick={onOpenWhatIfModal}
          className="btn btn-secondary text-xs flex-1"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> What-If
        </button>

        {verification?.passed ? (
          <button
            onClick={onExecuteWorkflow}
            disabled={isExecuting}
            className="btn btn-primary text-xs flex-1 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" /> Execute
          </button>
        ) : (
          <button
            disabled
            className="btn btn-disabled-locked text-xs flex-1"
            title="Execution is locked until all compiler verification checks pass."
          >
            <Lock className="w-3.5 h-3.5" /> Execute Locked
          </button>
        )}
      </div>
    </div>
  );
}
