"""
Execution Simulator — step-by-step workflow execution state machine.

Tracks node states: pending → running → waiting_for_approval → completed | rejected | locked | skipped.
Supports advancing one step at a time, interactive human business approval sign-off,
and dynamic procurement validation (Vendor Verification, Budget Checking, PO Generation).

SECURITY ENFORCEMENT:
- VERIFY BEFORE EXECUTE: Requires successful verification before execution can initialize or advance.
"""

import logging
import datetime
from typing import Literal, Optional
from app.schemas.workflow import WorkflowIR, WorkflowStep
from app.services.nlp_parser import extract_procurement_request
from app.services.vendor_verifier import verify_vendor_signals, VendorVerificationAssessment

logger = logging.getLogger(__name__)

StepStatus = Literal["pending", "running", "waiting_for_approval", "completed", "rejected", "locked", "skipped", "blocked"]


class ExecutionState:
    """Tracks the execution state of a verified workflow during actual runtime execution."""

    def __init__(self, ir: WorkflowIR, verification_id: Optional[str] = None):
        self.ir = ir
        self.verification_id = verification_id
        self.step_map = {s.id: s for s in ir.steps}
        self.ordered_steps = self._topological_sort()
        self.step_states: dict[str, StepStatus] = {s.id: "pending" for s in ir.steps}
        self.current_index = -1
        self.execution_log: list[dict] = []
        self.is_complete = False
        self.is_stopped = False
        self.waiting_approval_step: Optional[dict] = None

        # Extract procurement details if present
        raw_text = ir.raw_policy_text or ir.description or ""
        self.proc_info = extract_procurement_request(raw_text)

        # Check vendor verification signals if vendor specified
        v_name = self.proc_info.get("vendor_name")
        initial_assessment = None
        if v_name:
            initial_assessment = verify_vendor_signals(v_name).model_dump()

        # BLOCKING_VENDOR_STATUSES: all non-VERIFIED statuses block Finance Approval & PO creation
        BLOCKING_VENDOR_STATUSES = {
            "INSUFFICIENT_EVIDENCE",
            "VERIFICATION_FAILED",
            "UNVERIFIED",
            "REVIEW_REQUIRED",
            "NEEDS_CLARIFICATION",
        }

        is_vendor_blocked = bool(
            initial_assessment
            and initial_assessment.get("verification_status") in BLOCKING_VENDOR_STATUSES
        )

        # Initialize procurement execution context
        self.procurement_context = {
            "vendor_name": self.proc_info.get("vendor_name"),
            "product": self.proc_info.get("product") or "100 Laptops",
            "quantity": self.proc_info.get("quantity") or 100,
            "purchase_amount": self.proc_info.get("purchase_amount_str") or "₹80,00,000",
            "purchase_amount_num": self.proc_info.get("purchase_amount_num") or 8000000.0,
            "department": self.proc_info.get("department") or "IT",
            "available_budget": self.proc_info.get("available_budget_str") or "₹1,20,00,000",
            "available_budget_num": self.proc_info.get("available_budget_num") or 12000000.0,
            "missing_fields": self.proc_info.get("missing_fields") or [],
            "needs_clarification": self.proc_info.get("needs_clarification") or False,
            "vendor_assessment": initial_assessment,
            "budget_validation": None,
            "finance_approval_status": "BLOCKED" if is_vendor_blocked else "PENDING",
            "purchase_order": None,
        }

    def _topological_sort(self) -> list[str]:
        """Return step IDs in topological order."""
        sorted_ids = []
        remaining = list(self.ir.steps)
        resolved = set()

        max_iter = len(remaining) ** 2
        i = 0
        while remaining and i < max_iter:
            i += 1
            for step in remaining:
                if all(d in resolved for d in step.dependencies):
                    sorted_ids.append(step.id)
                    resolved.add(step.id)
                    remaining.remove(step)
                    break

        sorted_ids.extend(s.id for s in remaining)
        return sorted_ids

    def advance(self) -> dict:
        """Advance execution by one step."""
        if self.is_complete or self.is_stopped:
            return self.get_state()

        # If currently paused at an approval step, do not advance until user approves/rejects
        if self.waiting_approval_step is not None:
            logger.info("Execution paused waiting for human business approval sign-off")
            return self.get_state()

        # Complete the previous non-approval step
        if self.current_index >= 0:
            prev_id = self.ordered_steps[self.current_index]
            if self.step_states[prev_id] == "running":
                self.step_states[prev_id] = "completed"
                step = self.step_map[prev_id]
                self.execution_log.append({
                    "step_id": prev_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "completed",
                    "message": f"✓ Step '{step.action}' executed successfully by {step.role}.",
                })

        # Move to next step index
        self.current_index += 1

        if self.current_index >= len(self.ordered_steps):
            self.is_complete = True
            self.execution_log.append({
                "step_id": "END",
                "action": "Workflow Execution Complete",
                "role": "",
                "status": "completed",
                "message": "✓ All workflow execution steps completed successfully.",
            })
            return self.get_state()

        # Target next step
        next_id = self.ordered_steps[self.current_index]
        step = self.step_map[next_id]

        # -------------------------------------------------------------------
        # Mandatory Prerequisite & Upstream Dependency Enforcement
        # -------------------------------------------------------------------
        unmet_deps = [d for d in step.dependencies if self.step_states.get(d) != "completed"]
        if unmet_deps:
            self.step_states[next_id] = "locked"
            self.is_stopped = True
            self.is_complete = True
            if next_id == "finance_approval" or step.approval_required:
                self.procurement_context["finance_approval_status"] = "BLOCKED"
            for idx in range(self.current_index + 1, len(self.ordered_steps)):
                s_id = self.ordered_steps[idx]
                self.step_states[s_id] = "locked"
            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "locked",
                "message": f"🚫 Step '{step.action}' LOCKED — Prerequisite step(s) {', '.join(unmet_deps)} are not completed. Execution STOPPED.",
            })
            return self.get_state()

        # -------------------------------------------------------------------
        # Step-specific dynamic execution logic
        # -------------------------------------------------------------------

        # Step: Identify Vendor
        if next_id == "identify_vendor":
            self.step_states[next_id] = "running"
            v_name = self.procurement_context["vendor_name"] or "[Unspecified Vendor]"
            p_amt = self.procurement_context["purchase_amount"] or "N/A"
            dept = self.procurement_context["department"] or "IT"
            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "running",
                "message": f"📋 Procurement Request Resolved: Vendor: {v_name} | Product: {self.procurement_context['product']} | Amount: {p_amt} | Dept: {dept}.",
            })

        # Step: Verify Vendor (Dynamic Multi-Registry Signal Check)
        elif next_id == "verify_vendor":
            self.step_states[next_id] = "running"
            v_name = self.procurement_context["vendor_name"]
            assessment = verify_vendor_signals(v_name)
            self.procurement_context["vendor_assessment"] = assessment.model_dump()

            if assessment.verification_status != "VERIFIED":
                self.step_states[next_id] = "rejected"
                self.is_stopped = True
                self.is_complete = True
                self.procurement_context["finance_approval_status"] = "BLOCKED"
                self.procurement_context["budget_validation"] = None
                self.procurement_context["purchase_order"] = None
                self.execution_log.append({
                    "step_id": next_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "rejected",
                    "message": (
                        f"🔴 Vendor Verification FAILED / INSUFFICIENT for '{v_name or '[Unspecified]'}' "
                        f"(Status: {assessment.verification_status}, Assessment: {assessment.score_display}, Risk: {assessment.risk_level}). "
                        f"{assessment.summary} Subsequent downstream actions, Finance Approval, and Purchase Order creation are BLOCKED."
                    ),
                })
                # Lock all subsequent downstream steps (Budget Check, Finance Approval, PO Creation)
                for idx in range(self.current_index + 1, len(self.ordered_steps)):
                    s_id = self.ordered_steps[idx]
                    downstream_step = self.step_map[s_id]
                    self.step_states[s_id] = "locked"
                    self.execution_log.append({
                        "step_id": s_id,
                        "action": downstream_step.action,
                        "role": downstream_step.role,
                        "status": "locked",
                        "message": f"🚫 Step '{downstream_step.action}' LOCKED — Waiting for Vendor Verification clearance.",
                    })
                return self.get_state()
            else:
                self.execution_log.append({
                    "step_id": next_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "running",
                    "message": (
                        f"🔍 Dynamic Vendor Verification: '{v_name}' ({assessment.organization_status}) — "
                        f"Assessment Score: {assessment.score_display} ({assessment.risk_level} Risk). Decision: {assessment.decision}."
                    ),
                })

        # Step: Check Budget (Numeric Comparison)
        elif next_id in ("check_budget", "budget_check"):
            self.step_states[next_id] = "running"
            amt_num = self.procurement_context["purchase_amount_num"] or 8000000.0
            bud_num = self.procurement_context["available_budget_num"] or 12000000.0
            amt_str = self.procurement_context["purchase_amount"]
            bud_str = self.procurement_context["available_budget"]

            is_within_budget = (amt_num <= bud_num)
            balance = bud_num - amt_num

            self.procurement_context["budget_validation"] = {
                "passed": is_within_budget,
                "purchase_amount": amt_str,
                "available_budget": bud_str,
                "difference": f"₹{abs(balance):,.0f}" if "₹" in amt_str else f"${abs(balance):,.0f}",
                "is_over_budget": not is_within_budget,
            }

            if not is_within_budget:
                self.step_states[next_id] = "rejected"
                self.is_stopped = True
                self.is_complete = True
                self.procurement_context["finance_approval_status"] = "BLOCKED"
                self.execution_log.append({
                    "step_id": next_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "rejected",
                    "message": f"🔴 Budget Validation FAILED: Purchase Amount ({amt_str}) exceeds Available Department Budget ({bud_str}) by ₹{abs(balance):,.0f}. Execution STOPPED.",
                })
                # Lock subsequent steps
                for idx in range(self.current_index + 1, len(self.ordered_steps)):
                    s_id = self.ordered_steps[idx]
                    self.step_states[s_id] = "locked"
                return self.get_state()
            else:
                self.execution_log.append({
                    "step_id": next_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "running",
                    "message": f"🟢 Budget Validation PASSED: Purchase Amount ({amt_str}) is within Available Department Budget ({bud_str}). Remaining Balance: ₹{balance:,.0f}.",
                })

        # Step: Finance Approval Gate (Human-in-the-Loop)
        elif step.approval_required or "approval" in next_id.lower() or "approve" in step.action.lower():
            # Strict Security & Prerequisite Gate:
            # Finance approval requires ALL of:
            # 1. Workflow Gate = PASSED (valid verification token)
            # 2. Vendor Verification = VERIFIED (status must be explicitly "VERIFIED";
            #    INSUFFICIENT_EVIDENCE / REVIEW_REQUIRED / UNVERIFIED all BLOCK this gate)
            # 3. Department Budget = PASSED
            # 4. All upstream prerequisite steps = COMPLETED
            from app.services.verification_gate import validate_verification_token
            gate_ok = validate_verification_token(self.verification_id) if self.verification_id else False
            vendor_ass = self.procurement_context.get("vendor_assessment")
            # vendor_ok ONLY when assessment exists AND status is exactly "VERIFIED".
            # None assessment (no vendor check) = BLOCKED for procurement workflows.
            vendor_ok = (
                vendor_ass is not None
                and vendor_ass.get("verification_status") == "VERIFIED"
            )
            budget_val = self.procurement_context.get("budget_validation")
            budget_ok = (budget_val is None) or (budget_val.get("passed") is True)
            unmet_deps = [d for d in step.dependencies if self.step_states.get(d) != "completed"]

            if not gate_ok or not vendor_ok or not budget_ok or unmet_deps:
                self.step_states[next_id] = "locked"
                self.is_stopped = True
                self.is_complete = True
                self.procurement_context["finance_approval_status"] = "BLOCKED"
                for idx in range(self.current_index + 1, len(self.ordered_steps)):
                    s_id = self.ordered_steps[idx]
                    self.step_states[s_id] = "locked"
                self.execution_log.append({
                    "step_id": next_id,
                    "action": step.action,
                    "role": step.role,
                    "status": "locked",
                    "message": (
                        f"🚫 Finance Approval BLOCKED: Cannot execute because workflow gate or prerequisites failed "
                        f"(Gate Verified: {gate_ok}, Vendor Verified: {vendor_ok}, Budget Passed: {budget_ok}, Incomplete Prereqs: {unmet_deps}). "
                        f"Execution STOPPED."
                    ),
                })
                return self.get_state()

            self.step_states[next_id] = "waiting_for_approval"
            amt_str = self.procurement_context["purchase_amount"]
            v_name = self.procurement_context["vendor_name"]
            self.waiting_approval_step = {
                "step_id": step.id,
                "action": step.action,
                "role": step.role,
                "description": step.description or f"Finance Manager sign-off required for {amt_str} purchase from {v_name}.",
                "threshold": step.threshold or amt_str or "₹80,00,000",
            }
            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "waiting_for_approval",
                "message": f"🟡 Action '{step.action}' — PAUSED for {step.role} business sign-off. (Only authorized {step.role} can approve).",
            })

        # Step: Create Purchase Order (PO Generation)
        elif next_id in ("create_purchase_order", "create_procurement_ticket"):
            self.step_states[next_id] = "running"
            v_name = self.procurement_context["vendor_name"]
            amt_str = self.procurement_context["purchase_amount"]
            now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            po_num = f"PO-VF-2024-{abs(hash(v_name + amt_str)) % 89999 + 10000}"

            self.procurement_context["purchase_order"] = {
                "po_number": po_num,
                "issued_at": now_iso,
                "vendor_name": v_name,
                "purchase_amount": amt_str,
                "product": self.procurement_context["product"],
                "department": self.procurement_context["department"],
                "status": "ISSUED_AND_DISPATCHED",
            }

            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "running",
                "message": f"📄 Purchase Order Generated: {po_num} issued to '{v_name}' (Total: {amt_str}). Dispatching to Procurement ERP.",
            })

        else:
            self.step_states[next_id] = "running"
            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "running",
                "message": f"⏳ Executing step '{step.action}' (Role: {step.role})...",
            })

        return self.get_state()

    def approve_step(self, approved: bool, user_role: str = "Finance Manager") -> dict:
        """Process interactive business approval/rejection sign-off."""
        if not self.waiting_approval_step or self.is_stopped:
            return self.get_state()

        step_id = self.waiting_approval_step["step_id"]
        step = self.step_map[step_id]
        v_name = self.procurement_context["vendor_name"]
        amt_str = self.procurement_context["purchase_amount"]

        # Strict Security & Prerequisite Gate:
        # Finance approval requires:
        # 1. Workflow Gate = PASSED (valid active verification token)
        # 2. Vendor Verification = VERIFIED
        # 3. Department Budget = PASSED
        # 4. All required prerequisite checks = PASS
        from app.services.verification_gate import validate_verification_token
        gate_ok = validate_verification_token(self.verification_id) if self.verification_id else False
        vendor_assessment = self.procurement_context.get("vendor_assessment")
        # vendor_ok ONLY when assessment exists AND status is exactly "VERIFIED".
        # None assessment (no vendor check) = BLOCKED for procurement workflows.
        vendor_ok = (
            vendor_assessment is not None
            and vendor_assessment.get("verification_status") == "VERIFIED"
        )
        budget_val = self.procurement_context.get("budget_validation")
        budget_ok = (budget_val is None) or (budget_val.get("passed") is True)
        unmet_prereqs = [d for d in step.dependencies if self.step_states.get(d) != "completed"]

        if not gate_ok or not vendor_ok or not budget_ok or unmet_prereqs:
            self.step_states[step_id] = "locked"
            self.is_stopped = True
            self.is_complete = True
            self.waiting_approval_step = None
            self.procurement_context["finance_approval_status"] = "BLOCKED"
            for idx in range(self.current_index + 1, len(self.ordered_steps)):
                s_id = self.ordered_steps[idx]
                self.step_states[s_id] = "locked"
            self.execution_log.append({
                "step_id": step_id,
                "action": step.action,
                "role": user_role,
                "status": "locked",
                "message": (
                    f"🚫 {step.action} BLOCKED: Cannot sign off approval because workflow gate or prerequisites failed "
                    f"(Gate Verified: {gate_ok}, Vendor Verified: {vendor_ok}, Budget Passed: {budget_ok}, Incomplete Prereqs: {unmet_prereqs}). "
                    f"Execution STOPPED."
                ),
            })
            return self.get_state()

        if approved:
            self.step_states[step_id] = "completed"
            self.waiting_approval_step = None
            self.procurement_context["finance_approval_status"] = "APPROVED"
            self.execution_log.append({
                "step_id": step_id,
                "action": step.action,
                "role": user_role,
                "status": "completed",
                "message": f"🟢 {step.action} — APPROVED by {user_role} for {v_name} ({amt_str}). Workflow execution authorized to proceed.",
            })
            # Auto-advance to next step after approval sign-off
            return self.advance()
        else:
            self.step_states[step_id] = "rejected"
            self.is_stopped = True
            self.is_complete = True
            self.waiting_approval_step = None
            self.procurement_context["finance_approval_status"] = "REJECTED"

            # Mark all subsequent steps as locked/skipped
            for idx in range(self.current_index + 1, len(self.ordered_steps)):
                s_id = self.ordered_steps[idx]
                self.step_states[s_id] = "locked"

            self.execution_log.append({
                "step_id": step_id,
                "action": step.action,
                "role": user_role,
                "status": "rejected",
                "message": f"🔴 {step.action} — REJECTED by {user_role}. Workflow execution STOPPED. Subsequent purchase order steps locked.",
            })
            return self.get_state()

    def reset(self):
        """Reset execution state."""
        self.step_states = {s.id: "pending" for s in self.ir.steps}
        self.current_index = -1
        self.execution_log = []
        self.is_complete = False
        self.is_stopped = False
        self.waiting_approval_step = None
        self.procurement_context["vendor_assessment"] = None
        self.procurement_context["budget_validation"] = None
        self.procurement_context["finance_approval_status"] = "PENDING"
        self.procurement_context["purchase_order"] = None

    def get_state(self) -> dict:
        """Return the current execution state dictionary."""
        return {
            "verification_id": self.verification_id,
            "step_states": dict(self.step_states),
            "current_step": self.ordered_steps[self.current_index] if 0 <= self.current_index < len(self.ordered_steps) else None,
            "waiting_approval_step": self.waiting_approval_step,
            "execution_log": list(self.execution_log),
            "is_complete": self.is_complete,
            "is_stopped": self.is_stopped,
            "procurement_context": self.procurement_context,
            "progress": {
                "completed": sum(1 for s in self.step_states.values() if s == "completed"),
                "total": len(self.step_states),
                "percentage": round(
                    sum(1 for s in self.step_states.values() if s == "completed") / max(len(self.step_states), 1) * 100
                ),
            },
        }


