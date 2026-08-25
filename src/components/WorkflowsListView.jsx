import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, X, CheckCircle2, XCircle, FolderOpen, Trash2, ExternalLink, Clock, Tag, Play, User } from 'lucide-react';
import { getWorkflows, deleteWorkflow } from '../api/client';

const STATUS_CONFIG = {
  verified: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'VERIFIED', className: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/40' },
  waiting_for_manager: { icon: <Clock className="w-3 h-3" />, label: 'WAITING FOR MANAGER', className: 'text-amber-400 bg-amber-950/60 border-amber-700/40' },
  approved: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'MANAGER APPROVED', className: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/40' },
  rejected: { icon: <XCircle className="w-3 h-3" />, label: 'MANAGER REJECTED', className: 'text-rose-400 bg-rose-950/60 border-rose-700/40' },
  executing: { icon: <Play className="w-3 h-3" />, label: 'IN PROGRESS', className: 'text-blue-400 bg-blue-950/60 border-blue-700/40' },
  completed: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'COMPLETED', className: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/40' },
  saved: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'SAVED', className: 'text-indigo-400 bg-indigo-950/60 border-indigo-700/40' },
  failed: { icon: <XCircle className="w-3 h-3" />, label: 'FAILED', className: 'text-rose-400 bg-rose-950/60 border-rose-700/40' },
  blocked: { icon: <XCircle className="w-3 h-3" />, label: 'GATE BLOCKED', className: 'text-orange-400 bg-orange-950/60 border-orange-700/40' },
};

export default function WorkflowsListView({ onClose, pipelineResult, onLoadWorkflow, currentUser }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const isManager = currentUser?.app_role === 'manager';

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = () => {
    setLoading(true);
    setError('');
    getWorkflows()
      .then((data) => setWorkflows(data))
      .catch((err) => {
        console.error('Failed to load workflows:', err);
        setError('Failed to load workflows. Is the backend running?');
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (workflowId, name) => {
    if (!window.confirm(`Delete workflow "${name}" from the directory?`)) return;
    setDeletingId(workflowId);
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(w => w.workflow_id !== workflowId));
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      alert('Failed to delete workflow. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const extractVendor = (policyText) => {
    const m = policyText?.match(/from\s+([A-Za-z][A-Za-z\s]+?)(?:\s+for\s|\s+at\s|,|\.)/i);
    return m ? m[1].trim() : null;
  };

  const extractAmount = (policyText) => {
    const m = policyText?.match(/[₹$€][\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:Lakhs?|Crores?|thousand|million)/i);
    return m ? m[0] : null;
  };

  // Group workflows by category
  const grouped = workflows.reduce((acc, wf) => {
    const cat = wf.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(wf);
    return acc;
  }, {});

  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ts; }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b vf-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold vf-text-primary">Workflow Directory</h3>
            <span className="badge badge-indigo text-[9px]">{workflows.length} Workflows</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWorkflows}
              className="vf-text-secondary hover:text-indigo-400 transition-colors p-1 rounded hover:bg-indigo-950/40 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-10 text-center vf-text-secondary flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              Loading workflows...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-400 italic">{error}</div>
          ) : workflows.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed vf-border rounded-lg">
              <FolderOpen className="w-8 h-8 vf-text-tertiary mx-auto" />
              <p className="vf-text-secondary italic">No workflows saved yet.</p>
              <p className="vf-text-tertiary text-[11px]">
                Compile and verify a policy in the Policy Studio,<br />
                then the workflow will be saved here automatically.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, wfs]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider vf-text-secondary">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  {category}
                  <span className="vf-text-tertiary">({wfs.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {wfs.map((wf) => {
                    const statusCfg = STATUS_CONFIG[wf.status] || STATUS_CONFIG.saved;
                    const vendor = extractVendor(wf.policy_text || wf.description);
                    const amount = extractAmount(wf.policy_text || wf.description);

                    return (
                      <div
                        key={wf.workflow_id}
                        className="p-3 vf-bg-editor border vf-border hover:border-indigo-500/50 rounded-lg space-y-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold vf-text-primary text-xs truncate">{wf.name}</p>
                            {wf.description && (
                              <p className="text-[10px] vf-text-secondary line-clamp-1 mt-0.5">{wf.description}</p>
                            )}
                          </div>
                          <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${statusCfg.className}`}>
                            {statusCfg.icon}
                            {statusCfg.label || wf.status?.toUpperCase() || 'SAVED'}
                          </span>
                        </div>

                        {/* Vendor & Amount metadata if present */}
                        {(vendor || amount) && (
                          <div className="flex flex-wrap gap-2 text-[10px] pt-0.5">
                            {vendor && (
                              <span className="vf-text-secondary">
                                <span className="vf-text-tertiary">Vendor:</span> <span className="font-medium vf-text-primary">{vendor}</span>
                              </span>
                            )}
                            {amount && (
                              <span className="vf-text-secondary">
                                <span className="vf-text-tertiary">Amount:</span> <span className="font-medium vf-text-primary">{amount}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Approval metadata */}
                        {wf.reviewed_by && (
                          <div className="text-[10px] text-emerald-400/90 font-medium">
                            ✓ Reviewed by {wf.reviewed_by}
                          </div>
                        )}
                        {wf.status === 'rejected' && wf.rejection_reason && (
                          <div className="text-[10px] text-rose-400/90 font-medium truncate">
                            ✕ Rejection reason: {wf.rejection_reason}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] vf-text-tertiary font-mono">
                            ID: {wf.workflow_id?.slice(0, 12)}…
                          </span>
                          {wf.verification_id && (
                            <span className="text-[9px] vf-text-tertiary font-mono">
                              VT: {wf.verification_id.slice(0, 10)}…
                            </span>
                          )}
                          <span className="text-[9px] vf-text-tertiary flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(wf.created_at)}
                          </span>
                        </div>

                        {/* Step count if IR exists */}
                        {wf.ir_json?.steps && (
                          <p className="text-[9px] vf-text-secondary">
                            {wf.ir_json.steps.length} workflow steps
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1 border-t vf-border-subtle">
                          {onLoadWorkflow && (
                            <button
                              onClick={() => onLoadWorkflow(wf)}
                              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Load
                            </button>
                          )}
                          {isManager && (
                            <button
                              onClick={() => handleDelete(wf.workflow_id, wf.name)}
                              disabled={deletingId === wf.workflow_id}
                              className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-semibold transition-colors disabled:opacity-50 ml-auto cursor-pointer"
                            >
                              {deletingId === wf.workflow_id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div className="p-4 border-t vf-border flex justify-between items-center">
            <span className="text-[10px] vf-text-secondary">
              <GitBranch className="w-3 h-3 inline mr-1 text-indigo-400" />
              Workflows are persisted in the database and versioned per compilation.
            </span>
            <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
