import React, { useState } from 'react';
import { Cpu, CheckCircle2, Code, Eye } from 'lucide-react';

export default function AIInterpretationCard({ parsedPolicy, workflowIr }) {
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [modalType, setModalType] = useState('ir'); // ir | json

  if (!parsedPolicy && !workflowIr) {
    return (
      <div className="saas-card p-5 h-full flex flex-col justify-center items-center text-center text-slate-400">
        <Cpu className="w-9 h-9 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">AI Interpretation Pending</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Compile a natural-language policy to view extracted actions, roles, and dependency structures.
        </p>
      </div>
    );
  }

  const steps = workflowIr?.steps || parsedPolicy?.steps || [];
  const roles = Array.from(new Set(steps.map((s) => s.role).filter(Boolean)));
  const totalDeps = steps.reduce((sum, s) => sum + (s.dependencies?.length || 0), 0);

  return (
    <div className="saas-card p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              AI / NLP Interpretation
            </h3>
          </div>
          <span className="badge badge-green text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> Parsed
          </span>
        </div>

        {/* Extracted Structure List - Distinct cards per step */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                  0{idx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs leading-snug truncate">
                    {step.action}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-snug truncate mt-0.5">
                    {step.role}
                  </p>
                </div>
              </div>

              {step.approval_required && (
                <span className="badge badge-purple text-[9px] flex-shrink-0 ml-2">
                  Approval Gate
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer & Metrics */}
      <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-slate-600">
          {steps.length} Actions · {roles.length} Roles · {totalDeps} Dependencies
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalType('ir');
              setShowJsonModal(true);
            }}
            className="btn btn-secondary text-[11px] py-1 px-2.5"
          >
            <Eye className="w-3 h-3 text-slate-500" /> View IR
          </button>
          <button
            onClick={() => {
              setModalType('json');
              setShowJsonModal(true);
            }}
            className="btn btn-secondary text-[11px] py-1 px-2.5"
          >
            <Code className="w-3 h-3 text-slate-500" /> View JSON
          </button>
        </div>
      </div>

      {/* JSON/IR Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm">
                Extracted Structure ({modalType.toUpperCase()})
              </span>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-auto rounded-lg mt-3 flex-1">
              {JSON.stringify(modalType === 'ir' ? workflowIr : parsedPolicy, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
