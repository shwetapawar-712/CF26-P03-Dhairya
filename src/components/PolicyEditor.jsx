import React from 'react';
import { Play, Sparkles, Code2, RotateCcw } from 'lucide-react';

export default function PolicyEditor({
  policyText,
  onChangePolicyText,
  onCompile,
  isLoading,
  onReset
}) {
  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Natural-Language Policy Input
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {policyText.length} chars
        </span>
      </div>

      <div className="relative flex-1 mb-4">
        <textarea
          value={policyText}
          onChange={(e) => onChangePolicyText(e.target.value)}
          placeholder="Enter policy in plain English... e.g. Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket."
          className="w-full h-44 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <button
          onClick={onReset}
          disabled={isLoading}
          className="btn btn-secondary text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </button>

        <button
          onClick={onCompile}
          disabled={isLoading || !policyText.trim()}
          className="btn btn-primary flex-1 text-sm py-2.5 shadow-lg shadow-blue-500/25"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Running Verification Gate...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Compile & Verify Policy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
