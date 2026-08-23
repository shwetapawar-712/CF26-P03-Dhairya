import React from 'react';
import {
  FileText, Cpu, GitMerge, AlertTriangle, ShieldCheck,
  Network, Scale, Lock, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const STAGES = [
  { number: 1, name: 'Parse Policy', icon: FileText },
  { number: 2, name: 'AI / NLP Parser', icon: Cpu },
  { number: 3, name: 'Build Workflow IR', icon: GitMerge },
  { number: 4, name: 'Ambiguity Detection', icon: AlertTriangle },
  { number: 5, name: 'RBAC Authorization', icon: ShieldCheck },
  { number: 6, name: 'Graph Verification', icon: Network },
  { number: 7, name: 'Compliance Evaluation', icon: Scale },
  { number: 8, name: 'Verification Gate', icon: Lock },
];

export default function InteractivePipelineBar({ stepsResult, onStageClick, isRunning }) {
  const getStepData = (stepNumber) => {
    if (!stepsResult) return { status: 'idle', duration_ms: 0 };
    const found = stepsResult.find((s) => s.step_number === stepNumber);
    if (!found) return { status: 'idle', duration_ms: 0 };
    return found;
  };

  return (
    <div className="saas-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Verification Pipeline (8 Compiler Stages)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Click any stage to inspect Casbin permissions, NetworkX graph stats, and IR details
          </p>
        </div>
        <span className="badge badge-gray text-[10px]">Sequential Gate Pipeline</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const data = getStepData(stage.number);
          const status = isRunning && !data.output_data ? 'running' : data.status || 'idle';

          let borderClass = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
          let statusBadge = <span className="badge badge-gray text-[9px]">IDLE</span>;

          if (status === 'passed') {
            borderClass = 'border-emerald-200 bg-emerald-50/50 text-emerald-950 hover:border-emerald-300';
            statusBadge = (
              <span className="badge badge-green text-[9px] py-0 px-1.5 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> PASS
              </span>
            );
          } else if (status === 'blocked' || status === 'failed') {
            borderClass = 'border-rose-200 bg-rose-50/60 text-rose-950 hover:border-rose-300';
            statusBadge = (
              <span className="badge badge-red text-[9px] py-0 px-1.5 flex items-center gap-0.5">
                <XCircle className="w-2.5 h-2.5" /> FAIL
              </span>
            );
          } else if (status === 'running') {
            borderClass = 'border-blue-300 bg-blue-50/60 text-blue-950 animate-pulse';
            statusBadge = <span className="badge badge-blue text-[9px]">RUNNING</span>;
          }

          return (
            <button
              key={stage.number}
              onClick={() => onStageClick(stage.number)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 ${borderClass}`}
              title={`Click to inspect Stage 0${stage.number}: ${stage.name}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold font-mono text-slate-400">0{stage.number}</span>
                {statusBadge}
              </div>

              <div className="flex items-center gap-1.5 my-1.5">
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                <span className="text-xs font-bold leading-snug line-clamp-1">
                  {stage.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-100">
                <span>time</span>
                <span className="font-semibold text-slate-600">{data.duration_ms || 0}ms</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
