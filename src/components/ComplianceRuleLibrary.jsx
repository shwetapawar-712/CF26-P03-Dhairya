import React, { useState, useEffect } from 'react';
import { Scale, Plus, Trash2, X, CheckCircle2, XCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { getComplianceRules, createComplianceRule, deleteComplianceRule, toggleComplianceRule } from '../api/client';

const RULE_TYPES = [
  { value: 'threshold', label: 'Threshold', description: 'Monetary or numeric limit requiring specific approval', showThreshold: true },
  { value: 'requirement', label: 'Requirement', description: 'Mandatory verification or audit step that must exist', showThreshold: false },
  { value: 'approval', label: 'Approval', description: 'Formal approval sign-off required from a role', showThreshold: false },
  { value: 'role', label: 'Role / Authorization', description: 'Specific authorized role must be assigned to perform action', showThreshold: false },
  { value: 'multi_condition', label: 'Multi-Condition', description: 'Cross-department or dual sign-off compound requirement', showThreshold: false },
];

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'];

const RULE_TYPE_COLORS = {
  threshold: { badge: 'bg-amber-950/60 text-amber-300 border-amber-700/40', icon: '💰' },
  requirement: { badge: 'bg-blue-950/60 text-blue-300 border-blue-700/40', icon: '📋' },
  approval: { badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40', icon: '✅' },
  role: { badge: 'bg-purple-950/60 text-purple-300 border-purple-700/40', icon: '👤' },
  multi_condition: { badge: 'bg-rose-950/60 text-rose-300 border-rose-700/40', icon: '🔗' },
};

const SEVERITY_COLORS = {
  info: 'text-slate-400',
  low: 'text-blue-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-rose-400',
};

const EMPTY_FORM = {
  name: '',
  rule_type: 'threshold',
  threshold: '',
  description: '',
  required_action: '',
  severity: 'high',
};

export default function ComplianceRuleLibrary({ onClose }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await getComplianceRules();
      setRules(res);
    } catch (err) {
      console.error('Failed to fetch compliance rules:', err);
      setErrorMsg('Failed to load compliance rules.');
    } finally {
      setLoading(false);
    }
  };

  const currentTypeDef = RULE_TYPES.find(t => t.value === form.rule_type) || RULE_TYPES[0];

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Rule name is required.';
    if (form.name.trim().length < 3) errors.name = 'Name must be at least 3 characters.';
    if (currentTypeDef.showThreshold) {
      if (!form.threshold && form.threshold !== 0) {
        errors.threshold = 'Threshold value is required for Threshold rules.';
      } else if (isNaN(parseFloat(form.threshold)) || parseFloat(form.threshold) < 0) {
        errors.threshold = 'Threshold must be a positive number.';
      }
    }
    if (!form.description.trim()) errors.description = 'Description or condition is required.';
    return errors;
  };

  const handleCreate = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        name: form.name.trim(),
        rule_type: form.rule_type,
        threshold: currentTypeDef.showThreshold && form.threshold !== '' ? parseFloat(form.threshold) : null,
        description: form.description.trim(),
        condition: form.description.trim(),
        required_action: form.required_action.trim() || form.rule_type,
        severity: form.severity,
        active: true,
      };
      const res = await createComplianceRule(payload);
      if (res.rule) {
        setRules(prev => [...prev, res.rule]);
      } else {
        await fetchRules();
      }
      setForm(EMPTY_FORM);
      setSuccessMsg(`Rule "${payload.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to create compliance rule:', err);
      const detail = err?.response?.data?.detail;
      setErrorMsg(detail ? String(detail) : 'Failed to create rule. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete rule "${name}"?`)) return;
    try {
      await deleteComplianceRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setSuccessMsg(`Rule "${name}" deleted.`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Failed to delete rule:', err);
      setErrorMsg('Failed to delete rule.');
    }
  };

  const handleToggle = async (id, name, currentActive) => {
    try {
      const res = await toggleComplianceRule(id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: res.active } : r));
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b vf-border">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold vf-text-primary">Compliance Rule Library</h3>
            <span className="badge badge-indigo text-[9px]">{rules.length} Rules</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mx-5 mt-3 flex items-center gap-2 p-2.5 bg-emerald-950/60 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px]">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 flex items-center gap-2 p-2.5 bg-rose-950/60 border border-rose-600/40 rounded-lg text-rose-300 text-[11px]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto text-rose-400 hover:text-rose-200"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Add Rule Form ── */}
          <div className="vf-bg-gutter border vf-border rounded-lg p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">+ Add New Rule</span>

            {/* Row 1: Name */}
            <div>
              <label className="text-[10px] vf-text-secondary font-semibold uppercase block mb-1">Rule Name *</label>
              <input
                type="text"
                placeholder="e.g. Finance Approval Threshold"
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                className={`w-full vf-bg-card border rounded px-3 py-1.5 text-xs vf-text-primary focus:outline-none focus:border-indigo-500 ${formErrors.name ? 'border-rose-500' : 'vf-border'}`}
              />
              {formErrors.name && <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.name}</p>}
            </div>

            {/* Row 2: Rule Type + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] vf-text-secondary font-semibold uppercase block mb-1">Rule Type *</label>
                <select
                  value={form.rule_type}
                  onChange={e => updateForm('rule_type', e.target.value)}
                  className="w-full vf-bg-card border vf-border rounded px-3 py-1.5 text-xs vf-text-primary focus:outline-none focus:border-indigo-500"
                >
                  {RULE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="text-[10px] vf-text-tertiary mt-0.5">{currentTypeDef.description}</p>
              </div>
              <div>
                <label className="text-[10px] vf-text-secondary font-semibold uppercase block mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={e => updateForm('severity', e.target.value)}
                  className="w-full vf-bg-card border vf-border rounded px-3 py-1.5 text-xs vf-text-primary focus:outline-none focus:border-indigo-500"
                >
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Row 3: Threshold (conditional on type) */}
            {currentTypeDef.showThreshold && (
              <div>
                <label className="text-[10px] vf-text-secondary font-semibold uppercase block mb-1">Threshold Value ($) *</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={form.threshold}
                  onChange={e => updateForm('threshold', e.target.value)}
                  min="0"
                  className={`w-full bg-[#111827] border rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 ${formErrors.threshold ? 'border-rose-500' : 'border-slate-700'}`}
                />
                {formErrors.threshold && <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.threshold}</p>}
              </div>
            )}

            {/* Row 4: Description / Condition */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                {form.rule_type === 'threshold' ? 'Description' : 'Description / Condition'} *
              </label>
              <input
                type="text"
                placeholder={
                  form.rule_type === 'threshold' ? 'e.g. Finance approval required above limit' :
                  form.rule_type === 'requirement' ? 'e.g. Vendor must be verified before purchase' :
                  form.rule_type === 'approval' ? 'e.g. CFO approval is mandatory for all acquisitions' :
                  form.rule_type === 'role' ? 'e.g. Manager approval required for cross-team operations' :
                  'e.g. Two department approvals required for cross-department operations'
                }
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                className={`w-full bg-[#111827] border rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 ${formErrors.description ? 'border-rose-500' : 'border-slate-700'}`}
              />
              {formErrors.description && <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.description}</p>}
            </div>

            {/* Row 5: Required Action (optional helper) */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Required Workflow Action <span className="text-slate-600">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. finance_approval, verify_vendor, cfo_approval"
                value={form.required_action}
                onChange={e => updateForm('required_action', e.target.value)}
                className="w-full vf-bg-card border vf-border rounded px-3 py-1.5 text-xs vf-text-primary focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] vf-text-tertiary mt-0.5">Step ID that must exist in the workflow for this rule to pass.</p>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="btn btn-primary text-xs w-full py-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Add Rule</>
              )}
            </button>
          </div>

          {/* ── Existing Rules List ── */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider vf-text-secondary block">Active Rule Library</span>
            {loading ? (
              <div className="text-center py-8 vf-text-secondary flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Loading rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 vf-text-tertiary italic border border-dashed vf-border rounded-lg">
                No compliance rules registered. Add your first rule above.
              </div>
            ) : (
              rules.map((r) => {
                const typeInfo = RULE_TYPE_COLORS[r.rule_type] || RULE_TYPE_COLORS.threshold;
                const typeDef = RULE_TYPES.find(t => t.value === r.rule_type) || RULE_TYPES[0];
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border vf-bg-editor flex items-start justify-between gap-3 transition-all ${r.active ? 'vf-border' : 'vf-border-subtle opacity-60'}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold vf-text-primary text-xs">{r.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${typeInfo.badge}`}>
                          {typeInfo.icon} {typeDef.label}
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${SEVERITY_COLORS[r.severity] || 'vf-text-secondary'}`}>
                          {r.severity}
                        </span>
                        {!r.active && <span className="text-[9px] vf-text-tertiary font-mono">[DISABLED]</span>}
                      </div>
                      {r.description && (
                        <p className="text-[10px] vf-text-secondary line-clamp-2">{r.description}</p>
                      )}
                      {r.rule_type === 'threshold' && r.threshold != null && (
                        <span className="text-[10px] text-amber-300 font-mono font-bold">
                          Threshold: ${Number(r.threshold).toLocaleString()}
                        </span>
                      )}
                      {r.required_action && (
                        <span className="text-[10px] vf-text-tertiary font-mono block">
                          Required Action: {r.required_action}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggle(r.id, r.name, r.active)}
                        className={`p-1.5 rounded transition-colors text-[10px] cursor-pointer ${r.active ? 'text-emerald-400 hover:text-emerald-200' : 'vf-text-tertiary hover:vf-text-primary'}`}
                        title={r.active ? 'Disable rule' : 'Enable rule'}
                      >
                        {r.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded transition-colors cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        {onClose && (
          <div className="p-5 border-t vf-border flex justify-between items-center">
            <span className="text-[10px] vf-text-secondary">
              <Shield className="w-3 h-3 inline mr-1 text-indigo-400" />
              Rules are enforced during workflow compilation and verification.
            </span>
            <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

