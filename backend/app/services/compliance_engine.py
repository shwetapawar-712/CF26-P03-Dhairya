"""
Compliance Engine — evaluates workflow IR against organizational compliance rules.

Supports multiple rule types:
1. Threshold: Compares monetary/numerical values against configured thresholds.
2. Requirement: Ensures mandatory verification/audit steps are included in the workflow.
3. Approval: Enforces mandatory management or executive sign-off steps.
4. Role / Authorization: Verifies designated roles are assigned for key operations.
5. Multi-Condition: Evaluates compound conditions (e.g. cross-department dual sign-off).
"""

import re
import logging
from typing import Optional
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation
from app.schemas.audit import ComplianceRule

logger = logging.getLogger(__name__)

# Default compliance rules (seeded into DB on first run)
DEFAULT_RULES: list[ComplianceRule] = [
    ComplianceRule(
        id=1,
        name="Finance Approval Threshold",
        description="Purchases above $10,000 require finance department approval.",
        rule_type="threshold",
        threshold=10000.0,
        condition="purchase_amount > 10000",
        required_action="finance_approval",
        severity="high",
        active=True,
    ),
    ComplianceRule(
        id=2,
        name="CFO Approval Threshold",
        description="Purchases above $50,000 require CFO approval.",
        rule_type="threshold",
        threshold=50000.0,
        condition="purchase_amount > 50000",
        required_action="cfo_approval",
        severity="critical",
        active=True,
    ),
    ComplianceRule(
        id=3,
        name="Dual Sign-off for Cross-Department",
        description="Cross-departmental operations require approval from both department heads.",
        rule_type="multi_condition",
        threshold=None,
        condition="cross_departmental == true",
        required_action="dual_approval",
        severity="medium",
        active=True,
    ),
    ComplianceRule(
        id=4,
        name="Vendor Verification Required",
        description="All procurement workflows must include vendor verification.",
        rule_type="requirement",
        threshold=None,
        condition="workflow_type == procurement",
        required_action="verify_vendor",
        severity="high",
        active=True,
    ),
]


def _extract_threshold_from_step(step) -> float:
    """Try to extract a numeric threshold from a step or condition."""
    if step.threshold:
        match = re.search(r'[\$]?([\d,]+(?:\.\d+)?)', str(step.threshold))
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                pass
    for cond in (step.conditions or []):
        if cond.value:
            match = re.search(r'[\$]?([\d,]+(?:\.\d+)?)', str(cond.value))
            if match:
                try:
                    return float(match.group(1).replace(",", ""))
                except ValueError:
                    pass
    return 0.0


def _extract_threshold_from_ir(ir: WorkflowIR) -> float:
    """Extract max threshold from steps or raw policy text."""
    max_step_threshold = max(
        (_extract_threshold_from_step(s) for s in ir.steps),
        default=0.0,
    )
    if max_step_threshold > 0:
        return max_step_threshold

    # Fallback to scanning raw policy text
    if ir.raw_policy_text:
        matches = re.findall(r'\$([\d,]+(?:\.\d+)?)', ir.raw_policy_text)
        if matches:
            amounts = []
            for m in matches:
                try:
                    amounts.append(float(m.replace(",", "")))
                except ValueError:
                    pass
            if amounts:
                return max(amounts)

    return 0.0


def _has_step_with_id_pattern(ir: WorkflowIR, pattern: str) -> bool:
    """Check if the IR contains a step matching the action or pattern."""
    if not pattern:
        return True
    pattern_clean = pattern.lower().replace("_", " ").strip()
    pattern_slug = pattern.lower().replace(" ", "_").strip()

    for step in ir.steps:
        s_id = step.id.lower()
        s_action = step.action.lower()
        s_desc = (step.description or "").lower()

        if (
            pattern_slug in s_id
            or pattern_clean in s_action
            or pattern_slug in s_action.replace(" ", "_")
            or pattern_clean in s_desc
        ):
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
        "legal": "legal",
        "hr": "human_resources",
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
    active_rules = rules if rules is not None else DEFAULT_RULES

    for rule in active_rules:
        if not rule.active:
            continue

        violation = _evaluate_rule(ir, rule)
        if violation:
            violations.append(violation)

    return violations


