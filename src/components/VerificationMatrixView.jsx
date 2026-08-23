import React, { useState, useEffect } from 'react';
import { ShieldCheck, Network, Lock, Layers } from 'lucide-react';
import { getRbacMatrix } from '../api/client';

export default function VerificationMatrixView() {
  const [matrix, setMatrix] = useState({ permissions: [], hierarchy: [] });

  useEffect(() => {
    async function load() {
      try {
        const data = await getRbacMatrix();
        setMatrix(data);
      } catch (err) {
        console.error('Failed to load RBAC matrix:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="saas-card p-5 bg-gradient-to-r from-indigo-50/70 to-white border-indigo-100 flex items-center justify-between">
        <div>
          <span className="badge badge-indigo mb-1">Formal Verification Engine</span>
          <h2 className="text-base font-bold text-slate-900">
            Casbin RBAC Matrix & NetworkX Graph Rules
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
            Formal verification rules evaluated at Steps 5 and 6 of the compiler pipeline to ensure zero unauthorized steps and zero invalid cycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-green text-[10px]">PyCasbin Active</span>
          <span className="badge badge-blue text-[10px]">NetworkX Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Casbin RBAC Matrix */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Casbin Enforcer Role Permission Matrix (policy.csv)
            </h3>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Subject Role</th>
                  <th className="p-2.5">Object Resource</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {matrix.permissions?.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-bold text-indigo-700">{p.role}</td>
                    <td className="p-2.5 text-slate-800">{p.resource}</td>
                    <td className="p-2.5 text-emerald-700 font-bold">{p.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NetworkX Graph Engine Rules */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Network className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              NetworkX Graph Verification Algorithms
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 text-sm block">1. Tarjan's Cycle Detection</span>
              <p className="text-slate-600">
                Uses <code className="text-indigo-600 font-mono">nx.simple_cycles(G)</code> to detect circular dependencies between workflow steps. Blocks compilation if cycles are found.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 text-sm block">2. Reachability & Orphan Node Check</span>
              <p className="text-slate-600">
                Executes BFS traversal from the <code className="text-indigo-600 font-mono">START</code> node to ensure every action step can be reached during execution.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 text-sm block">3. Topological Sort Validation</span>
              <p className="text-slate-600">
                Validates DAG execution feasibility using <code className="text-indigo-600 font-mono">nx.topological_sort(G)</code> to generate deterministic execution sequences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
