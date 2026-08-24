"""
Policy Conflict Detector — detects contradictory or conflicting policies.

Checks for:
- Same step assigned to conflicting roles
- Mutually exclusive approval chains
- Contradictory condition branches
- Duplicate steps with different configurations
"""

import logging
from itertools import combinations
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation

logger = logging.getLogger(__name__)

# Roles that are known to conflict
CONFLICTING_ROLE_PAIRS = {
    frozenset({"Finance Manager", "Procurement Officer"}): "Finance and Procurement roles have separation-of-duty requirements.",
    frozenset({"Approver", "Requester"}): "The same person cannot approve their own request.",
}


def detect_conflicts(ir: WorkflowIR) -> list[Violation]:
    """Detect policy conflicts within the workflow IR."""
    violations: list[Violation] = []

    # ----------------------------------------------------------------------- #
    # 1. Same action assigned to conflicting roles across steps
    # ----------------------------------------------------------------------- #
    action_roles: dict[str, list[tuple[str, str]]] = {}  # action -> [(step_id, role)]
    for step in ir.steps:
        action_key = step.action.lower().strip()
        if action_key not in action_roles:
            action_roles[action_key] = []
        action_roles[action_key].append((step.id, step.role))

    for action, assignments in action_roles.items():
        if len(assignments) > 1:
            roles = set(r for _, r in assignments)
            if len(roles) > 1:
                violations.append(Violation(
                    check_type="conflict",
                    severity="warning",
                    problem=f"Role conflict: Action '{action}' is assigned to multiple roles.",
                    cause=(
                        f"The action '{action}' appears in multiple steps with different roles: "
                        f"{', '.join(f'{sid} ({role})' for sid, role in assignments)}. "
                        f"This creates ambiguity about who is responsible."
                    ),
                    suggested_fix=f"Assign '{action}' to a single role, or create distinct action names for each role's version.",
                    metadata={
                        "action": action,
                        "assignments": [{"step_id": sid, "role": role} for sid, role in assignments],
                    },
                ))

    # ----------------------------------------------------------------------- #
    # 2. Approval chain conflicts (approver also performing the action)
    # ----------------------------------------------------------------------- #
    approval_steps = [s for s in ir.steps if s.approval_required]
    non_approval_steps = [s for s in ir.steps if not s.approval_required]

    for approval_step in approval_steps:
        for action_step in non_approval_steps:
            if approval_step.role.lower() == action_step.role.lower() and approval_step.role:
                # Same role approving and executing — separation of duty concern
                if approval_step.id in action_step.dependencies or action_step.id in approval_step.dependencies:
                    violations.append(Violation(
                        check_type="conflict",
                        severity="high",
                        problem=f"Separation of Duty (SOD) conflict: '{approval_step.role}' both executes and approves.",
                        cause=(
                            f"'{approval_step.role}' performs '{action_step.action}' and also "
                            f"approves '{approval_step.action}'. In standard governance, an executor cannot approve their own dependent transaction."
                        ),
                        suggested_fix=(
                            f"Assign the approval step '{approval_step.action}' to an independent authority, "
                            f"or assign '{action_step.action}' to a different executor."
                        ),
                        metadata={
                            "approval_step": approval_step.id,
                            "action_step": action_step.id,
                            "shared_role": approval_step.role,
                        },
                    ))

    # ----------------------------------------------------------------------- #
    # 3. Contradictory conditions on the same field
    # ----------------------------------------------------------------------- #
    all_conditions = []
    for step in ir.steps:
        for cond in step.conditions:
            all_conditions.append((step.id, step.action, cond))

    for (sid1, action1, cond1), (sid2, action2, cond2) in combinations(all_conditions, 2):
        if cond1.field == cond2.field and sid1 != sid2:
            # Check for contradictory operators on the same field
            contradictions = {
                ("greater_than", "less_than"),
                ("greater_equal", "less_than"),
                ("greater_than", "less_equal"),
                ("equals", "not_equals"),
            }
            pair = (cond1.operator.value, cond2.operator.value)
            reverse_pair = (cond2.operator.value, cond1.operator.value)

            if pair in contradictions or reverse_pair in contradictions:
                if cond1.value == cond2.value:
                    violations.append(Violation(
                        check_type="conflict",
                        severity="high",
                        problem=f"Contradictory conditions on field '{cond1.field}'.",
                        cause=(
                            f"Step '{action1}' requires {cond1.field} {cond1.operator.value} {cond1.value}, "
                            f"but step '{action2}' requires {cond2.field} {cond2.operator.value} {cond2.value}. "
                            f"These conditions cannot both be true simultaneously."
                        ),
                        suggested_fix="Review and reconcile the conditions to ensure they can coexist.",
                        metadata={
                            "field": cond1.field,
                            "condition_1": {"step": sid1, "operator": cond1.operator.value, "value": cond1.value},
                            "condition_2": {"step": sid2, "operator": cond2.operator.value, "value": cond2.value},
                        },
                    ))

    # ----------------------------------------------------------------------- #
    # 4. Duplicate step IDs (should not happen but validate)
    # ----------------------------------------------------------------------- #
    seen_ids = {}
    for step in ir.steps:
        if step.id in seen_ids:
            violations.append(Violation(
                check_type="conflict",
                severity="critical",
                problem=f"Duplicate step ID: '{step.id}' appears multiple times.",
                cause=f"Step ID '{step.id}' is used by both '{seen_ids[step.id]}' and '{step.action}'.",
                suggested_fix=f"Rename one of the duplicate steps to have a unique ID.",
                metadata={"step_id": step.id},
            ))
        seen_ids[step.id] = step.action

    return violations
