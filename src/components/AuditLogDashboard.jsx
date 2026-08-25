import React, { useState, useEffect } from 'react';
import { History, X, RefreshCw, CheckCircle2, XCircle, Clock, Activity, Shield, Scale, FolderOpen, User, Lock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getAuditLogs } from '../api/client';

const ACTION_ICONS = {
  verify_pipeline: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
  execute_create: <Activity className="w-3.5 h-3.5 text-blue-400" />,
  execute_step: <Clock className="w-3.5 h-3.5 text-cyan-400" />,
  business_approval_approved: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  business_approval_rejected: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
  rule_created: <Scale className="w-3.5 h-3.5 text-amber-400" />,
  rule_deleted: <Scale className="w-3.5 h-3.5 text-rose-400" />,
  rule_toggled: <Scale className="w-3.5 h-3.5 text-slate-400" />,
  workflow_saved: <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />,
  workflow_deleted: <FolderOpen className="w-3.5 h-3.5 text-rose-400" />,
  login: <User className="w-3.5 h-3.5 text-indigo-400" />,
  login_failed: <Lock className="w-3.5 h-3.5 text-rose-400" />,
  workflow_submitted_for_approval: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  manager_opened_request: <Shield className="w-3.5 h-3.5 text-blue-400" />,
  manager_approved_workflow: <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />,
  manager_rejected_workflow: <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />,
};

const STATUS_COLORS = {
  passed: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/40',
  blocked: 'text-rose-400 bg-rose-950/60 border-rose-700/40',
  failed: 'text-rose-400 bg-rose-950/60 border-rose-700/40',
  pending: 'text-slate-400 bg-slate-800/60 border-slate-700/40',
};

export default function AuditLogDashboard({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    setError('');
    getAuditLogs()
      .then((res) => setLogs(res))
      .catch((err) => {
        console.error('Failed to load audit logs:', err);
        setError('Failed to load audit logs. Is the backend running?');
      })
      .finally(() => setLoading(false));
  };

  const ACTION_CATEGORIES = [
    { id: 'all', label: 'All Events' },
    { id: 'auth', label: 'Auth & Login' },
    { id: 'approval', label: 'Approvals' },
    { id: 'verify', label: 'Verifications' },
    { id: 'execute', label: 'Executions' },
    { id: 'rule', label: 'Rule Changes' },
    { id: 'workflow', label: 'Workflows' },
  ];

  const filterMap = {
    all: () => true,
    auth: (l) => l.action?.startsWith('login'),
    approval: (l) => l.action?.includes('approval') || l.action?.includes('manager_'),
    verify: (l) => l.action?.startsWith('verify'),
    execute: (l) => l.action?.startsWith('execute'),
    rule: (l) => l.action?.startsWith('rule'),
    workflow: (l) => l.action?.startsWith('workflow'),
  };

  const filteredLogs = logs.filter(filterMap[filter] || (() => true));

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b vf-border">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold vf-text-primary">Enterprise Audit Log Trail</h3>
            <span className="badge badge-indigo text-[9px]">{filteredLogs.length} Events</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="vf-text-secondary hover:text-indigo-400 transition-colors p-1 rounded hover:bg-indigo-950/40 cursor-pointer"
              title="Refresh logs"
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

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b vf-border flex-wrap">
          {ACTION_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                filter === cat.id
                  ? 'bg-indigo-600/80 text-white'
                  : 'vf-text-secondary hover:vf-text-primary hover:vf-bg-card-alt'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Log Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 text-center vf-text-secondary flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              Fetching audit logs...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-400 italic">{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center vf-text-tertiary italic border border-dashed vf-border rounded-lg">
              No audit records match this filter. System events appear here once actions are taken.
            </div>
          ) : (
            <div className="space-y-1.5 font-mono">
              {filteredLogs.map((log, i) => {
                const statusClass = STATUS_COLORS[log.verification_status] || STATUS_COLORS.pending;
                const icon = ACTION_ICONS[log.action] || <Activity className="w-3.5 h-3.5 vf-text-secondary" />;
                return (
                  <div key={log.id ?? i} className="p-3 vf-bg-editor rounded-lg border vf-border hover:border-indigo-500/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Icon + Action */}
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="mt-0.5 flex-shrink-0">{icon}</div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold vf-text-primary text-[11px]">
                              {log.action_label || log.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {log.workflow_id && (
                              <span className="text-[9px] vf-text-tertiary font-mono vf-bg-card-alt px-1.5 py-0.5 rounded">
                                wf:{log.workflow_id.slice(0, 8)}
                              </span>
                            )}
                            {log.verification_id && (
                              <span className="text-[9px] vf-text-tertiary font-mono vf-bg-card-alt px-1.5 py-0.5 rounded">
                                vt:{log.verification_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          {log.policy_text && (
                            <p className="text-[10px] vf-text-secondary line-clamp-2 leading-relaxed">
                              {log.policy_text}
                            </p>
                          )}
                          {log.errors && log.errors.length > 0 && (
                            <p className="text-[10px] text-rose-400">
                              Errors: {log.errors.slice(0, 2).join(' · ')}{log.errors.length > 2 ? ` +${log.errors.length - 2} more` : ''}
                            </p>
                          )}
                          <div className="text-[9px] vf-text-tertiary">
                            {log.actor || 'System / Compliance Engine'}
                          </div>
                        </div>
                      </div>
                      {/* Right: Status + Time */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${statusClass}`}>
                          {log.verification_status || 'pending'}
                        </span>
                        <span className="text-[9px] vf-text-tertiary font-sans whitespace-nowrap">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div className="p-4 border-t vf-border flex justify-between items-center">
            <span className="text-[10px] vf-text-secondary">
              <Shield className="w-3 h-3 inline mr-1 text-indigo-400" />
              All system events are immutably recorded for compliance audit purposes.
            </span>
            <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

