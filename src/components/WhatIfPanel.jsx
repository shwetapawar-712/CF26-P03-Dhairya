import React, { useState } from 'react';
import { HelpCircle, Play, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { runWhatIf } from '../api/client';

const SCENARIOS = [
  { id: 'finance_rejected', name: 'Finance Approval Rejected', desc: 'What if finance approval is denied?' },
  { id: 'budget_exceeded', name: 'Budget Exceeded', desc: 'What if total cost exceeds budget threshold?' },
  { id: 'vendor_failed', name: 'Vendor Verification Failed', desc: 'What if vendor fails compliance check?' },
  { id: 'cfo_rejected', name: 'CFO Approval Rejected', desc: 'What if high-value CFO approval is rejected?' },
];

export default function WhatIfPanel({ workflowIr }) {
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

  if (!workflowIr) {
    return (
      <div className="glass-panel p-5 text-center text-slate-500 min-h-[200px] flex items-center justify-center">
        <p className="text-sm">What-If simulator idle. Select a verified workflow to run scenario simulations.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            What-If Scenario Simulator
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.desc}
            </option>
          ))}
        </select>

        <button
          onClick={handleRunWhatIf}
          disabled={isLoading}
          className="btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 shadow-lg shadow-amber-500/20"
        >
          {isLoading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {simulationResult && (
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              Simulation Outcome: {simulationResult.final_state?.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {simulationResult.completed_steps?.length} completed · {simulationResult.affected_steps?.length} impacted
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono whitespace-pre-line">
            {simulationResult.summary}
          </p>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Resulting Path Breakdown</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {simulationResult.execution_path?.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    step.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : step.status === 'skipped'
                      ? 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-semibold">{step.action}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{step.role}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
