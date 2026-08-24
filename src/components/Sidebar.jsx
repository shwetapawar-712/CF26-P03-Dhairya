import React from 'react';
import {
  Zap, GitBranch, ShieldCheck, Scale, History,
  Clock, ChevronLeft, ChevronRight, Lock
} from 'lucide-react';

export default function Sidebar({ isExpanded, onToggle, activeTab, onSelectTab, onNavigateHome }) {
  const navGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'studio', label: 'Compiler Studio', icon: Zap, primary: true },
        { id: 'workflows', label: 'Workflows', icon: GitBranch },
      ],
    },
    {
      title: 'VERIFICATION',
      items: [
        { id: 'verification', label: 'Reports', icon: ShieldCheck },
        { id: 'compliance', label: 'Compliance', icon: Scale },
        { id: 'audit', label: 'Audit Logs', icon: History },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'versions', label: 'Versions', icon: Clock },
      ],
    },
  ];

  return (
    <aside
      className={`vf-bg-secondary border-r vf-border flex flex-col h-screen select-none z-30 transition-all duration-300 relative flex-shrink-0 ${
        isExpanded ? 'w-[240px]' : 'w-[64px]'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full vf-bg-card-alt border vf-border-light vf-text-secondary flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors shadow-md z-40 cursor-pointer"
        title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header — clickable to go Home */}
      <button
        onClick={onNavigateHome}
        className="w-full p-3 border-b vf-border flex items-center gap-3 overflow-hidden bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer text-left hover:bg-indigo-600/10 transition-colors"
        title="Go to Home Page"
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-900/50 flex-shrink-0">
          VF
        </div>
        {isExpanded && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold vf-text-primary leading-tight truncate">VeriFlow</h1>
            <p className="text-[10px] vf-text-secondary font-medium leading-tight truncate mt-0.5">
              Verified Workflow Compiler
            </p>
          </div>
        )}
      </button>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            {isExpanded && (
              <div className="px-2 mb-1.5 text-[9px] font-bold tracking-wider vf-text-tertiary uppercase">
                {group.title}
              </div>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center ${
                      isExpanded ? 'justify-between px-2.5 py-2' : 'justify-center py-2'
                    } rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/40 shadow-sm'
                        : 'vf-text-secondary hover:bg-indigo-600/10 hover:vf-text-primary'
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-indigo-400' : 'vf-text-secondary'
                        }`}
                      />
                      {isExpanded && <span className="truncate">{item.label}</span>}
                    </div>

                    {isExpanded && item.primary && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="p-3 border-t vf-border vf-bg-editor flex items-center justify-between text-xs overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {isExpanded && <span className="vf-text-secondary text-[11px] font-medium truncate">Backend Online</span>}
        </div>
        {isExpanded && <span className="text-[10px] vf-text-tertiary font-mono">v1.0</span>}
      </div>
    </aside>
  );
}

