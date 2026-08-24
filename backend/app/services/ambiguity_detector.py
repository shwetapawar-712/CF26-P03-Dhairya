"""
Ambiguity Detector — scans WorkflowIR for semantic ambiguities.

Checks for:
- Ambiguous roles (e.g., "Manager" without department qualifier)
- Unquantified thresholds (e.g., "expensive" without a number)
- Missing roles ("Unspecified")
- Vague action verbs
- Incomplete conditional branches
"""

import re
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation


# Known ambiguous role terms
AMBIGUOUS_ROLES = {
    "manager": "Which manager? Specify department (e.g., 'Finance Manager', 'Procurement Manager').",
    "supervisor": "Which supervisor? Specify team or department.",
    "director": "Which director? Specify division.",
    "head": "Which head? Specify department (e.g., 'Department Head', 'Team Head').",
    "lead": "Which lead? Specify team or project.",
    "officer": "Which officer? Specify function (e.g., 'Procurement Officer', 'Compliance Officer').",
    "admin": "Which admin? Specify scope (e.g., 'System Admin', 'Office Admin').",
    "approver": "Which approver? Specify the approval authority.",
}

# Unquantified / vague threshold terms
VAGUE_THRESHOLDS = {
    "expensive": "How much is 'expensive'? Specify a dollar amount (e.g., '$10,000').",
    "large": "How large? Specify a quantity or amount.",
    "small": "How small? Specify a quantity or amount.",
    "significant": "What counts as 'significant'? Define a measurable threshold.",
    "high": "How high? Provide a numeric threshold.",
    "low": "How low? Provide a numeric threshold.",
    "many": "How many? Specify an exact count or range.",
    "few": "How few? Specify an exact count or range.",
    "quick": "How quick? Define a time limit (e.g., '24 hours', '2 business days').",
    "soon": "How soon? Define a specific deadline.",
    "major": "What defines 'major'? Specify criteria.",
    "minor": "What defines 'minor'? Specify criteria.",
}

# Vague action verbs that need clarification
VAGUE_ACTIONS = {
    "handle": "What does 'handle' mean here? Specify the exact action (review, approve, process, etc.).",
    "deal with": "What does 'deal with' mean? Specify the exact operation.",
    "take care of": "What does 'take care of' mean? Specify the exact steps.",
    "look at": "What does 'look at' mean? Specify: review, audit, inspect, or approve?",
    "do": "What should be done? Specify the exact action.",
    "fix": "What needs fixing? Specify the remediation action.",
}


def detect_ambiguities(ir: WorkflowIR) -> list[Violation]:
    """Scan the IR for semantic ambiguities and return violations."""
    violations: list[Violation] = []

    for step in ir.steps:
        # Check for missing / unspecified roles
        role_lower = step.role.lower().strip()
        if role_lower in ("unspecified", "", "unknown", "tbd", "none"):
            violations.append(Violation(
                check_type="ambiguity",
                severity="critical",
                problem=f"No role assigned to step '{step.action}'.",
                cause="Every workflow step must have an accountable, explicit role for governance and RBAC verification.",
                suggested_fix=f"Assign a specific role to '{step.action}', e.g., 'Procurement Officer' or 'Finance Manager'.",
                metadata={"step_id": step.id, "field": "role", "current_value": step.role},
            ))
        elif role_lower in AMBIGUOUS_ROLES:
            violations.append(Violation(
                check_type="ambiguity",
                severity="high",
                problem=f"Ambiguous role '{step.role}' assigned to step '{step.action}'.",
                cause=AMBIGUOUS_ROLES[role_lower],
                suggested_fix=f"Replace '{step.role}' with an exact role, e.g., 'Finance Manager' or 'Procurement Officer'.",
                metadata={"step_id": step.id, "field": "role", "current_value": step.role},
            ))

        # Check for vague thresholds
        if step.threshold:
            threshold_lower = step.threshold.lower().strip()
            for vague_term, explanation in VAGUE_THRESHOLDS.items():
                if vague_term in threshold_lower and not re.search(r'\$[\d,]+', step.threshold):
                    violations.append(Violation(
                        check_type="ambiguity",
                        severity="high",
                        problem=f"Unquantified threshold '{step.threshold}' in step '{step.action}'.",
                        cause=explanation,
                        suggested_fix=f"Specify an exact quantifiable limit, e.g., '$10,000' or '500 units'.",
                        metadata={"step_id": step.id, "field": "threshold", "current_value": step.threshold},
                    ))

        # Check conditions for vague values
        for cond in step.conditions:
            value_lower = cond.value.lower().strip()
            for vague_term, explanation in VAGUE_THRESHOLDS.items():
                if vague_term == value_lower:
                    violations.append(Violation(
                        check_type="ambiguity",
                        severity="high",
                        problem=f"Vague condition value '{cond.value}' in step '{step.action}'.",
                        cause=explanation,
                        suggested_fix=f"Replace '{cond.value}' with a quantifiable threshold.",
                        metadata={"step_id": step.id, "field": "condition_value", "current_value": cond.value},
                    ))

        # Check for vague action verbs
        action_lower = step.action.lower().strip()
        for vague_verb, explanation in VAGUE_ACTIONS.items():
            if re.search(r'\b' + re.escape(vague_verb) + r'\b', action_lower):
                violations.append(Violation(
                    check_type="ambiguity",
                    severity="medium",
                    problem=f"Vague action verb in step '{step.action}'.",
                    cause=explanation,
                    suggested_fix=f"Replace '{step.action}' with a specific action verb.",
                    metadata={"step_id": step.id, "field": "action", "current_value": step.action},
                ))

    # Check for steps with no description
    for step in ir.steps:
        if not step.description or step.description.strip() == "":
            violations.append(Violation(
                check_type="ambiguity",
                severity="info",
                problem=f"Step '{step.action}' has no detailed description.",
                cause="Step descriptions improve operational auditability and operator clarity.",
                suggested_fix=f"Add a brief description explaining what '{step.action}' entails.",
                metadata={"step_id": step.id, "field": "description"},
            ))

    return violations