def _evaluate_rule(ir: WorkflowIR, rule: ComplianceRule) -> Violation | None:
    """Evaluate a single compliance rule against the IR based on its rule type and conditions."""
    sev = (rule.severity or "high").lower()
    if sev in ("error", "fatal"):
        sev = "high"
    elif sev in ("warning", "warn"):
        sev = "medium"
    elif sev not in ("info", "low", "medium", "high", "critical"):
        sev = "high"

    rule_type = (rule.rule_type or "threshold").lower()
    req_action = rule.required_action or ""
    req_action_display = req_action.replace("_", " ").title() if req_action else rule.name

    # -------------------------------------------------------------------------
    # 1. THRESHOLD RULE
    # -------------------------------------------------------------------------
    if rule_type == "threshold" or "purchase_amount" in (rule.condition or ""):
        # Determine numeric threshold
        threshold_val = rule.threshold
        if threshold_val is None and rule.condition:
            match = re.search(r'>\s*(\d+(?:\.\d+)?)', rule.condition)
            if match:
                threshold_val = float(match.group(1))

        if threshold_val is not None and threshold_val > 0:
            detected_amount = _extract_threshold_from_ir(ir)

            if detected_amount >= threshold_val:
                action_to_check = req_action or "finance_approval"
                if not _has_step_with_id_pattern(ir, action_to_check):
                    return Violation(
                        check_type="compliance",
                        severity=sev,
                        problem=f"Compliance violation: {rule.name}",
                        cause=(
                            f"{rule.description or rule.name}. "
                            f"A threshold of ${detected_amount:,.0f} was detected, "
                            f"which exceeds allowed threshold of ${threshold_val:,.0f}."
                        ),
                        suggested_fix=(
                            f"Add a '{action_to_check.replace('_', ' ').title()}' step "
                            f"to the workflow before proceeding."
                        ),
                        metadata={
                            "rule_name": rule.name,
                            "rule_type": "threshold",
                            "threshold": threshold_val,
                            "detected_amount": detected_amount,
                            "required_action": action_to_check,
                        },
                    )

    # -------------------------------------------------------------------------
    # 2. REQUIREMENT RULE
    # -------------------------------------------------------------------------
    elif rule_type == "requirement" or "workflow_type == procurement" in (rule.condition or ""):
        # Check if condition specifies scope (e.g. procurement, vendor, legal, etc.)
        cond_lower = (rule.condition or "").lower()
        action_to_check = req_action or rule.name

        applies = True
        if "procurement" in cond_lower:
            workflow_name_lower = ir.workflow_name.lower()
            applies = (
                "procurement" in workflow_name_lower
                or any("vendor" in s.action.lower() or "procurement" in s.action.lower() for s in ir.steps)
            )

        if applies and not _has_step_with_id_pattern(ir, action_to_check):
            return Violation(
                check_type="compliance",
                severity=sev,
                problem=f"Compliance violation: {rule.name}",
                cause=rule.description or f"Mandatory requirement '{rule.name}' is missing from the workflow.",
                suggested_fix=f"Add a '{req_action_display}' step to the workflow.",
                metadata={
                    "rule_name": rule.name,
                    "rule_type": "requirement",
                    "required_action": action_to_check,
                },
            )

    # -------------------------------------------------------------------------
    # 3. APPROVAL RULE
    # -------------------------------------------------------------------------
    elif rule_type == "approval":
        action_to_check = req_action or "approval"
        has_approval = any(
            s.approval_required
            or "approval" in s.id.lower()
            or "approve" in s.action.lower()
            or (req_action and _has_step_with_id_pattern(ir, req_action))
            for s in ir.steps
        )

        if not has_approval:
            return Violation(
                check_type="compliance",
                severity=sev,
                problem=f"Compliance violation: {rule.name}",
                cause=rule.description or f"Workflow requires formal approval step '{rule.name}'.",
                suggested_fix=f"Add an approval step ('{req_action_display}') to the workflow.",
                metadata={
                    "rule_name": rule.name,
                    "rule_type": "approval",
                    "required_action": action_to_check,
                },
            )

    # -------------------------------------------------------------------------
    # 4. ROLE / AUTHORIZATION RULE
    # -------------------------------------------------------------------------
    elif rule_type == "role":
        target_role = (rule.condition or req_action or rule.name).lower()
        role_found = any(target_role in r.lower() for r in ir.roles) or any(
            target_role in s.role.lower() for s in ir.steps
        )

        if not role_found:
            return Violation(
                check_type="compliance",
                severity=sev,
                problem=f"Compliance violation: {rule.name}",
                cause=rule.description or f"Required role/authorization '{rule.name}' was not detected in assigned workflow steps.",
                suggested_fix=f"Assign step responsibility to an authorized role matching '{rule.name}'.",
                metadata={
                    "rule_name": rule.name,
                    "rule_type": "role",
                    "required_role": rule.condition or req_action,
                },
            )

    # -------------------------------------------------------------------------
    # 5. MULTI-CONDITION RULE
    # -------------------------------------------------------------------------
    elif rule_type == "multi_condition" or "cross_departmental" in (rule.condition or ""):
        departments = _get_unique_departments(ir)
        if len(departments) > 1:
            approval_count = sum(1 for s in ir.steps if s.approval_required or "approval" in s.id.lower() or "approve" in s.action.lower())
            if approval_count < 2:
                return Violation(
                    check_type="compliance",
                    severity=sev,
                    problem=f"Compliance violation: {rule.name}",
                    cause=(
                        f"{rule.description or rule.name}. "
                        f"This workflow spans multiple departments: {', '.join(sorted(departments))}. "
                        f"Only {approval_count} approval step(s) found."
                    ),
                    suggested_fix="Add an additional approval step from the other department head.",
                    metadata={
                        "rule_name": rule.name,
                        "rule_type": "multi_condition",
                        "departments": sorted(departments),
                        "approval_count": approval_count,
                    },
                )

    return None


def get_default_rules() -> list[ComplianceRule]:
    """Return the default compliance rules."""
    return DEFAULT_RULES
