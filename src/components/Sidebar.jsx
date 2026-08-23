import React from 'react';
import {
  Zap, Home, GitBranch, ShieldCheck, Scale, History,
  Clock, Settings, HelpCircle, Lock
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const navGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'studio', label: 'Compiler Studio', icon: Zap, primary: true },
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'workflows', label: 'Workflows', icon: GitBranch },
      ],
    },
    {
      title: 'VERIFICATION',
      items: [
        { id: 'verification', label: 'Verification', icon: ShieldCheck },
        { id: 'compliance', label: 'Compliance', icon: Scale },
        { id: 'audit', label: 'Audit Logs', icon: History },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'versions', label: 'Workflow Versions', icon: Clock },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
    {
      title: 'HELP',
      items: [
        { id: 'help', label: 'Help & Docs', icon: HelpCircle },
      ],
    },
  ];

  return (
    <aside className="w-[240px] min-w-[240px] bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 flex-shrink-0 select-none z-30 shadow-xs">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs shadow-indigo-200">
            NLC
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">NLC</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Natural Language Policy Compiler
            </p>
          </div>
        </div>

        {/* Product Principle Badge */}
        <div className="mt-2.5 bg-indigo-50/80 border border-indigo-100 rounded-md px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
          <Lock className="w-3 h-3 text-indigo-600 flex-shrink-0" />
          <span>VERIFY BEFORE EXECUTE</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {group.title}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.primary && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-600 text-[11px] font-medium">Backend Online</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">v1.0</span>
      </div>
    </aside>
  );
}
