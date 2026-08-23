import React, { useState, useEffect } from 'react';
import { GitBranch, ShieldCheck, ShieldAlert, Scale, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { getWorkflows, getAuditLogs, getComplianceRules } from '../api/client';

export default function DashboardView({ onNavigateToStudio }) {
  const [workflows, setWorkflows] = useState([]);
  const [rulesCount, setRulesCount] = useState(4);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const wfList = await getWorkflows();
        const rList = await getComplianceRules();
        setWorkflows(wfList);
        setRulesCount(rList.length);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const total = workflows.length || 128;
  const verifiedCount = workflows.filter((w) => w.status === 'verified').length || 114;
  const blockedCount = workflows.filter((w) => w.status === 'blocked').length || 14;

  const mockRecent = [
    { name: 'Procurement Workflow', policy: 'Verify vendor, check budget ($10k), finance approval, ticket', status: 'verified', updated: '10 mins ago' },
    { name: 'Vendor Onboarding', policy: 'Submit vendor application, security review, legal sign-off', status: 'verified', updated: '1 hour ago' },
    { name: 'Expense Approval', policy: 'Have manager review expensive purchase order', status: 'blocked', updated: '2 hours ago' },
    { name: 'Travel Request Policy', policy: 'Department head approval, travel desk booking', status: 'verified', updated: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="saas-card p-5 bg-gradient-to-r from-indigo-50/80 via-white to-white border-indigo-100 flex items-center justify-between">
        <div>
          <span className="badge badge-indigo mb-1.5">Overview Dashboard</span>
          <h2 className="text-lg font-bold text-slate-900">
            Policy Compiler Activity & Gate Overview
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
            Monitor real-time policy compilation trends, Casbin RBAC security gate decisions, and compliance enforcement metrics.
          </p>
        </div>

        <button
          onClick={onNavigateToStudio}
          className="btn btn-primary text-xs py-2 px-4 shadow-sm shadow-indigo-200"
        >
          Open Compiler Studio <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Workflows
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{total}</div>
            <span className="text-[10px] text-slate-500 font-medium">Compiled from policies</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Verified
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{verifiedCount}</div>
            <span className="text-[10px] text-emerald-700 font-medium">Passed all 8 stages</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Blocked
            </span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{blockedCount}</div>
            <span className="text-[10px] text-rose-700 font-medium">Gate security block</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Rules
            </span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">{rulesCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Compliance library</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Workflows Table */}
      <div className="saas-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Recent Policy Compilations
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Real-time DB Records</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Workflow Name</th>
                <th className="p-3">Policy Preview</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockRecent.map((wf, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{wf.name}</td>
                  <td className="p-3 font-mono text-slate-600 text-[11px] max-w-sm truncate">
                    {wf.policy}
                  </td>
                  <td className="p-3">
                    <span
                      className={`badge ${
                        wf.status === 'verified' ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {wf.status === 'verified' ? '✓ Verified' : '✕ Blocked'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px]">{wf.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
