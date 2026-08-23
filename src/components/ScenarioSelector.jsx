import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldOff, RefreshCw, Zap } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'scenario_1',
    name: 'Scenario 1 (Valid Policy)',
    badge: '✓ COMPILER PASSED',
    badgeClass: 'badge-green',
    icon: CheckCircle2,
    desc: 'Verify vendor, check budget ($10k), finance approval, procurement ticket.',
    expected: 'Passes all compiler verification checks and becomes eligible for workflow execution.',
  },
  {
    id: 'scenario_2',
    name: 'Scenario 2 (Ambiguous)',
    badge: '✕ BLOCKED — STEP 04',
    badgeClass: 'badge-yellow',
    icon: AlertTriangle,
    desc: 'Expensive purchase sent to manager for quick approval.',
    expected: 'Blocked during semantic ambiguity verification. Workflow cannot proceed to execution.',
  },
  {
    id: 'scenario_3',
    name: 'Scenario 3 (Unauthorized)',
    badge: '✕ BLOCKED — STEP 05',
    badgeClass: 'badge-red',
    icon: ShieldOff,
    desc: 'Procurement Officer approves finance request and creates ticket.',
    expected: 'Blocked during RBAC verification because the assigned role lacks permission.',
  },
  {
    id: 'scenario_4',
    name: 'Scenario 4 (Circular Graph)',
    badge: '✕ BLOCKED — STEP 06',
    badgeClass: 'badge-red',
    icon: RefreshCw,
    desc: 'Budget check requires finance approval, which requires budget re-check.',
    expected: 'Blocked during graph verification because a circular dependency was detected.',
  },
];

export default function ScenarioSelector({ selectedScenario, onSelectScenario, isLoading }) {
  return (
    <div className="saas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Demo Scenarios (Compiler Pipeline Verification Tests)
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Select a preset to test compiler gate checks</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isSelected = selectedScenario === sc.id;

          return (
            <div
              key={sc.id}
              onClick={() => !isLoading && onSelectScenario(sc.id)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-400/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${sc.badgeClass}`}>{sc.badge}</span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">{sc.name}</h4>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-2">
                  {sc.desc}
                </p>
              </div>
              <p className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-2 mt-1">
                {sc.expected}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
