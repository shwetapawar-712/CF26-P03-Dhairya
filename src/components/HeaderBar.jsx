import React from 'react';
import { Search, CheckCircle2, XCircle, RefreshCw, Lock } from 'lucide-react';

export default function HeaderBar({ activeTab, isCompiling, lastBuildPassed }) {
  const titles = {
    studio: {
      title: 'Compiler Studio',
      subtitle: 'Transform natural-language policies into verified executable workflows.',
    },
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Monitor your policy compilation and workflow verification activity.',
    },
    workflows: {
      title: 'Workflows Directory',
      subtitle: 'Browse and manage all compiled workflow graphs.',
    },
    verification: {
      title: 'Verification Engine',
      subtitle: 'Inspect Casbin RBAC policies and NetworkX graph validation metrics.',
    },
    compliance: {
      title: 'Compliance Rule Library',
      subtitle: 'Manage organizational governance and threshold rules.',
    },
    audit: {
      title: 'Audit Logs',
      subtitle: 'Enterprise audit trail for every verification request.',
    },
    versions: {
      title: 'Workflow Versions',
      subtitle: 'Compare policy text diffs and verification impact.',
    },
    settings: {
      title: 'System Settings',
      subtitle: 'Configure backend engine parameters and API connections.',
    },
    help: {
      title: 'Help & Documentation',
      subtitle: 'Learn how the 8-step compiler pipeline verifies policies.',
    },
  };

  const currentInfo = titles[activeTab] || titles.studio;

  let buildBadge = (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span>Last Build Passed</span>
    </div>
  );

  if (isCompiling) {
    buildBadge = (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
        <span>Compiling Policy...</span>
      </div>
    );
  } else if (lastBuildPassed === false) {
    buildBadge = (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        <span>Build Failed</span>
      </div>
    );
  }

  return (
    <header className="h-16 min-h-[64px] bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
          {currentInfo.title}
        </h2>
        <p className="text-xs text-slate-500 font-normal leading-tight mt-0.5">
          {currentInfo.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search policies or rules..."
            className="w-52 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Live Build Status Indicator */}
        {buildBadge}

        {/* Persistent Product Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
          <Lock className="w-3.5 h-3.5 text-slate-600" />
          <span>VERIFY BEFORE EXECUTE</span>
        </div>
      </div>
    </header>
  );
}
