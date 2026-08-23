import React, { useState, useEffect } from 'react';
import { GitBranch, ShieldCheck, ShieldAlert, Eye, Search, Filter } from 'lucide-react';
import { getWorkflows } from '../api/client';

export default function WorkflowsListView() {
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const list = await getWorkflows();
        setWorkflows(list);
      } catch (err) {
        console.error('Failed to load workflows list:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div className="saas-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Compiled Workflows Directory
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {workflows.length} Compiled Graphs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.length === 0 ? (
          <div className="col-span-full saas-card p-8 text-center text-slate-400 text-xs">
            No workflows compiled yet. Use Compiler Studio to compile policies into verified graph objects.
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.workflow_id} className="saas-card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-indigo text-[10px] font-mono">{wf.workflow_id}</span>
                  <span className={`badge ${wf.status === 'verified' ? 'badge-green' : 'badge-red'}`}>
                    {wf.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{wf.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {wf.ir_json?.description || 'Workflow compiled from policy.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {wf.created_at ? new Date(wf.created_at).toLocaleDateString() : 'Recent'}
                </span>
                <button
                  onClick={() => setSelectedWorkflow(wf)}
                  className="btn btn-secondary text-[11px] py-1 px-2.5"
                >
                  <Eye className="w-3 h-3" /> Inspect IR
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedWorkflow && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm">
                Workflow IR Data — {selectedWorkflow.workflow_id}
              </span>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-auto rounded-lg mt-3 flex-1">
              {JSON.stringify(selectedWorkflow.ir_json, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
