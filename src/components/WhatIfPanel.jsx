import React, { useState } from 'react';
import { HelpCircle, AlertOctagon, X } from 'lucide-react';
import { runWhatIf } from '../api/client';

const SCENARIOS = [
  { id: 'finance_rejected', name: 'Finance Approval Rejected', desc: 'What if finance approval is denied?' },
  { id: 'budget_exceeded', name: 'Budget Exceeded', desc: 'What if total cost exceeds budget threshold?' },
  { id: 'vendor_failed', name: 'Vendor Verification Failed', desc: 'What if vendor fails compliance check?' },
  { id: 'cfo_rejected', name: 'CFO Approval Rejected', desc: 'What if high-value CFO approval is rejected?' },
];

export default function WhatIfPanel({ workflowIr, onClose }) {
  const [selectedScenario, setSelectedScenario] = useState('finance_rejected');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunWhatIf = async () => {
    if (!workflowIr) return;
    setIsLoading(true);
    try {
      const res = await runWhatIf(workflowIr, selectedScenario);
      setSimulationResult(res);
    } catch (err) {
      console.error('What-if simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-2xl w-full p-5 flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b vf-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold vf-text-primary">
              What-If Simulation Studio
            </h3>
          </div>
          <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="flex-1 vf-bg-card-alt border vf-border rounded p-2 text-xs vf-text-primary focus:outline-none focus:border-amber-500"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id} className="vf-bg-card vf-text-primary">
                  {s.name} — {s.desc}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunWhatIf}
              disabled={isLoading || !workflowIr}
              className="btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {isLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          {!workflowIr && (
            <p className="vf-text-secondary italic text-center py-4">
              Compile a policy first to enable what-if scenario simulations.
            </p>
          )}

          {simulationResult && (
            <div className="vf-bg-gutter p-4 rounded-xl border vf-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  Outcome: {simulationResult.final_state?.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono vf-text-secondary">
                  {simulationResult.completed_steps?.length} completed · {simulationResult.affected_steps?.length} impacted
                </span>
              </div>

              <p className="text-xs vf-text-secondary leading-relaxed vf-bg-card p-3 rounded-lg border vf-border font-mono whitespace-pre-line">
                {simulationResult.summary}
              </p>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold vf-text-secondary uppercase tracking-wider block">Resulting Impact Breakdown</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simulationResult.execution_path?.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        step.status === 'completed'
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : step.status === 'skipped'
                          ? 'vf-bg-gutter vf-border vf-text-tertiary'
                          : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold">{step.action}</span>
                        <span className="text-[10px] vf-text-secondary block truncate">{step.role}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded vf-bg-card-alt">
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t vf-border flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">
            Close Simulation Studio
          </button>
        </div>
      </div>
    </div>
  );
}


