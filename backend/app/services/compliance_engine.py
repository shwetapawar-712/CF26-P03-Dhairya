"""
Compliance Engine — evaluates workflow IR against organizational compliance rules.

Default rules:
- Purchases > $10,000 require Finance Approval
- Purchases > $50,000 require CFO Approval
- Cross-departmental operations require dual sign-off

Rules are loaded from the database (with defaults seeded on first run).
"""

import re
import logging
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation
from app.schemas.audit import ComplianceRule

logger = logging.getLogger(__name__)


# Default compliance rules (seeded into DB on first run)
DEFAULT_RULES: list[ComplianceRule] = [
    ComplianceRule(
        name="Finance Approval Threshold",
        description="Purchases above $10,000 require finance department approval.",
        condition="purchase_amount > 10000",
        required_action="finance_approval",
        severity="error",
        active=True,
    ),
    ComplianceRule(
        name="CFO Approval Threshold",
        description="Purchases above $50,000 require CFO approval.",
        condition="purchase_amount > 50000",
        required_action="cfo_approval",
        severity="error",
        active=True,
    ),
    ComplianceRule(
        name="Dual Sign-off for Cross-Department",
        description="Cross-departmental operations require approval from both department heads.",
        condition="cross_departmental == true",
        required_action="dual_approval",
        severity="warning",
        active=True,
    ),
    ComplianceRule(
        name="Vendor Verification Required",
        description="All procurement workflows must include vendor verification.",
        condition="workflow_type == procurement",
        required_action="verify_vendor",
        severity="error",
        active=True,
    ),
]


def _extract_threshold_from_step(step) -> float:
    """Try to extract a numeric threshold from a step."""
    if not step.threshold:
        return 0.0
    # Extract number from strings like "$10,000" or "10000"
    match = re.search(r'[\$]?([\d,]+(?:\.\d+)?)', step.threshold)
    if match:
        return float(match.group(1).replace(",", ""))
    return 0.0


def _has_step_with_id_pattern(ir: WorkflowIR, pattern: str) -> bool:
    """Check if the IR contains a step whose ID matches the pattern."""
    pattern_lower = pattern.lower()
    for step in ir.steps:
        if pattern_lower in step.id.lower() or pattern_lower in step.action.lower().replace(" ", "_"):
            return True
    return False


def _get_unique_departments(ir: WorkflowIR) -> set:
    """Get unique departments from role names."""
    departments = set()
    role_dept_map = {
        "finance": "finance",
        "procurement": "procurement",
        "department": "operations",
        "cfo": "executive",
        "system": "it",
    }
    for role in ir.roles:
        role_lower = role.lower()
        for key, dept in role_dept_map.items():
            if key in role_lower:
                departments.add(dept)
    return departments


def check_compliance(ir: WorkflowIR, rules: list[ComplianceRule] | None = None) -> list[Violation]:
    """
    Evaluate the workflow IR against compliance rules.

    Uses provided rules or defaults if none are given.
    """
    violations: list[Violation] = []
    active_rules = rules or DEFAULT_RULES

    for rule in active_rules:
        if not rule.active:
            continue

        violation = _evaluate_rule(ir, rule)
        if violation:
            violations.append(violation)

    return violations


def _evaluate_rule(ir: WorkflowIR, rule: ComplianceRule) -> Violation | None:
    """Evaluate a single compliance rule against the IR."""

    # Rule: purchase_amount > threshold → requires specific action
    if "purchase_amount" in rule.condition:
        match = re.search(r'>\s*(\d+)', rule.condition)
        if match:
            threshold = float(match.group(1))
            # Check if any step has a threshold above this value
            max_threshold = max(
                (_extract_threshold_from_step(s) for s in ir.steps),
                default=0.0,
            )

            if max_threshold >= threshold:
                # Check if the required action exists
                if not _has_step_with_id_pattern(ir, rule.required_action):
                    return Violation(
                        check_type="compliance",
                        severity=rule.severity,
                        problem=f"Compliance violation: {rule.name}",
                        cause=(
                            f"{rule.description} "
                            f"A threshold of ${max_threshold:,.0f} was detected, "
                            f"which exceeds ${threshold:,.0f}."
                        ),
                        suggested_fix=(
                            f"Add a '{rule.required_action.replace('_', ' ').title()}' step "
                            f"to the workflow before proceeding."
                        ),
                        metadata={
                            "rule_name": rule.name,
                            "threshold": threshold,
                            "detected_amount": max_threshold,
                            "required_action": rule.required_action,
                        },
                    )

    # Rule: workflow_type == procurement → requires vendor verification
    if "workflow_type == procurement" in rule.condition:
        workflow_name_lower = ir.workflow_name.lower()
        if "procurement" in workflow_name_lower or any("vendor" in s.action.lower() or "procurement" in s.action.lower() for s in ir.steps):
            if not _has_step_with_id_pattern(ir, rule.required_action):
                return Violation(
                    check_type="compliance",
                    severity=rule.severity,
                    problem=f"Compliance violation: {rule.name}",
                    cause=rule.description,
                    suggested_fix=f"Add a '{rule.required_action.replace('_', ' ').title()}' step to the workflow.",
                    metadata={"rule_name": rule.name, "required_action": rule.required_action},
                )

    # Rule: cross-departmental → requires dual approval
    if "cross_departmental" in rule.condition:
        departments = _get_unique_departments(ir)
        if len(departments) > 1:
            approval_count = sum(1 for s in ir.steps if s.approval_required)
            if approval_count < 2:
                return Violation(
                    check_type="compliance",
                    severity=rule.severity,
                    problem=f"Compliance violation: {rule.name}",
                    cause=(
                        f"{rule.description} "
                        f"This workflow spans departments: {', '.join(sorted(departments))}. "
                        f"Only {approval_count} approval step(s) found."
                    ),
                    suggested_fix="Add an additional approval step from the other department head.",
                    metadata={
                        "rule_name": rule.name,
                        "departments": sorted(departments),
                        "approval_count": approval_count,
                    },
                )

    return None


def get_default_rules() -> list[ComplianceRule]:
    """Return the default compliance rules."""
    return DEFAULT_RULES