# In-memory execution state storage
_execution_states: dict[str, ExecutionState] = {}


def create_execution(workflow_id: str, ir: WorkflowIR, verification_id: Optional[str] = None) -> dict:
    """
    Create execution state after verifying gate status.

    Raises PermissionError if workflow has not passed verification or gate is BLOCKED.
    """
    from app.services.verification_gate import run_verification_gate, validate_verification_token

    # Security check: verify gate before allowing execution
    if verification_id:
        if not validate_verification_token(verification_id, workflow_id):
            raise PermissionError("Workflow execution blocked: invalid or expired verification ID. Workflow Gate is BLOCKED.")
    else:
        # Run verification check dynamically
        verif = run_verification_gate(ir, workflow_id=workflow_id)
        if not verif.execution_allowed or not verif.passed:
            raise PermissionError(f"Workflow execution blocked: verification failed ({verif.summary})")
        verification_id = verif.verification_id

    state = ExecutionState(ir, verification_id=verification_id)
    _execution_states[workflow_id] = state
    return state.get_state()


def advance_execution(workflow_id: str) -> dict:
    """Advance execution for a verified workflow."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No active verified execution found for workflow '{workflow_id}'"}
    return state.advance()


def approve_execution_step(workflow_id: str, approved: bool, user_role: str = "Finance Manager") -> dict:
    """Approve or reject a waiting business approval step."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No active verified execution found for workflow '{workflow_id}'"}
    return state.approve_step(approved, user_role)


def reset_execution(workflow_id: str) -> dict:
    """Reset execution."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No execution found for workflow '{workflow_id}'"}
    state.reset()
    return state.get_state()


def get_execution_state(workflow_id: str) -> dict:
    """Get state."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No execution found for workflow '{workflow_id}'"}
    return state.get_state()
