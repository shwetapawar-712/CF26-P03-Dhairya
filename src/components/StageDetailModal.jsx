import React from 'react';
import { X, CheckCircle2, XCircle, ShieldCheck, Network, AlertTriangle, Scale, Lock, KeyRound, AlertOctagon } from 'lucide-react';

export default function StageDetailModal({ stageNumber, pipelineResult, onClose }) {
  if (!stageNumber || !pipelineResult) return null;

  const stageNames = {
    1: 'Submit Policy Input',
    2: 'AI / NLP Structural Parser',
    3: 'Build Workflow IR',
    4: 'Semantic Ambiguity Detection',
    5: 'Casbin RBAC Authorization Engine',
    6: 'NetworkX Graph & Topology Verification',
    7: 'Compliance & Policy Conflict Evaluator',
    8: 'Verification Gatekeeper (Final Gate)',
  };

  const stepData = pipelineResult.steps?.find((s) => s.step_number === stageNumber) || {};
  const ir = pipelineResult.workflow_ir;
  const verification = pipelineResult.verification;

  const isStagePassed = stepData.status === 'passed';
  const violations = verification?.violations || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-2xl w-full p-5 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b vf-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-indigo font-mono">Stage 0{stageNumber}</span>
              <span
                className={`badge font-bold ${
                  isStagePassed ? 'badge-green' : 'badge-red'
                }`}
              >
                {stepData.status?.toUpperCase() || (isStagePassed ? 'PASSED' : 'BLOCKED')}
              </span>
            </div>
            <h3 className="text-sm font-bold vf-text-primary">
              {stageNames[stageNumber]} Inspection
            </h3>
          </div>
          <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Modal Body */}
        <div className="py-4 overflow-y-auto space-y-4">
          {/* Stage 4: Semantic Ambiguity Detection */}
          {stageNumber === 4 && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-200">Semantic Ambiguity Engine</span>
                  <p className="text-[11px] text-amber-400 mt-0.5">
                    Checks for ambiguous roles, unquantified thresholds, and vague directives.
                  </p>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>

              {violations.filter((v) => v.check_type === 'ambiguity').length > 0 ? (
                <div className="space-y-2">
                  <span className="font-bold text-rose-400 uppercase text-[10px] tracking-wider block">
                    Detected Ambiguities ({violations.filter((v) => v.check_type === 'ambiguity').length})
                  </span>
                  {violations
                    .filter((v) => v.check_type === 'ambiguity')
                    .map((v, i) => (
                      <div key={i} className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-bold text-rose-300">
                          <span>{v.problem}</span>
                          <span className="badge badge-red text-[9px] uppercase">{v.severity}</span>
                        </div>
                        <p className="text-slate-300">{v.cause}</p>
                        <div className="text-emerald-400 text-[10px] pt-1">
                          💡 <strong>Fix:</strong> {v.suggested_fix}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>No semantic ambiguities detected. All roles and thresholds are clearly quantified.</span>
                </div>
              )}
            </div>
          )}

          {/* Stage 5: RBAC Authorization Inspector */}
          {stageNumber === 5 && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-200">PyCasbin Enforcement Engine</span>
                  <p className="text-[11px] text-indigo-400 mt-0.5">
                    Evaluates role permissions against enterprise matrix (policy.csv)
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Roles Checked</span>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {ir?.roles?.length || 0} Roles
                  </div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Permissions Evaluated</span>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {ir?.steps?.length || 0} Steps
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-300 text-[11px] uppercase">Evaluated Step Permissions</span>
                <div className="space-y-1 font-mono">
                  {ir?.steps?.map((step) => {
                    const isDenied = verification?.violations?.some(
                      (v) => v.check_type === 'rbac' && (v.metadata?.step_id === step.id || v.problem.includes(step.role))
                    );
                    return (
                      <div
                        key={step.id}
                        className={`p-2 rounded border flex items-center justify-between ${
                          isDenied
                            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                            : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        }`}
                      >
                        <span className="font-semibold">{step.role} → {step.action}</span>
                        <span className="font-bold">{isDenied ? 'DENIED ✕' : 'ALLOW ✓'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stage 6: NetworkX Graph Inspector */}
          {stageNumber === 6 && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-200">NetworkX Directed Graph Engine</span>
                  <p className="text-[11px] text-blue-400 mt-0.5">
                    Tarjan cycle detection, reachability BFS, and topological ordering
                  </p>
                </div>
                <Network className="w-6 h-6 text-blue-400" />
              </div>

              {(() => {
                const graphViols = violations.filter((v) => v.check_type === 'graph');
                const hasCycle = graphViols.some((v) => v.problem.toLowerCase().includes('circular') || v.problem.toLowerCase().includes('cycle'));
                const hasUnreachable = graphViols.some((v) => v.problem.toLowerCase().includes('unreachable'));
                const isDagValid = graphViols.length === 0;

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Nodes</span>
                        <span className="text-sm font-bold text-slate-200">{ir?.nodes?.length || 0}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Edges</span>
                        <span className="text-sm font-bold text-slate-200">{ir?.edges?.length || 0}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Cycles</span>
                        <span className={`text-sm font-bold ${hasCycle ? 'text-rose-400' : 'text-slate-200'}`}>
                          {hasCycle ? 'DETECTED ✕' : '0'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">DAG Valid</span>
                        <span className={`text-sm font-bold ${isDagValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isDagValid ? 'YES ✓' : 'NO ✕'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 font-mono text-[11px]">
                      <div className={`flex items-center gap-1.5 ${hasCycle ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {hasCycle ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        <span>Tarjan's Cycle Check: {hasCycle ? 'CYCLE DETECTED (Blocked)' : 'Passed (No Cycles)'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUnreachable ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {hasUnreachable ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        <span>Reachability Analysis: {hasUnreachable ? 'Unreachable States Found' : 'All Nodes Reachable from START'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${isDagValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDagValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                        <span>Topological Sort: {isDagValid ? 'Valid Execution Order' : 'Topological Ordering Unfeasible'}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Stage 7: Compliance & Conflict Rules */}
          {stageNumber === 7 && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-purple-200">Compliance & Conflict Rules Engine</span>
                  <p className="text-[11px] text-purple-400 mt-0.5">
                    Evaluates enterprise threshold policies and separation of duty (SOD) integrity.
                  </p>
                </div>
                <Scale className="w-6 h-6 text-purple-400" />
              </div>

              {violations.filter((v) => ['compliance', 'conflict'].includes(v.check_type)).length > 0 ? (
                <div className="space-y-2">
                  <span className="font-bold text-rose-400 uppercase text-[10px] tracking-wider block">
                    Rule Violations ({violations.filter((v) => ['compliance', 'conflict'].includes(v.check_type)).length})
                  </span>
                  {violations
                    .filter((v) => ['compliance', 'conflict'].includes(v.check_type))
                    .map((v, i) => (
                      <div key={i} className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-bold text-rose-300">
                          <span>{v.problem}</span>
                          <span className="badge badge-red text-[9px] uppercase">{v.severity}</span>
                        </div>
                        <p className="text-slate-300">{v.cause}</p>
                        <div className="text-emerald-400 text-[10px] pt-1">
                          💡 <strong>Fix:</strong> {v.suggested_fix}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Compliant with all configured financial thresholds and separation of duties.</span>
                </div>
              )}
            </div>
          )}

          {/* Stage 8: Final Verification Gatekeeper */}
          {stageNumber === 8 && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">Stage 08: Verification Gatekeeper</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Aggregates all 5 authoritative checks before granting execution authorization.
                  </p>
                </div>
                <Lock className="w-6 h-6 text-indigo-400" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Verification Score</span>
                  <span className="text-base font-bold text-slate-100">{verification?.score ?? (verification?.passed ? 100 : 40)}/100</span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Risk Level</span>
                  <span className={`text-base font-bold ${
                    verification?.risk_level === 'LOW' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {verification?.risk_level || (verification?.passed ? 'LOW' : 'HIGH')}
                  </span>
                </div>
                <div className="p-2.5 vf-bg-gutter border vf-border rounded-lg">
                  <span className="text-[10px] vf-text-secondary uppercase block font-bold">Gate Status</span>
                  <span className={`text-base font-bold ${verification?.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {verification?.passed ? 'OPENED ✓' : 'BLOCKED ✕'}
                  </span>
                </div>
              </div>

              {verification?.verification_id && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-600/40 rounded-lg flex items-center justify-between font-mono text-emerald-300">
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <KeyRound className="w-4 h-4 text-emerald-400" /> Verification Token
                  </span>
                  <span className="font-bold">{verification.verification_id}</span>
                </div>
              )}

              <div className="p-3 vf-bg-editor border vf-border rounded-lg font-mono text-[11px] vf-text-secondary">
                {verification?.summary}
              </div>
            </div>
          )}

          {/* Fallback JSON Payload View for Stages 1-3 */}
          {stageNumber < 4 && (
            <div className="space-y-3">
              <span className="font-semibold vf-text-primary block">Stage Payload Data</span>
              <pre className="p-3 vf-bg-editor border vf-border rounded-lg font-mono text-[11px] overflow-x-auto max-h-60" style={{ color: 'var(--vf-code-text)' }}>
                {JSON.stringify(stepData.output_data || stepData || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t vf-border flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
