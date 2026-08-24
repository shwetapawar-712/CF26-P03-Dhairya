import React, { useState, useEffect } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, Activity, CheckCircle2, Clock,
  ShieldCheck, XCircle, AlertCircle, Lock, Building2, DollarSign,
  FileCheck2, AlertTriangle, ExternalLink, ShieldAlert, BadgeCheck, FileText
} from 'lucide-react';
import { stepExecution, approveExecutionStep, resetExecution } from '../api/client';

export default function ExecutionSimulator({ workflowId, workflowIr, onExecutionChange, initialState }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [execState, setExecState] = useState(initialState || null);
  const [isLoading, setIsLoading] = useState(false);

  // Update execState if initialState changes
  useEffect(() => {
    if (initialState) {
      setExecState(initialState);
    }
  }, [workflowId]);

  // Auto-play interval effect
  useEffect(() => {
    let timer;
    if (isPlaying && !execState?.waiting_approval_step && !execState?.is_stopped && !execState?.is_complete) {
      timer = setInterval(async () => {
        await handleStepForward();
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, execState]);

  const handleStepForward = async () => {
    if (!workflowId || execState?.waiting_approval_step || execState?.is_stopped || execState?.is_complete) {
      setIsPlaying(false);
      return;
    }
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
  const proc = execState?.procurement_context;

  // Extract assessment, budget, po data
  const assessment = proc?.vendor_assessment;
  const budgetVal = proc?.budget_validation;
  const po = proc?.purchase_order;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
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
            className="btn btn-secondary text-xs py-1 px-2.5 cursor-pointer"
            title="Reset Execution"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" /> Reset
          </button>

          <button
            onClick={handleStepForward}
            disabled={isLoading || execState?.is_complete || waitingApproval || execState?.is_stopped}
            className="btn btn-secondary text-xs py-1 px-2.5 cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="w-3 h-3 text-slate-500" /> Step
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading || waitingApproval}
            className="btn btn-primary text-xs py-1 px-3 shadow-xs shadow-indigo-200 cursor-pointer"
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* PROCUREMENT REQUEST OVERVIEW CARD                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {proc && (
        <div className="p-3.5 rounded-xl vf-bg-card border vf-border shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b vf-border pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs vf-text-primary">Procurement Request Information</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                proc.organization_status === 'REGISTERED'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}>
                {assessment?.organization_status || 'NEW TO ORGANIZATION'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="vf-bg-card-alt p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary block font-sans">Vendor Name</span>
              <span className="font-bold vf-text-primary truncate block mt-0.5">{proc.vendor_name || 'N/A'}</span>
            </div>
            <div className="vf-bg-card-alt p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary block font-sans">Product / Item</span>
              <span className="font-bold vf-text-primary truncate block mt-0.5">{proc.product || 'N/A'}</span>
            </div>
            <div className="vf-bg-card-alt p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary block font-sans">Purchase Amount</span>
              <span className="font-bold text-indigo-400 block mt-0.5">{proc.purchase_amount || 'N/A'}</span>
            </div>
            <div className="vf-bg-card-alt p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary block font-sans">Department</span>
              <span className="font-bold vf-text-primary block mt-0.5">{proc.department || 'IT'}</span>
            </div>
            <div className="vf-bg-card-alt p-2 rounded border vf-border col-span-2 sm:col-span-2">
              <span className="text-[10px] vf-text-tertiary block font-sans">Available Dept Budget</span>
              <span className="font-bold text-emerald-400 block mt-0.5">{proc.available_budget || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MISSING FIELDS / CLARIFICATION ALERT                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {proc?.needs_clarification && proc?.missing_fields?.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg space-y-1.5 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>⚠ PROCUREMENT POLICY: NEEDS CLARIFICATION</span>
          </div>
          <p className="text-[11px] text-amber-300/80">
            The policy text did not specify all required procurement parameters. No fake values were invented.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {proc.missing_fields.map((f, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/40 text-[10px] font-mono text-amber-200">
                ✕ {f}: Missing
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* DYNAMIC VENDOR VERIFICATION ASSESSMENT CARD               */}
      {/* ────────────────────────────────────────────────────────── */}
      {assessment && (
        <div className="p-3.5 rounded-xl vf-bg-card border vf-border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b vf-border pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="font-bold text-xs vf-text-primary block">
                  Vendor Verification Assessment
                </span>
                <span className="text-[10px] vf-text-tertiary block">
                  Multi-Registry Evidence Analysis (MCA, GSTN, Corporate Domain, ISO)
                </span>
              </div>
            </div>
            {/* Score Pill */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[9px] vf-text-tertiary font-sans block">Assessment Score</span>
                <span className={`text-sm font-bold font-mono ${
                  assessment.score >= 75 ? 'text-emerald-400' :
                  assessment.score >= 45 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {assessment.score} / 100
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                assessment.risk_level === 'LOW' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' :
                assessment.risk_level === 'MEDIUM' ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' :
                'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                {assessment.risk_level} RISK
              </span>
            </div>
          </div>

          {/* Decision Banner */}
          <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
            assessment.decision === 'ELIGIBLE FOR PROCUREMENT REVIEW'
              ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-200'
              : assessment.decision === 'HUMAN REVIEW REQUIRED'
              ? 'bg-amber-950/30 border-amber-700/40 text-amber-200'
              : 'bg-rose-950/30 border-rose-700/40 text-rose-200'
          }`}>
            <span className="font-semibold text-[11px]">{assessment.summary}</span>
          </div>

          {/* Structured Evidence Items */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider vf-text-tertiary">
              Verified Registry Signals ({assessment.evidence_list?.length || 0})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {assessment.evidence_list?.map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-gutter vf-bg-card-alt border vf-border text-[11px] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold vf-text-primary flex items-center gap-1.5">
                      {item.status === 'verified' || item.status === 'available' || item.status === 'found' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : item.status === 'insufficient' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      )}
                      {item.evidence_type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        item.status === 'verified' || item.status === 'available' || item.status === 'found' ? 'text-emerald-400 bg-emerald-950/40' :
                        item.status === 'insufficient' ? 'text-amber-400 bg-amber-950/40' : 'text-rose-400 bg-rose-950/40'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className="text-[9px] vf-text-tertiary font-mono">[{item.confidence}]</span>
                    </div>
                  </div>
                  <p className="text-[10px] vf-text-secondary leading-normal">{item.details}</p>
                  <div className="flex items-center justify-between text-[9px] vf-text-tertiary pt-0.5 border-t vf-border-subtle font-mono">
                    <span>Source: {item.source}</span>
                    {item.reference_id && <span className="text-indigo-400">{item.reference_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-[10px] vf-text-tertiary italic bg-gutter p-2 rounded border vf-border leading-relaxed">
            ℹ️ <strong>Disclaimer:</strong> {assessment.disclaimer}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* BUDGET VALIDATION CARD                                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {budgetVal && (
        <div className={`p-3.5 rounded-xl border shadow-sm space-y-2.5 ${
          budgetVal.passed
            ? 'bg-emerald-950/20 border-emerald-600/40'
            : 'bg-rose-950/30 border-rose-600/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className={`w-4 h-4 ${budgetVal.passed ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="font-bold text-xs vf-text-primary">Department Budget Validation</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              budgetVal.passed
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500 text-rose-300'
            }`}>
              {budgetVal.passed ? '✓ WITHIN BUDGET' : '✕ BUDGET EXCEEDED'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">Purchase Amount</span>
              <span className="font-bold vf-text-primary">{budgetVal.purchase_amount}</span>
            </div>
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">Available Budget</span>
              <span className="font-bold text-emerald-400">{budgetVal.available_budget}</span>
            </div>
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">
                {budgetVal.passed ? 'Remaining Balance' : 'Excess Deficit'}
              </span>
              <span className={`font-bold ${budgetVal.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {budgetVal.difference}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE BUSINESS APPROVAL CARD (PAUSES EXECUTION)      */}
      {/* ────────────────────────────────────────────────────────── */}
      {waitingApproval && (
        <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-600/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-amber-200 text-xs uppercase tracking-wider">
                Human Business Approval Required
              </span>
            </div>
            <span className="text-[9px] text-amber-300 bg-amber-900/50 border border-amber-600/40 px-2 py-0.5 rounded font-bold animate-pulse">
              WAITING FOR APPROVAL
            </span>
          </div>

          <div className="bg-amber-950/50 p-3 rounded-lg border border-amber-700/40 space-y-1.5 text-xs">
            <div className="flex justify-between text-amber-100 font-bold">
              <span>Action: {waitingApproval.action}</span>
              <span className="text-amber-400 font-mono">{waitingApproval.threshold}</span>
            </div>
            <div className="text-amber-300/80 text-[11px]">
              Assigned Role: <strong className="text-amber-200">{waitingApproval.role}</strong>
            </div>
            <div className="text-[10px] text-amber-400/90 italic">
              🔒 Authorization Required: Only users with the <strong className="text-amber-300">{waitingApproval.role}</strong> role can sign off on this business step.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => handleApproveAction(false)}
              disabled={isLoading}
              className="btn btn-danger text-xs py-1.5 px-3 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> ✕ Reject Step
            </button>
            <button
              onClick={() => handleApproveAction(true)}
              disabled={isLoading}
              className="text-xs py-1.5 px-4 flex items-center gap-1.5 rounded font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Approve Step
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* PURCHASE ORDER ISSUED CARD                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {po && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border-2 border-indigo-500/50 shadow-md space-y-2.5">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
            <div className="flex items-center gap-2 text-indigo-300">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-xs">Official Purchase Order Generated</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-900/60 border border-indigo-500/50 text-indigo-200">
              {po.po_number}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">Issued To Vendor</span>
              <span className="font-bold vf-text-primary">{po.vendor_name}</span>
            </div>
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">Total Purchase Value</span>
              <span className="font-bold text-indigo-400">{po.purchase_amount}</span>
            </div>
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">Delivery Department</span>
              <span className="font-bold vf-text-primary">{po.department}</span>
            </div>
            <div className="vf-bg-card p-2 rounded border vf-border">
              <span className="text-[10px] vf-text-tertiary font-sans block">ERP Dispatch Status</span>
              <span className="font-bold text-emerald-400">{po.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* STOPPED / REJECTED BANNER                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {execState?.is_stopped && (
        <div className="p-3 bg-rose-950/40 border border-rose-700/50 rounded-lg flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Workflow Execution STOPPED — Business Step Rejected or Validation Failed</span>
          </div>
          <span className="text-[9px] bg-rose-900/50 border border-rose-700/50 px-2 py-0.5 rounded font-bold">
            TERMINATED
          </span>
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
        <div className="vf-bg-gutter p-3 rounded-lg border vf-border font-mono text-[11px] max-h-44 overflow-y-auto space-y-1">
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
