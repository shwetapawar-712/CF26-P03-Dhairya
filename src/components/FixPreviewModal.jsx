import React from 'react';
import { X, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FixPreviewModal({ violation, currentPolicyText, onConfirmApply, onClose }) {
  if (!violation) return null;

  // Generate proposed fixed policy text based on violation type
  let proposedFixText = currentPolicyText;
  if (violation.check_type === 'ambiguity') {
    proposedFixText =
      'Verify the vendor, check the budget, obtain approval from the Finance Manager for the $10,000 purchase, and process the order.';
  } else if (violation.check_type === 'rbac') {
    proposedFixText =
      'The procurement officer should verify the vendor and create the ticket, but the Finance Manager approves the finance request.';
  } else if (violation.check_type === 'graph') {
    proposedFixText =
      'Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket.';
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-3xl w-full p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Preview Proposed Policy Fix
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-0.5">VIOLATION REPORT</span>
            <p className="text-rose-700 font-semibold mb-1">{violation.problem}</p>
            <p className="text-slate-600">{violation.suggested_fix}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Text */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                Current Policy Text
              </span>
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-slate-800 font-mono text-[11px] h-32 overflow-y-auto leading-relaxed">
                {currentPolicyText}
              </div>
            </div>

            {/* Proposed Fixed Text */}
            <div className="space-y-1.5">
              <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Proposed Corrected Text
              </span>
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/50 text-slate-900 font-mono text-[11px] h-32 overflow-y-auto leading-relaxed font-semibold">
                {proposedFixText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary text-xs">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmApply(proposedFixText);
              onClose();
            }}
            className="btn btn-primary text-xs"
          >
            <Wrench className="w-3.5 h-3.5" />
            Apply Fix & Re-Verify
          </button>
        </div>
      </div>
    </div>
  );
}
