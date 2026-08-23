"""
Execution Simulator — step-by-step workflow execution state machine.

Tracks node states: pending → running → waiting_for_approval → completed | rejected | locked | skipped.
Supports advancing one step at a time and interactive human business approval sign-off.
"""

import logging
from typing import Literal, Optional
from app.schemas.workflow import WorkflowIR, WorkflowStep

logger = logging.getLogger(__name__)

StepStatus = Literal["pending", "running", "waiting_for_approval", "completed", "rejected", "locked", "skipped"]


class ExecutionState:
    """Tracks the execution state of a workflow during actual runtime execution."""

    def __init__(self, ir: WorkflowIR):
        self.ir = ir
        self.step_map = {s.id: s for s in ir.steps}
        self.ordered_steps = self._topological_sort()
        self.step_states: dict[str, StepStatus] = {s.id: "pending" for s in ir.steps}
        self.current_index = -1
        self.execution_log: list[dict] = []
        self.is_complete = False
        self.is_stopped = False
        self.waiting_approval_step: Optional[dict] = None

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

        # Check if step requires human business approval
        is_approval = step.approval_required or "approval" in step.id.lower() or "approve" in step.action.lower()

        if is_approval:
            self.step_states[next_id] = "waiting_for_approval"
            self.waiting_approval_step = {
                "step_id": step.id,
                "action": step.action,
                "role": step.role,
                "description": step.description,
                "threshold": step.threshold or "$10,000",
            }
            self.execution_log.append({
                "step_id": next_id,
                "action": step.action,
                "role": step.role,
                "status": "waiting_for_approval",
                "message": f"🟡 Action '{step.action}' — PAUSED for {step.role} business sign-off.",
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
        if not self.waiting_approval_step:
            return self.get_state()

        step_id = self.waiting_approval_step["step_id"]
        step = self.step_map[step_id]

        if approved:
            self.step_states[step_id] = "completed"
            self.waiting_approval_step = None
            self.execution_log.append({
                "step_id": step_id,
                "action": step.action,
                "role": user_role,
                "status": "completed",
                "message": f"🟢 {step.action} — APPROVED by {user_role}. Workflow execution continuing.",
            })
            # Auto-advance to next step after approval sign-off
            return self.advance()
        else:
            self.step_states[step_id] = "rejected"
            self.is_stopped = True
            self.is_complete = True
            self.waiting_approval_step = None

            # Mark all subsequent steps as locked/skipped
            for idx in range(self.current_index + 1, len(self.ordered_steps)):
                s_id = self.ordered_steps[idx]
                self.step_states[s_id] = "locked"

            self.execution_log.append({
                "step_id": step_id,
                "action": step.action,
                "role": user_role,
                "status": "rejected",
                "message": f"🔴 {step.action} — REJECTED by {user_role}. Workflow execution STOPPED. Subsequent steps locked.",
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

    def get_state(self) -> dict:
        """Return the current execution state dictionary."""
        return {
            "step_states": dict(self.step_states),
            "current_step": self.ordered_steps[self.current_index] if 0 <= self.current_index < len(self.ordered_steps) else None,
            "waiting_approval_step": self.waiting_approval_step,
            "execution_log": list(self.execution_log),
            "is_complete": self.is_complete,
            "is_stopped": self.is_stopped,
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


def create_execution(workflow_id: str, ir: WorkflowIR) -> dict:
    """Create execution state."""
    state = ExecutionState(ir)
    _execution_states[workflow_id] = state
    return state.get_state()


def advance_execution(workflow_id: str) -> dict:
    """Advance execution."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No execution found for workflow '{workflow_id}'"}
    return state.advance()


def approve_execution_step(workflow_id: str, approved: bool, user_role: str = "Finance Manager") -> dict:
    """Approve or reject a waiting business approval step."""
    state = _execution_states.get(workflow_id)
    if not state:
        return {"error": f"No execution found for workflow '{workflow_id}'"}
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
