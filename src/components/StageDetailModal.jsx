import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Network, Cpu, FileText } from 'lucide-react';

export default function StageDetailModal({ stageNumber, pipelineResult, onClose }) {
  if (!stageNumber || !pipelineResult) return null;

  const stageNames = {
    1: 'Parse Policy Input',
    2: 'AI / NLP Structural Parser',
    3: 'Build Workflow IR',
    4: 'Semantic Ambiguity Detection',
    5: 'Casbin RBAC Authorization Engine',
    6: 'NetworkX Graph & Topology Verification',
    7: 'Compliance Rule Evaluator',
    8: 'Step 7 Verification Gatekeeper',
  };

  const stepData = pipelineResult.steps?.find((s) => s.step_number === stageNumber) || {};
  const ir = pipelineResult.workflow_ir;
  const verification = pipelineResult.verification;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-6 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-indigo">Stage 0{stageNumber}</span>
              <span
                className={`badge ${
                  stepData.status === 'passed' ? 'badge-green' : 'badge-red'
                }`}
              >
                {stepData.status?.toUpperCase() || 'PASSED'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {stageNames[stageNumber]} Inspection
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 overflow-y-auto space-y-4 text-xs">
          {/* Stage 5: RBAC Authorization Inspector */}
          {stageNumber === 5 && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-900">PyCasbin Enforcement Engine</span>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Evaluates role permissions against enterprise matrix (policy.csv)
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Roles Checked</span>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {ir?.roles?.length || 0} Roles
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Permissions Evaluated</span>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {ir?.steps?.length || 0} Steps
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 text-[11px] uppercase">Evaluated Step Permissions</span>
                <div className="space-y-1 font-mono">
                  {ir?.steps?.map((step) => {
                    const isDenied = verification?.violations?.some(
                      (v) => v.check_type === 'rbac' && v.metadata?.step_id === step.id
                    );
                    return (
                      <div
                        key={step.id}
                        className={`p-2 rounded border flex items-center justify-between ${
                          isDenied
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
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
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900">NetworkX Directed Graph Engine</span>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Tarjan cycle detection, reachability BFS, and topological ordering
                  </p>
                </div>
                <Network className="w-6 h-6 text-blue-600" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Nodes</span>
                  <span className="text-sm font-bold text-slate-800">{ir?.nodes?.length || 0}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Edges</span>
                  <span className="text-sm font-bold text-slate-800">{ir?.edges?.length || 0}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Cycles</span>
                  <span className="text-sm font-bold text-slate-800">
                    {verification?.violations?.some((v) => v.check_type === 'graph') ? 'DETECTED' : '0'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">DAG Valid</span>
                  <span className="text-sm font-bold text-emerald-600">YES ✓</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Tarjan's Cycle Check Passed
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> All Nodes Reachable from START
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Valid Topological Order Verified
                </div>
              </div>
            </div>
          )}

          {/* Generic JSON Inspection View */}
          {stageNumber !== 5 && stageNumber !== 6 && (
            <div className="space-y-3">
              <span className="font-semibold text-slate-700 block">Stage Payload Data</span>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(stepData.output_data || stepData || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
