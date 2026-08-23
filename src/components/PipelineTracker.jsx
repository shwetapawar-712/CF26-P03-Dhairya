import React from 'react';
import { 
  FileText, Cpu, GitMerge, AlertTriangle, ShieldCheck, 
  Network, Lock, CheckCircle2, XCircle, ArrowRight 
} from 'lucide-react';

const PIPELINE_STEPS = [
  { number: 1, name: 'Submit Policy', icon: FileText },
  { number: 2, name: 'AI / NLP Parser', icon: Cpu },
  { number: 3, name: 'Build Workflow IR', icon: GitMerge },
  { number: 4, name: 'Ambiguity Detection', icon: AlertTriangle },
  { number: 5, name: 'RBAC Auth Check', icon: ShieldCheck },
  { number: 6, name: 'Graph & Compliance', icon: Network },
  { number: 7, name: 'Verification Gate', icon: Lock },
  { number: 8, name: 'Workflow Graph', icon: CheckCircle2 },
];

export default function PipelineTracker({ stepsResult, activeStep, onStepClick, isRunning }) {
  const getStepStatus = (stepNumber) => {
    if (isRunning && (!stepsResult || stepsResult.length < stepNumber)) {
      if (stepsResult && stepsResult.length === stepNumber - 1) return 'running';
      return 'idle';
    }
    if (!stepsResult) return 'idle';
    const found = stepsResult.find((s) => s.step_number === stepNumber);
    if (!found) return 'idle';
    return found.status;
  };

  return (
    <div className="glass-panel p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Verification Pipeline (Steps 1 – 8)
        </h3>
        <span className="text-xs text-slate-500">Click any step to inspect stage output</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {PIPELINE_STEPS.map((step) => {
          const Icon = step.icon;
          const status = getStepStatus(step.number);
          const isSelected = activeStep === step.number;

          let cardBg = 'bg-slate-900/60 border-slate-800 text-slate-400';
          let statusIndicator = <span className="w-2 h-2 rounded-full bg-slate-600"></span>;

          if (status === 'passed') {
            cardBg = 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300';
            statusIndicator = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
          } else if (status === 'blocked') {
            cardBg = 'bg-rose-950/40 border-rose-800/50 text-rose-300';
            statusIndicator = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
          } else if (status === 'running') {
            cardBg = 'bg-blue-950/40 border-blue-600/50 text-blue-300 animate-pulse';
            statusIndicator = <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>;
          } else if (status === 'skipped') {
            cardBg = 'bg-slate-900/30 border-slate-800/50 text-slate-500 opacity-60';
          }

          if (isSelected) {
            cardBg += ' ring-2 ring-blue-500 border-transparent shadow-lg';
          }

          return (
            <button
              key={step.number}
              onClick={() => onStepClick(step.number)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] cursor-pointer ${cardBg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Step {step.number}
                </span>
                {statusIndicator}
              </div>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                <span className="text-xs font-medium leading-tight line-clamp-2">
                  {step.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
