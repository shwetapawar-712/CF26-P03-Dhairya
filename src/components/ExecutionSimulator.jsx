import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, CheckCircle2, Clock, ShieldCheck, XCircle, AlertCircle, Lock } from 'lucide-react';
import { stepExecution, approveExecutionStep, resetExecution } from '../api/client';

export default function ExecutionSimulator({ workflowId, workflowIr, onExecutionChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [execState, setExecState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize or fetch execution state when workflowId changes
  useEffect(() => {
    if (!workflowId) return;
    handleReset();
  }, [workflowId]);

  // Auto-play interval effect
  useEffect(() => {
    let timer;
    if (isPlaying && !execState?.waiting_approval_step && !execState?.is_stopped) {
      timer = setInterval(async () => {
        await handleStepForward();
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, execState]);

  const handleStepForward = async () => {
    if (!workflowId || execState?.waiting_approval_step || execState?.is_stopped) return;
    setIsLoading(true);
    try {
      const res = await stepExecution(workflowId);
      setExecState(res);
      if (onExecutionChange) onExecutionChange(res);

      if (res.is_complete || res.waiting_approval_step || res.is_stopped) {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Failed to advance execution:', err);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = async (approved) => {
    if (!workflowId) return;
    setIsLoading(true);
    try {
      const res = await approveExecutionStep(workflowId, approved, 'Finance Manager');
      setExecState(res);
      if (onExecutionChange) onExecutionChange(res);
    } catch (err) {
      console.error('Failed to process approval:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!workflowId) return;
    setIsPlaying(false);
    setIsLoading(true);
    try {
      const res = await resetExecution(workflowId);
      setExecState(res);
      if (onExecutionChange) onExecutionChange(res);
    } catch (err) {
      console.error('Failed to reset execution:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (execState?.is_complete || execState?.is_stopped) {
      handleReset().then(() => setIsPlaying(true));
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  if (!workflowId || !workflowIr) {
    return (
      <div className="saas-card p-5 text-center text-slate-400 min-h-[160px] flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">Executable Workflow Engine Idle</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Compile and verify a policy to launch executable workflow playback and business approvals.
        </p>
      </div>
    );
  }

  const steps = workflowIr.steps || [];
  const progress = execState?.progress || { completed: 0, total: steps.length, percentage: 0 };
  const logs = execState?.execution_log || [];
  const waitingApproval = execState?.waiting_approval_step;

  return (
    <div className="saas-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="badge badge-indigo mb-0.5">Workflow Execution Engine</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            SECTION B: EXECUTABLE WORKFLOW PLAYBACK
          </h3>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="btn btn-secondary text-xs py-1 px-2.5"
            title="Reset Execution"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" /> Reset
          </button>

          <button
            onClick={handleStepForward}
            disabled={isLoading || execState?.is_complete || waitingApproval || execState?.is_stopped}
            className="btn btn-secondary text-xs py-1 px-2.5"
            title="Step Forward"
          >
            <SkipForward className="w-3 h-3 text-slate-500" /> Step
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading || waitingApproval}
            className="btn btn-primary text-xs py-1 px-3 shadow-xs shadow-indigo-200"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> {execState?.is_complete ? 'Replay' : 'Play Animated'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Business Approval Card (Pauses Execution Until Sign-Off) */}
      {waitingApproval && (
        <div className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-300 shadow-sm space-y-3 animate-pulse-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-950 text-xs uppercase tracking-wider">
                Human Business Approval Required
              </span>
            </div>
            <span className="badge badge-yellow text-[9px]">WAITING FOR APPROVAL</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-amber-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-900 font-bold">
              <span>Action: {waitingApproval.action}</span>
              <span className="text-amber-700 font-mono">{waitingApproval.threshold}</span>
            </div>
            <div className="text-slate-600 text-[11px]">
              Assigned Role: <strong className="text-slate-900">{waitingApproval.role}</strong>
            </div>
            <div className="text-[10px] text-slate-400 italic">
              🔒 Authorization Required: Only users with the <strong className="text-slate-700">{waitingApproval.role}</strong> role can sign off on this business step.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => handleApproveAction(false)}
              disabled={isLoading}
              className="btn btn-danger text-xs py-1.5 px-3"
            >
              <XCircle className="w-3.5 h-3.5" /> ✕ Reject Step
            </button>
            <button
              onClick={() => handleApproveAction(true)}
              disabled={isLoading}
              className="btn btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Approve Step
            </button>
          </div>
        </div>
      )}

      {/* Stopped / Rejected Banner */}
      {execState?.is_stopped && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Workflow Execution STOPPED — Business Step Rejected by Finance Manager</span>
          </div>
          <span className="badge badge-red text-[9px]">EXECUTION TERMINATED</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Runtime Execution Progress</span>
          <span className="font-bold text-slate-800">
            {progress.completed} / {progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              execState?.is_stopped ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Step Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step) => {
          const status = execState?.step_states?.[step.id] || 'pending';
          let statusBadge = <span className="text-[10px] text-slate-400 font-medium">○ Pending</span>;
          let borderClass = 'border-slate-200 bg-slate-50/70 text-slate-700';

          if (status === 'completed') {
            statusBadge = <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-600"/> Completed</span>;
            borderClass = 'border-emerald-200 bg-emerald-50/60 text-emerald-950';
          } else if (status === 'waiting_for_approval') {
            statusBadge = <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 animate-pulse"><Clock className="w-3 h-3 text-amber-600"/> Waiting Sign-off</span>;
            borderClass = 'border-amber-300 bg-amber-50/80 text-amber-950 ring-1 ring-amber-300';
          } else if (status === 'running') {
            statusBadge = <span className="text-[10px] text-blue-700 font-bold flex items-center gap-0.5 animate-pulse"><Clock className="w-3 h-3 text-blue-600"/> Active</span>;
            borderClass = 'border-blue-300 bg-blue-50/60 text-blue-950 ring-1 ring-blue-300';
          } else if (status === 'rejected') {
            statusBadge = <span className="text-[10px] text-rose-700 font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3 text-rose-600"/> Rejected</span>;
            borderClass = 'border-rose-300 bg-rose-50 text-rose-950';
          } else if (status === 'locked' || status === 'skipped') {
            statusBadge = <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5"><Lock className="w-3 h-3 text-slate-400"/> Locked</span>;
            borderClass = 'border-slate-200 bg-slate-100 text-slate-400 opacity-60';
          }

          return (
            <div key={step.id} className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${borderClass}`}>
              <span className="font-bold text-slate-900 truncate">{step.action}</span>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span className="truncate">{step.role}</span>
                {statusBadge}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Logs */}
      {logs.length > 0 && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] max-h-32 overflow-y-auto space-y-1">
          <div className="text-[9px] uppercase text-slate-400 font-sans font-bold">Execution & Business Sign-off Logs</div>
          {logs.map((log, idx) => (
            <div key={idx} className="text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-500 text-[10px]">[{idx + 1}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
