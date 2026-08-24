import React from 'react';
import {
  FileText, Cpu, GitMerge, AlertTriangle, ShieldCheck,
  Network, Scale, Lock, CheckCircle2, XCircle, ChevronRight
} from 'lucide-react';

const STAGES = [
  { number: 1, name: 'Parse Policy', icon: FileText },
  { number: 2, name: 'AI / NLP Parser', icon: Cpu },
  { number: 3, name: 'Build IR', icon: GitMerge },
  { number: 4, name: 'Ambiguity', icon: AlertTriangle },
  { number: 5, name: 'RBAC Auth', icon: ShieldCheck },
  { number: 6, name: 'Graph Topology', icon: Network },
  { number: 7, name: 'Compliance', icon: Scale },
  { number: 8, name: 'Verification Gate', icon: Lock },
];

export default function InteractivePipelineBar({ stepsResult, onStageClick, isRunning }) {
  const getStepData = (stepNumber) => {
    if (!stepsResult) return { status: 'idle', duration_ms: 0 };
    const found = stepsResult.find((s) => s.step_number === stepNumber);
    if (!found) return { status: 'idle', duration_ms: 0 };
    return found;
  };

  const totalDuration = (stepsResult || []).reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);

  return (
    <div className="h-10 vf-bg-secondary border-b vf-border px-4 flex items-center justify-between select-none overflow-x-auto">
      {/* Pipeline Connected Stages Row */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const data = getStepData(stage.number);
          const status = isRunning && !data.output_data ? 'running' : data.status || 'idle';

          let bgClass = 'vf-bg-card-alt vf-border vf-text-secondary hover:border-indigo-500/50';
          let iconColor = 'vf-text-secondary';
          let statusDot = <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>;

          if (status === 'passed') {
            bgClass = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-500/60';
            iconColor = 'text-emerald-400';
            statusDot = <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
          } else if (status === 'blocked' || status === 'failed') {
            bgClass = 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:border-rose-500/60';
            iconColor = 'text-rose-400';
            statusDot = <XCircle className="w-3 h-3 text-rose-400" />;
          } else if (status === 'running') {
            bgClass = 'bg-indigo-950/60 border-indigo-500/60 text-indigo-300 animate-pulse';
            iconColor = 'text-indigo-400';
            statusDot = <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>;
          }

          return (
            <React.Fragment key={stage.number}>
              <button
                onClick={() => onStageClick(stage.number)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all cursor-pointer whitespace-nowrap ${bgClass}`}
                title={`Stage 0${stage.number}: ${stage.name} (${data.duration_ms || 0}ms)`}
              >
                {statusDot}
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                <span className="font-semibold text-[11px]">{stage.name}</span>
                {data.duration_ms > 0 && (
                  <span className="text-[9px] font-mono vf-text-tertiary ml-0.5">{data.duration_ms}ms</span>
                )}
              </button>

              {idx < STAGES.length - 1 && (
                <ChevronRight className="w-3 h-3 vf-text-tertiary flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Pipeline Summary Metrics */}
      <div className="text-[10px] font-mono vf-text-secondary pl-3 border-l vf-border flex-shrink-0 hidden lg:block">
        <span>Pipeline Time: </span>
        <strong className="vf-text-primary">{totalDuration.toFixed(0)}ms</strong>
      </div>
    </div>
  );
}

