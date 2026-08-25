import React, { useState } from "react";
import {
  ClipboardCheck, Clock, User, ExternalLink, CheckCircle2, XCircle, Play,
  ThumbsUp, ThumbsDown, RefreshCw
} from "lucide-react";

/**
 * PendingRequestCard — displays approval requests for Manager or Employee.
 *
 * For Manager: shows pending approval requests needing review.
 * For Employee: shows their submitted workflows with real-time status (Pending, Approved, Rejected, Completed).
 *
 * Props:
 *   requests           - array of ApprovalRequest objects
 *   onOpenRequest      - callback(request) when user clicks "Open Request" / "Open Workflow"
 *   activeRequestId    - id of the currently-open request (highlights it)
 *   isManager          - boolean indicating whether the viewer is a Manager
 *   onApproveRequest   - callback(request) to approve
 *   onRejectRequest    - callback(request, reason) to reject
 *   isApprovingRequest - boolean
 */
export default function PendingRequestCard({
  requests,
  onOpenRequest,
  activeRequestId,
  isManager = false,
  onApproveRequest,
  onRejectRequest,
  isApprovingRequest = false,
}) {
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!requests || requests.length === 0) return null;

  const extractVendor = (policyText) => {
    const m = policyText?.match(/from\s+([A-Za-z][A-Za-z\s]+?)(?:\s+for\s|\s+at\s|,|\.)/i);
    return m ? m[1].trim() : null;
  };
  const extractAmount = (policyText) => {
    const m = policyText?.match(/[₹$€][\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:Lakhs?|Crores?|thousand|million)/i);
    return m ? m[0] : null;
  };

  const getStatusBadge = (req, isActive) => {
    const wfStatus = req.workflow_status;
    const reqStatus = req.status;

    if (wfStatus === "completed") {
      return (
        <span className="badge badge-green text-[9px] flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" />
          COMPLETED
        </span>
      );
    }
    if (wfStatus === "executing") {
      return (
        <span className="badge badge-blue text-[9px] flex items-center gap-1 flex-shrink-0">
          <Play className="w-2.5 h-2.5" />
          IN PROGRESS
        </span>
      );
    }
    if (reqStatus === "approved") {
      return (
        <span className="badge badge-green text-[9px] flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" />
          APPROVED
        </span>
      );
    }
    if (reqStatus === "rejected") {
      return (
        <span className="badge badge-red text-[9px] flex items-center gap-1 flex-shrink-0">
          <XCircle className="w-2.5 h-2.5" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="badge badge-yellow text-[9px] flex items-center gap-1 flex-shrink-0">
        <Clock className="w-2.5 h-2.5" />
        {isActive ? (isManager ? "REVIEWING" : "ACTIVE") : "PENDING"}
      </span>
    );
  };

  const handleConfirmReject = async (req) => {
    if (onRejectRequest) {
      await onRejectRequest(req, rejectReason);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <ClipboardCheck className={`w-3.5 h-3.5 ${isManager ? "text-amber-400" : "text-indigo-400"}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isManager ? "text-amber-400" : "text-indigo-400"}`}>
          {isManager ? "Workflow Approvals" : "My Submitted Workflows"}
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
          isManager
            ? "bg-amber-900/40 border border-amber-700/40 text-amber-300"
            : "bg-indigo-900/40 border border-indigo-700/40 text-indigo-300"
        }`}>
          {requests.length}
        </span>
      </div>

      {requests.map((req) => {
        const isActive = activeRequestId === req.id;
        const vendor = extractVendor(req.policy_text);
        const amount = extractAmount(req.policy_text);
        const isPending = req.status === "pending";
        const isRejecting = rejectingId === req.id;

        return (
          <div
            key={req.id}
            className={`vf-card rounded-lg border overflow-hidden transition-all ${
              isActive
                ? "border-indigo-500/60 bg-indigo-950/20 shadow-md"
                : "vf-border vf-bg-card-alt"
            }`}
          >
            <div className="p-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold vf-text-primary text-xs block truncate">
                    {req.workflow_name || "Workflow Request"}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 vf-text-tertiary flex-shrink-0" />
                    <span className="text-[10px] vf-text-secondary truncate">
                      {isManager ? (req.employee_name || "Employee") : (req.reviewed_by ? `Reviewed by ${req.reviewed_by}` : "Waiting for Manager")}
                    </span>
                  </div>
                </div>
                {getStatusBadge(req, isActive)}
              </div>

              {(vendor || amount) && (
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {vendor && (
                    <span className="vf-text-secondary">
                      <span className="vf-text-tertiary">Vendor:</span> {vendor}
                    </span>
                  )}
                  {amount && (
                    <span className="vf-text-secondary">
                      <span className="vf-text-tertiary">Amount:</span> {amount}
                    </span>
                  )}
                </div>
              )}

              {req.status === "rejected" && req.rejection_reason && (
                <div className="p-1.5 rounded bg-rose-950/30 border border-rose-800/40 text-rose-300 text-[10px]">
                  <span className="font-semibold">Reason:</span> {req.rejection_reason}
                </div>
              )}

              {/* Rejection reason inline input for manager */}
              {isManager && isPending && isRejecting && (
                <div className="p-2 rounded bg-rose-950/20 border border-rose-800/40 space-y-1.5">
                  <input
                    type="text"
                    placeholder="Reason for rejection (optional)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-2 py-1 text-[10px] rounded border vf-border vf-bg-editor vf-text-primary focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleConfirmReject(req)}
                      disabled={isApprovingRequest}
                      className="flex-1 py-1 rounded text-[10px] font-bold bg-rose-700 hover:bg-rose-600 text-white cursor-pointer disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="px-2 py-1 rounded text-[10px] vf-text-tertiary hover:vf-text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-1 pt-1">
                {/* Open / Review */}
                <button
                  id={`vf-open-request-${req.id}`}
                  onClick={() => onOpenRequest && onOpenRequest(req)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-indigo-700/60 border border-indigo-500/60 text-indigo-200"
                      : "bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-800/50"
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  {isActive ? (isManager ? "Reviewing" : "Active") : (isManager ? "Review in Inspector" : "Open Workflow")}
                </button>

                {/* Direct quick action buttons for manager on pending requests */}
                {isManager && isPending && !isRejecting && (
                  <>
                    <button
                      id={`vf-card-approve-${req.id}`}
                      onClick={() => onApproveRequest && onApproveRequest(req)}
                      disabled={isApprovingRequest}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/80 transition-colors cursor-pointer disabled:opacity-50"
                      title="Approve and allow execution"
                    >
                      {isApprovingRequest ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-3 h-3" />
                      )}
                      Approve
                    </button>
                    <button
                      id={`vf-card-reject-${req.id}`}
                      onClick={() => setRejectingId(req.id)}
                      disabled={isApprovingRequest}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold bg-rose-950/60 border border-rose-800/50 text-rose-300 hover:bg-rose-900/80 transition-colors cursor-pointer disabled:opacity-50"
                      title="Reject request"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
