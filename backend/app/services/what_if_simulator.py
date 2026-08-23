"""
What-If Simulator — simulates scenario conditions on a verified workflow.

Given a verified workflow and a what-if scenario (e.g., "finance approval rejected"),
walks the graph applying the scenario condition and returns the resulting execution path.
"""

import logging
from app.schemas.workflow import WorkflowIR
from typing import Literal

logger = logging.getLogger(__name__)


# Pre-defined what-if scenarios
WHAT_IF_SCENARIOS = {
    "finance_rejected": {
        "name": "Finance Approval Rejected",
        "description": "What if the finance approval step is rejected?",
        "affected_step": "finance_approval",
        "outcome": "rejected",
    },
    "budget_exceeded": {
        "name": "Budget Exceeded",
        "description": "What if the budget check reveals the amount exceeds the limit?",
        "affected_step": "check_budget",
        "outcome": "failed",
    },
    "vendor_failed": {
        "name": "Vendor Verification Failed",
        "description": "What if the vendor fails verification checks?",
        "affected_step": "verify_vendor",
        "outcome": "failed",
    },
    "cfo_rejected": {
        "name": "CFO Approval Rejected",
        "description": "What if the CFO rejects the high-value purchase?",
        "affected_step": "cfo_approval",
        "outcome": "rejected",
    },
}


def simulate_what_if(ir: WorkflowIR, scenario_id: str) -> dict:
    """
    Simulate a what-if scenario on the workflow.

    Returns a dict with:
    - scenario: the scenario details
    - execution_path: ordered list of step results
    - final_state: overall workflow outcome
    - affected_steps: steps impacted by the scenario
    """
    scenario = WHAT_IF_SCENARIOS.get(scenario_id)
    if not scenario:
        return {
            "error": f"Unknown scenario: {scenario_id}",
            "available_scenarios": list(WHAT_IF_SCENARIOS.keys()),
        }

    affected_step_id = scenario["affected_step"]
    outcome = scenario["outcome"]

    # Build dependency chain
    step_map = {s.id: s for s in ir.steps}
    execution_path = []
    blocked_steps = set()

    # Determine execution order from dependencies
    ordered_steps = _topological_sort_steps(ir.steps)

    for step in ordered_steps:
        # Check if any dependency is blocked
        dep_blocked = any(d in blocked_steps for d in step.dependencies)

        if dep_blocked:
            blocked_steps.add(step.id)
            execution_path.append({
                "step_id": step.id,
                "action": step.action,
                "role": step.role,
                "status": "skipped",
                "reason": f"Skipped because a prior step was {outcome}.",
            })
        elif step.id == affected_step_id:
            # This is the step affected by the scenario
            blocked_steps.add(step.id)
            execution_path.append({
                "step_id": step.id,
                "action": step.action,
                "role": step.role,
                "status": outcome,
                "reason": f"Scenario: {scenario['name']}",
            })
        else:
            execution_path.append({
                "step_id": step.id,
                "action": step.action,
                "role": step.role,
                "status": "completed",
                "reason": "",
            })

    # Determine final state
    final_state = "completed"
    if blocked_steps:
        final_state = "cancelled" if outcome == "rejected" else "failed"

    return {
        "scenario": scenario,
        "execution_path": execution_path,
        "final_state": final_state,
        "affected_steps": list(blocked_steps),
        "completed_steps": [s["step_id"] for s in execution_path if s["status"] == "completed"],
        "summary": _generate_summary(scenario, execution_path, final_state),
    }


def _topological_sort_steps(steps) -> list:
    """Simple topological sort of steps by dependencies."""
    sorted_steps = []
    remaining = list(steps)
    resolved = set()

    max_iterations = len(remaining) * len(remaining)
    iteration = 0

    while remaining and iteration < max_iterations:
        iteration += 1
        for step in remaining:
            if all(d in resolved for d in step.dependencies):
                sorted_steps.append(step)
                resolved.add(step.id)
                remaining.remove(step)
                break

    # Add any remaining (circular deps) at the end
    sorted_steps.extend(remaining)
    return sorted_steps


def _generate_summary(scenario: dict, execution_path: list, final_state: str) -> str:
    """Generate a human-readable summary of the simulation."""
    completed = [s for s in execution_path if s["status"] == "completed"]
    skipped = [s for s in execution_path if s["status"] == "skipped"]
    failed = [s for s in execution_path if s["status"] in ("failed", "rejected")]

    lines = [f"**Scenario:** {scenario['name']}"]
    lines.append(f"**Final State:** Workflow {final_state.upper()}")
    lines.append("")

    if completed:
        lines.append(f"✓ **Completed Steps ({len(completed)}):**")
        for s in completed:
            lines.append(f"  - {s['action']} ({s['role']})")

    if failed:
        lines.append(f"✗ **Failed/Rejected Steps ({len(failed)}):**")
        for s in failed:
            lines.append(f"  - {s['action']} — {s['reason']}")

    if skipped:
        lines.append(f"○ **Skipped Steps ({len(skipped)}):**")
        for s in skipped:
            lines.append(f"  - {s['action']} — {s['reason']}")

    return "\n".join(lines)


def get_available_scenarios() -> dict:
    """Return all available what-if scenarios."""
    return WHAT_IF_SCENARIOS
