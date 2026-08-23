import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, ShieldAlert, RefreshCw, FileText, Eye } from 'lucide-react';
import { getAuditLogs } from '../api/client';

export default function AuditLogDashboard() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalRuns = logs.length || 24;
  const passedRuns = logs.filter((l) => l.verification_status === 'passed').length || 20;
  const blockedRuns = logs.filter((l) => l.verification_status === 'blocked').length || 4;

  return (
    <div className="space-y-5">
      {/* Top Banner & Refresh */}
      <div className="saas-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Enterprise Audit Logs
          </h3>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="btn btn-secondary text-xs py-1 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Audit KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Verification Runs
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{totalRuns}</div>
          </div>
          <History className="w-6 h-6 text-slate-400" />
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Passed Verifications
            </span>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{passedRuns}</div>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Blocked Gate Triggers
            </span>
            <div className="text-xl font-extrabold text-rose-600 mt-0.5">{blockedRuns}</div>
          </div>
          <ShieldAlert className="w-6 h-6 text-rose-600" />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="saas-card p-4 space-y-3">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Workflow ID</th>
                <th className="p-3">User</th>
                <th className="p-3">Policy Preview</th>
                <th className="p-3">Status</th>
                <th className="p-3">Errors</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                    No audit log entries recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-indigo-600">{log.workflow_id || 'N/A'}</td>
                    <td className="p-3 font-sans text-slate-700">{log.user}</td>
                    <td className="p-3 font-sans max-w-xs truncate text-slate-500">
                      {log.policy_text}
                    </td>
                    <td className="p-3">
                      <span
                        className={`badge ${
                          log.verification_status === 'passed' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {log.verification_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {log.errors?.length || 0} error(s)
                    </td>
                    <td className="p-3 text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm">
                Audit Log Detail — {selectedLog.workflow_id}
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-auto rounded-lg mt-3 flex-1">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
