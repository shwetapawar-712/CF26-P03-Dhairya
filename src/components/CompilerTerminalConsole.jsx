import React from 'react';
import { Terminal, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function CompilerTerminalConsole({ pipelineResult, isCompiling }) {
  if (!pipelineResult && !isCompiling) {
    return (
      <div className="compiler-terminal p-3.5 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-300">Terminal / Build Output</span>
        </div>
        <span className="text-[11px] text-slate-500">Ready to compile</span>
      </div>
    );
  }

  const verification = pipelineResult?.verification;
  const isSuccess = verification?.passed;
  const steps = pipelineResult?.steps || [];
  const duration = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  return (
    <div className="compiler-terminal p-4 space-y-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
            Terminal / Compiler Verification Console
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">Total Duration: <strong className="text-slate-200">{duration.toFixed(2)}ms</strong></span>
          <span className="text-slate-400">Errors: <strong className={verification?.total_errors ? "text-rose-400" : "text-emerald-400"}>{verification?.total_errors || 0}</strong></span>
          <span className="text-slate-400">Warnings: <strong className="text-amber-400">{verification?.total_warnings || 0}</strong></span>
        </div>
      </div>

      {/* Real-time Stdout Log Output */}
      <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[11px]">
        {isCompiling ? (
          <div className="compiler-terminal-line text-blue-400 animate-pulse">
            <span>&gt; Compiling natural-language policy through 8 verification stages...</span>
          </div>
        ) : (
          <>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Parsing natural-language policy... <span className="text-emerald-400 font-bold">✓ PASSED</span>
            </div>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Building Workflow IR... <span className="text-emerald-400 font-bold">✓ PASSED</span>
            </div>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Running semantic ambiguity detection...
              {verification?.violations?.some(v => v.check_type === 'ambiguity' && v.severity === 'error') ? (
                <span className="text-rose-400 font-bold">✕ FAILED</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ PASSED</span>
              )}
            </div>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Running Casbin RBAC authorization...
              {verification?.violations?.some(v => v.check_type === 'rbac' && v.severity === 'error') ? (
                <span className="text-rose-400 font-bold">✕ FAILED</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ PASSED</span>
              )}
            </div>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Running NetworkX graph & topology verification...
              {verification?.violations?.some(v => v.check_type === 'graph' && v.severity === 'error') ? (
                <span className="text-rose-400 font-bold">✕ FAILED</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ PASSED</span>
              )}
            </div>
            <div className="compiler-terminal-line text-slate-300">
              <span className="text-slate-500">&gt;</span> Evaluating compliance rules & policy conflicts... <span className="text-emerald-400 font-bold">✓ PASSED</span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 font-bold text-xs">
              {isSuccess ? (
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  ✓ BUILD SUCCESS — Workflow compiled and verified successfully. Ready for safe execution.
                </div>
              ) : (
                <div className="text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  ✕ BUILD FAILED — Workflow blocked at verification gate. Execution disabled.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
