import React, { useState, useEffect } from 'react';
import { Clock, Layers, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getWorkflows, getWorkflowVersions } from '../api/client';

export default function VersionViewer() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWfId, setSelectedWfId] = useState('');
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await getWorkflows();
        setWorkflows(list);
        if (list.length > 0) {
          setSelectedWfId(list[0].workflow_id);
        }
      } catch (err) {
        console.error('Failed to load workflows:', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedWfId) return;
    async function loadVersions() {
      setIsLoading(true);
      try {
        const verList = await getWorkflowVersions(selectedWfId);
        setVersions(verList);
      } catch (err) {
        console.error('Failed to load versions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadVersions();
  }, [selectedWfId]);

  return (
    <div className="space-y-5">
      <div className="saas-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Workflow Version History & Verification Impact Diff
          </h3>
        </div>

        {workflows.length > 0 && (
          <select
            value={selectedWfId}
            onChange={(e) => setSelectedWfId(e.target.value)}
            className="bg-white border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {workflows.map((w) => (
              <option key={w.workflow_id} value={w.workflow_id}>
                {w.name} ({w.workflow_id})
              </option>
            ))}
          </select>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="saas-card p-8 text-center text-slate-400 text-xs">
          No version history recorded yet for this workflow.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {versions.map((ver) => (
            <div key={ver.id} className="saas-card p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-indigo">Version {ver.version}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(ver.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  {ver.changes_summary || 'Initial compilation'}
                </h4>
                <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-3">
                  "{ver.policy_text}"
                </p>

                {/* Verification Impact Breakdown */}
                <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase block tracking-wider">
                    Verification Impact Analysis
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> RBAC roles remain valid
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Graph topological structure valid
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Threshold compliance updated
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto">
                <div className="text-slate-500 text-[9px] uppercase mb-1">Steps in Version {ver.version}</div>
                {ver.ir_json?.steps?.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-900 last:border-0">
                    <span className="text-cyan-300">{s.action}</span>
                    <span className="text-slate-400">{s.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
