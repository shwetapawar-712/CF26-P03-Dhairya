import React, { useState } from 'react';
import { Sparkles, Save, FileText, CheckCircle2, RotateCcw } from 'lucide-react';

export default function PolicyEditorIDE({
  policyText,
  onChangePolicyText,
  onCompile,
  isLoading,
  onReset,
  irJson,
}) {
  const [activeTab, setActiveTab] = useState('policy'); // policy | ir | json

  // Line numbers calculation
  const lines = policyText.split('\n');
  const lineNumbers = Array.from({ length: Math.max(lines.length, 5) }, (_, i) => i + 1);

  return (
    <div className="saas-card flex flex-col h-full overflow-hidden border border-slate-200 shadow-xs">
      {/* File Header & Tabs */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* File Tab */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-t-md px-3 py-1 text-xs font-mono text-slate-900 font-bold shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>procurement.nlc</span>
          </div>

          {/* Format Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-md text-[11px] font-medium ml-2">
            <button
              onClick={() => setActiveTab('policy')}
              className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                activeTab === 'policy'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Policy
            </button>
            <button
              onClick={() => setActiveTab('ir')}
              className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                activeTab === 'ir'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              IR
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="badge badge-green text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> Valid Syntax
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {policyText.length} chars
          </span>
        </div>
      </div>

      {/* Editor Body - Dark IDE Code Canvas */}
      <div className="flex-1 min-h-[190px] bg-[#0f172a] text-slate-100 flex relative font-mono text-xs overflow-hidden">
        {activeTab === 'policy' && (
          <div className="flex w-full h-full">
            {/* Line Numbers Column */}
            <div className="bg-[#090d16] text-slate-500 select-none py-3.5 px-3 text-right border-r border-slate-800/80 leading-relaxed font-mono min-w-[40px]">
              {lineNumbers.map((n) => (
                <div key={n} className="text-[11px] font-mono">
                  {n < 10 ? `0${n}` : n}
                </div>
              ))}
            </div>

            {/* Textarea Code Editor */}
            <textarea
              value={policyText}
              onChange={(e) => onChangePolicyText(e.target.value)}
              placeholder="Enter policy in plain English... e.g. Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket."
              className="w-full h-full p-3.5 bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed tracking-wide"
            />
          </div>
        )}

        {activeTab === 'ir' && (
          <pre className="p-4 text-emerald-400 font-mono text-[11px] overflow-auto w-full leading-relaxed bg-[#090d16]">
            {irJson ? JSON.stringify(irJson.steps || irJson, null, 2) : '// Intermediate Representation empty'}
          </pre>
        )}

        {activeTab === 'json' && (
          <pre className="p-4 text-cyan-300 font-mono text-[11px] overflow-auto w-full leading-relaxed bg-[#090d16]">
            {irJson ? JSON.stringify(irJson, null, 2) : '// JSON Schema empty'}
          </pre>
        )}
      </div>

      {/* Editor Footer Actions */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            disabled={isLoading}
            className="btn btn-secondary text-xs"
            title="Reset text"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Language: Policy DSL
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs" title="Save draft">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>

          <button
            onClick={onCompile}
            disabled={isLoading || !policyText.trim()}
            className="btn btn-primary text-xs py-2 px-4 shadow-xs shadow-indigo-200"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Compiling Policy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Compile & Verify Policy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
