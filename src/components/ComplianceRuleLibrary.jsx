import React, { useState, useEffect } from 'react';
import { Scale, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getComplianceRules, createComplianceRule, deleteComplianceRule } from '../api/client';

export default function ComplianceRuleLibrary() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    condition: 'purchase_amount > 20000',
    required_action: 'cfo_approval',
    severity: 'error',
    active: true,
  });

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const data = await getComplianceRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.name || !newRule.condition) return;
    try {
      await createComplianceRule(newRule);
      setShowAddModal(false);
      setNewRule({
        name: '',
        description: '',
        condition: 'purchase_amount > 20000',
        required_action: 'cfo_approval',
        severity: 'error',
        active: true,
      });
      loadRules();
    } catch (err) {
      console.error('Failed to add rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteComplianceRule(ruleId);
      loadRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="saas-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Organizational Compliance Rule Library
          </h3>
        </div>

        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="btn btn-primary text-xs py-1.5 px-3"
        >
          <Plus className="w-3.5 h-3.5" /> Add Compliance Rule
        </button>
      </div>

      {showAddModal && (
        <form
          onSubmit={handleAddRule}
          className="saas-card p-5 bg-slate-50 border-indigo-200 space-y-4 text-xs"
        >
          <h4 className="font-bold text-slate-900 text-sm">Create New Organizational Rule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Executive CFO Approval Rule"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Condition</label>
              <input
                type="text"
                placeholder="e.g. purchase_amount > 50000"
                value={newRule.condition}
                onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Required Action</label>
              <input
                type="text"
                placeholder="e.g. cfo_approval"
                value={newRule.required_action}
                onChange={(e) => setNewRule({ ...newRule, required_action: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Description</label>
              <input
                type="text"
                placeholder="Description of organizational requirement..."
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary text-xs">
              Save Rule
            </button>
          </div>
        </form>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="saas-card p-4 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                <span className="badge badge-green text-[10px]">● ACTIVE</span>
              </div>
              <p className="text-slate-600 text-xs mb-3 leading-relaxed">{rule.description}</p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-slate-700">
                  Condition: <span className="text-indigo-600 font-bold">{rule.condition}</span>
                </div>
                <div className="text-slate-700">
                  Requires Action: <span className="text-emerald-700 font-bold">{rule.required_action}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Enforced by Gatekeeper
              </span>
              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                title="Delete rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
