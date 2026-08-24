import React, { useEffect } from 'react';
import { Sparkles, Save, FileText, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function PolicyEditorIDE({
  policyText,
  onChangePolicyText,
  onCompile,
  isLoading,
  onReset,
}) {
  // Line numbers calculation
  const lines = policyText.split('\n');
  const lineNumbers = Array.from({ length: Math.max(lines.length, 6) }, (_, i) => i + 1);

  // Ctrl + Enter shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (policyText.trim() && !isLoading) {
          onCompile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [policyText, isLoading, onCompile]);

  return (
    <div className="w-full h-full vf-bg-card flex flex-col overflow-hidden text-xs">
      {/* Policy Studio Header */}
      <div className="vf-bg-secondary border-b vf-border p-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 vf-bg-card-alt border vf-border rounded px-2.5 py-1 vf-text-primary font-mono font-bold">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>workflow.vf</span>
          </div>
          <span className="text-[10px] vf-text-tertiary font-mono hidden sm:inline">DSL</span>
        </div>
        <span className="text-[10px] vf-text-tertiary font-mono">Natural Language Policy</span>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 vf-bg-editor vf-text-primary flex relative font-mono text-xs overflow-hidden">
        {/* Line Numbers Column */}
        <div className="vf-bg-gutter vf-text-tertiary select-none py-3 px-2 text-right border-r vf-border-subtle leading-relaxed font-mono min-w-[36px]">
          {lineNumbers.map((n) => (
            <div key={n} className="text-[11px]">
              {n < 10 ? `0${n}` : n}
            </div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          value={policyText}
          onChange={(e) => onChangePolicyText(e.target.value)}
          placeholder="Describe your procurement workflow in natural language..."
          className="w-full h-full p-3 bg-transparent vf-text-primary font-mono text-xs focus:outline-none resize-none leading-relaxed tracking-wide placeholder:text-slate-400/60"
        />
      </div>

      {/* Editor Footer Actions */}
      <div className="vf-bg-secondary border-t vf-border p-2.5 flex items-center justify-between gap-2">
        <button
          onClick={onReset}
          disabled={isLoading}
          className="btn btn-secondary text-xs"
          title="Clear text"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear
        </button>

        <button
          onClick={onCompile}
          disabled={isLoading || !policyText.trim()}
          className="btn btn-primary text-xs py-1.5 px-3.5 shadow-md shadow-indigo-900/40"
          title="Compile policy (Ctrl + Enter)"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Compiling...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Compile & Verify</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

