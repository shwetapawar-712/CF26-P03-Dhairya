import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, CheckCircle2, Clock, ShieldCheck, XCircle, AlertCircle, Lock } from 'lucide-react';
import { stepExecution, approveExecutionStep, resetExecution } from '../api/client';

export default function ExecutionSimulator({ workflowId, workflowIr, onExecutionChange, initialState }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [execState, setExecState] = useState(initialState || null);
  const [isLoading, setIsLoading] = useState(false);

  // Update execState if initialState changes (e.g. when a new execution session starts)
  useEffect(() => {
    if (initialState) {
      setExecState(initialState);
    }
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
      <div className="p-5 text-center vf-text-secondary min-h-[160px] flex flex-col items-center justify-center vf-bg-editor rounded-lg border vf-border">
        <Activity className="w-8 h-8 vf-text-tertiary mb-2" />
        <p className="text-xs font-semibold vf-text-secondary">Executable Workflow Engine Idle</p>
        <p className="text-[11px] vf-text-tertiary mt-0.5">
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">Workflow Execution Engine</span>
          <h3 className="text-xs font-bold uppercase tracking-wider vf-text-primary flex items-center gap-1.5 mt-0.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            EXECUTABLE WORKFLOW PLAYBACK
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
        <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-600/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-amber-200 text-xs uppercase tracking-wider">
                Human Business Approval Required
              </span>
            </div>
            <span className="text-[9px] text-amber-300 bg-amber-900/50 border border-amber-600/40 px-2 py-0.5 rounded font-bold animate-pulse">WAITING FOR APPROVAL</span>
          </div>

          <div className="bg-amber-950/50 p-3 rounded-lg border border-amber-700/40 space-y-1.5 text-xs">
            <div className="flex justify-between text-amber-100 font-bold">
              <span>Action: {waitingApproval.action}</span>
              <span className="text-amber-400 font-mono">{waitingApproval.threshold}</span>
            </div>
            <div className="text-amber-300/80 text-[11px]">
              Assigned Role: <strong className="text-amber-200">{waitingApproval.role}</strong>
            </div>
            <div className="text-[10px] text-amber-500/80 italic">
              🔒 Authorization Required: Only users with the <strong className="text-amber-300">{waitingApproval.role}</strong> role can sign off on this business step.
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
              className="text-xs py-1.5 px-4 flex items-center gap-1.5 rounded font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Approve Step
            </button>
          </div>
        </div>
      )}

      {/* Stopped / Rejected Banner */}
      {execState?.is_stopped && (
        <div className="p-3 bg-rose-950/40 border border-rose-700/50 rounded-lg flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Workflow Execution STOPPED — Business Step Rejected</span>
          </div>
          <span className="text-[9px] bg-rose-900/50 border border-rose-700/50 px-2 py-0.5 rounded font-bold">TERMINATED</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono vf-text-secondary">
          <span>Runtime Execution Progress</span>
          <span className="font-bold vf-text-primary">
            {progress.completed} / {progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full vf-bg-card-alt overflow-hidden border vf-border">
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
          let statusBadge = <span className="text-[10px] vf-text-tertiary font-medium">○ Pending</span>;
          let borderClass = 'vf-border vf-bg-card-alt vf-text-primary';

          if (status === 'completed') {
            statusBadge = <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-500"/>Completed</span>;
            borderClass = 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200';
          } else if (status === 'waiting_for_approval') {
            statusBadge = <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 animate-pulse"><Clock className="w-3 h-3 text-amber-500"/>Waiting Sign-off</span>;
            borderClass = 'border-amber-600/50 bg-amber-950/40 text-amber-200 ring-1 ring-amber-700/40';
          } else if (status === 'running') {
            statusBadge = <span className="text-[10px] text-blue-400 font-bold flex items-center gap-0.5 animate-pulse"><Clock className="w-3 h-3 text-blue-500"/>Active</span>;
            borderClass = 'border-blue-700/50 bg-blue-950/40 text-blue-200 ring-1 ring-blue-700/30';
          } else if (status === 'rejected') {
            statusBadge = <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3 text-rose-500"/>Rejected</span>;
            borderClass = 'border-rose-700/50 bg-rose-950/40 text-rose-300';
          } else if (status === 'locked' || status === 'skipped') {
            statusBadge = <span className="text-[10px] vf-text-tertiary font-medium flex items-center gap-0.5"><Lock className="w-3 h-3 text-slate-500"/>Locked</span>;
            borderClass = 'vf-border vf-bg-gutter vf-text-tertiary opacity-60';
          }

          return (
            <div key={step.id} className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${borderClass}`}>
              <span className="font-bold vf-text-primary truncate">{step.action}</span>
              <div className="flex items-center justify-between text-[10px] vf-text-secondary mt-1">
                <span className="truncate">{step.role}</span>
                {statusBadge}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Logs */}
      {logs.length > 0 && (
        <div className="vf-bg-gutter p-3 rounded-lg border vf-border font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
          <div className="text-[9px] uppercase vf-text-tertiary font-sans font-bold mb-1">Live Execution & Business Sign-off Logs</div>
          {logs.map((log, idx) => (
            <div key={idx} className={`flex items-start gap-1.5 ${
              log.status === 'completed' ? 'text-emerald-400' :
              log.status === 'waiting_for_approval' ? 'text-amber-400' :
              log.status === 'rejected' ? 'text-rose-400' :
              log.status === 'running' ? 'text-blue-400' :
              'vf-text-secondary'
            }`}>
              <span className="vf-text-tertiary text-[10px] flex-shrink-0">[{idx + 1}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

