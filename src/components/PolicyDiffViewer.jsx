import React from 'react';

export default function PolicyDiffViewer({ originalText, fixedText }) {
  const origLines = (originalText || '').split('\n');
  const fixLines = (fixedText || '').split('\n');

  return (
    <div className="vf-bg-editor border vf-border rounded-lg p-3 font-mono text-xs overflow-x-auto space-y-1">
      <div className="text-[10px] vf-text-tertiary uppercase tracking-wider font-bold mb-2 pb-1 border-b vf-border">
        Policy Correction Diff
      </div>

      
      {/* Removed lines */}
      {origLines.map((line, idx) => (
        <div key={`orig-${idx}`} className="diff-remove px-2 py-1 rounded text-rose-300 flex items-start gap-2">
          <span className="select-none text-rose-500 font-bold">-</span>
          <span className="line-through opacity-80">{line}</span>
        </div>
      ))}

      {/* Added lines */}
      {fixLines.map((line, idx) => (
        <div key={`fix-${idx}`} className="diff-add px-2 py-1 rounded text-emerald-300 flex items-start gap-2">
          <span className="select-none text-emerald-500 font-bold">+</span>
          <span className="font-semibold">{line}</span>
        </div>
      ))}
    </div>
  );
}
