import React from 'react';
import { X, Wrench, AlertTriangle } from 'lucide-react';
import PolicyDiffViewer from './PolicyDiffViewer';

export default function FixPreviewModal({ violation, currentPolicyText, onConfirmApply, onClose }) {
  if (!violation) return null;

  let proposedFixText = currentPolicyText;

  if (violation.check_type === 'ambiguity') {
    if (currentPolicyText.toLowerCase().includes('manager') || currentPolicyText.toLowerCase().includes('expensive')) {
      proposedFixText = 'Send $10,000 purchases to the Finance Manager for approval, then create the procurement ticket.';
    } else {
      proposedFixText = 'Verify the vendor, check the budget ($10,000), obtain approval from the Finance Manager, and process the order.';
    }
  } else if (violation.check_type === 'rbac') {
    if (currentPolicyText.toLowerCase().includes('procurement officer approve')) {
      proposedFixText = 'Let the Finance Manager approve the finance request and the Procurement Officer create the procurement ticket.';
    } else {
      proposedFixText = 'Verify vendor, check budget ($10,000), obtain finance approval from Finance Manager, and create procurement ticket.';
    }
  } else if (violation.check_type === 'graph') {
    proposedFixText = 'Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket.';
  } else if (violation.check_type === 'compliance') {
    if (currentPolicyText.toLowerCase().includes('without finance approval')) {
      proposedFixText = 'Obtain finance approval for the $25,000 purchase, then create the procurement ticket.';
    } else {
      proposedFixText = 'Verify vendor, obtain finance approval, and create procurement ticket for the purchase.';
    }
  } else if (violation.check_type === 'conflict') {
    proposedFixText = 'Assign requester to submit request and Finance Manager to approve the transaction.';
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-2xl w-full p-5 flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b vf-border">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold vf-text-primary">
              Preview Proposed Policy Auto-Fix
            </h3>
          </div>
          <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 overflow-y-auto">
          <div className="p-3 vf-bg-gutter border vf-border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold vf-text-secondary text-[10px] uppercase">Violation Problem</span>
              <span className="badge badge-red text-[9px] uppercase font-bold">{violation.severity}</span>
            </div>
            <p className="text-rose-400 font-semibold mb-1">{violation.problem}</p>
            <p className="vf-text-secondary mb-2 leading-relaxed"><strong className="vf-text-primary">Cause:</strong> {violation.cause}</p>
            <div className="p-2 bg-emerald-950/30 border border-emerald-900/50 rounded text-emerald-300 text-[11px]">
              💡 <strong>Suggested Fix:</strong> {violation.suggested_fix}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold vf-text-secondary uppercase text-[10px] tracking-wider block">
              Git-Style Policy Line Diff
            </span>
            <PolicyDiffViewer originalText={currentPolicyText} fixedText={proposedFixText} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t vf-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmApply(proposedFixText);
              onClose();
            }}
            className="btn btn-primary text-xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            Apply Fix & Re-Verify
          </button>
        </div>
      </div>
    </div>
  );
}
