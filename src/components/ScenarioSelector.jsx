import React from 'react';

const SCENARIOS = [
  { id: 'scenario_procurement', name: '📦 Procurement: Lenovo India (₹80L / IT Dept)' },
  { id: 'scenario_procurement_dell', name: '📦 Procurement: Dell India (₹60L / Engineering)' },
  { id: 'scenario_procurement_sme', name: '📦 Procurement: ABC Tech (₹15L / Human Review)' },
  { id: 'scenario_procurement_overbudget', name: '⚠️ Procurement: HP India (₹95L > ₹40L Over-Budget)' },
  { id: 'scenario_procurement_missing', name: '❓ Procurement: Incomplete (Needs Clarification)' },
  { id: 'scenario_1', name: 'Scenario 1 (Valid Standard Policy — Pass)' },
  { id: 'scenario_2', name: 'Scenario 2 (Ambiguous — Block Step 4)' },
  { id: 'scenario_3', name: 'Scenario 3 (Unauthorized — Block Step 5)' },
  { id: 'scenario_4', name: 'Scenario 4 (Circular Graph — Block Step 6)' },
];

export default function ScenarioSelector({ selectedScenario, onSelectScenario, isLoading }) {
  return (
    <select
      value={selectedScenario || ''}
      onChange={(e) => e.target.value && onSelectScenario(e.target.value)}
      disabled={isLoading}
      className="vf-bg-card-alt border vf-border rounded px-2.5 py-1 text-xs text-indigo-400 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
    >
      <option value="" disabled>Load Demo Scenario...</option>
      {SCENARIOS.map((sc) => (
        <option key={sc.id} value={sc.id} className="vf-bg-card vf-text-primary">
          {sc.name}
        </option>
      ))}
    </select>
  );
}
