import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Wrench, AlertTriangle, CheckCircle2, Lock, Play, Cpu } from 'lucide-react';
import FixPreviewModal from './FixPreviewModal';

export default function VerificationGateView({
  verification,
  currentPolicyText,
  onApplyFixText,
  onExecute,
}) {
  const [selectedViolationForFix, setSelectedViolationForFix] = useState(null);

  if (!verification) {
    return (
      <div className="saas-card p-5 text-center text-slate-500 flex flex-col items-center justify-center min-h-[160px]">
        <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">Verification Gatekeeper Idle</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Compile a natural-language policy to evaluate RBAC, graph, and compliance compiler rules.
        </p>
      </div>
    );
  }

  const { passed, summary, checks_run, violations } = verification;

  return (
    <div className="saas-card p-5 flex flex-col gap-4">
      {/* Header Label */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            SECTION A: COMPILER VERIFICATION GATE
          </h3>
        </div>
        <span className="badge badge-indigo text-[10px]">SYSTEM VERIFICATION — not business approval</span>
      </div>

      {/* Result Shield Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
          passed
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-start gap-3">
          {passed ? (
            <ShieldCheck className="w-7 h-7 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-7 h-7 text-rose-600 flex-shrink-0 mt-0.5" />
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>
                {passed ? 'Compiler Security Gate Passed' : 'Compiler Security Gate Blocked'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Stage 08 of 08
              </span>
            </div>

            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              {passed
                ? '🟢 WORKFLOW VERIFIED — Safe to Execute'
                : 'VERIFICATION FAILED — EXECUTION BLOCKED'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {passed
                ? 'All compiler, authorization, graph, and compliance checks passed. The workflow is now permitted to enter execution.'
                : summary}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {passed ? (
            <button
              onClick={onExecute}
              className="btn btn-primary text-xs py-2 px-4 shadow-sm shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="w-3.5 h-3.5" />
              ▶ Execute Workflow
            </button>
          ) : (
            <button
              disabled
              className="btn btn-disabled-locked text-xs py-2 px-4"
              title="Execution is blocked until all compiler verification checks pass."
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>🔒 Execute Workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* Automated System Verification Check Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {checks_run &&
          checks_run.map((c, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border text-center text-xs flex flex-col justify-between ${
                c.passed
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-bold block truncate">
                {c.check_name}
              </span>
              <div className="flex items-center justify-center gap-1 mt-1 font-semibold text-[11px]">
                {c.passed ? (
                  <span className="text-emerald-700 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SYSTEM PASSED
                  </span>
                ) : (
                  <span className="text-rose-700 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> SYSTEM FAILED
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Failure Diagnostic Report */}
      {!passed && violations && violations.length > 0 && (
        <div className="space-y-3 mt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Explainable Diagnostic Failure Report ({violations.length})
          </h4>

          {violations.map((v, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`badge ${
                    v.severity === 'error' ? 'badge-red' : 'badge-yellow'
                  }`}
                >
                  ✕ FAILED CHECK: {v.check_type.toUpperCase()}
                </span>
                <span className="badge badge-gray text-[10px]">
                  Severity: {v.severity.toUpperCase()}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  PROBLEM STATEMENT
                </span>
                <p className="text-xs font-bold text-slate-900">{v.problem}</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  ROOT CAUSE ANALYSIS
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{v.cause}</p>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
                    RECOMMENDED FIX
                  </span>
                  <p className="text-xs text-emerald-900 font-medium">
                    {v.suggested_fix}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedViolationForFix(v)}
                  className="btn btn-primary text-xs py-1.5 px-3 whitespace-nowrap flex-shrink-0"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Preview Fix
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fix Preview Modal */}
      {selectedViolationForFix && (
        <FixPreviewModal
          violation={selectedViolationForFix}
          currentPolicyText={currentPolicyText}
          onConfirmApply={(fixedText) => {
            if (onApplyFixText) onApplyFixText(fixedText);
            setSelectedViolationForFix(null);
          }}
          onClose={() => setSelectedViolationForFix(null)}
        />
      )}
    </div>
  );
}
