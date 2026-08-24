"""
RBAC Engine — Casbin-based role-based access control.

Wraps pycasbin Enforcer to check whether a role has permission
to perform a specific action on a specific resource.
"""

import os
import logging
import casbin
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation

logger = logging.getLogger(__name__)

# Path to Casbin config files
RBAC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "rbac")
MODEL_PATH = os.path.join(RBAC_DIR, "model.conf")
POLICY_PATH = os.path.join(RBAC_DIR, "policy.csv")


# --------------------------------------------------------------------------- #
# Role-to-action permission mapping (used for suggested fixes)
# --------------------------------------------------------------------------- #

ROLE_ACTION_MAP = {
    "finance_approval": "Finance Manager",
    "cfo_approval": "CFO",
    "identify_vendor": "Procurement Officer",
    "vendor_verification": "Procurement Officer",
    "verify_vendor": "Procurement Officer",
    "check_budget": "Department Head",
    "budget_check": "Department Head",
    "create_procurement_ticket": "Procurement Officer",
    "create_purchase_order": "Procurement Officer",
    "create_ticket": "Procurement Officer",
    "process_order": "Procurement Officer",
    "system_config": "System Admin",
}


def _normalize_role(role: str) -> str:
    """Normalize a role name for Casbin lookup."""
    return role.lower().strip().replace(" ", "_")


def _normalize_action(action_id: str) -> str:
    """Normalize an action/step ID for Casbin lookup."""
    return action_id.lower().strip().replace(" ", "_")


def _get_enforcer() -> casbin.Enforcer:
    """Create and return a Casbin enforcer."""
    return casbin.Enforcer(MODEL_PATH, POLICY_PATH)


def check_rbac(ir: WorkflowIR) -> list[Violation]:
    """
    Check each workflow step against RBAC policies using Casbin.

    For each step, verify that the assigned role has permission
    to perform the step's action.
    """
    violations: list[Violation] = []

    try:
        enforcer = _get_enforcer()
    except Exception as e:
        logger.error(f"Failed to load Casbin enforcer: {e}")
        violations.append(Violation(
            check_type="rbac",
            severity="warning",
            problem="RBAC engine could not be initialized.",
            cause=str(e),
            suggested_fix="Check Casbin model.conf and policy.csv configuration.",
            metadata={"error": str(e)},
        ))
        return violations

    for step in ir.steps:
        role_normalized = _normalize_role(step.role)
        action_normalized = _normalize_action(step.id)

        # Determine the resource (step action type)
        resource = action_normalized
        act = "execute"
        if step.approval_required:
            act = "approve"

        # Check permission
        allowed = enforcer.enforce(role_normalized, resource, act)

        if not allowed:
            # Find the correct role for this action
            required_role = ROLE_ACTION_MAP.get(action_normalized, "Authorized Personnel")

            violations.append(Violation(
                check_type="rbac",
                severity="critical" if step.approval_required else "high",
                problem=f"Authorization violation: '{step.role}' cannot perform '{step.action}'.",
                cause=(
                    f"The role '{step.role}' does not have permission to "
                    f"{'approve' if step.approval_required else 'execute'} "
                    f"'{step.action}'. This action requires '{required_role}' privileges."
                ),
                suggested_fix=(
                    f"Reassign '{step.action}' from '{step.role}' to '{required_role}', "
                    f"or grant '{step.role}' the required '{act}' permission for '{step.action}'."
                ),
                metadata={
                    "step_id": step.id,
                    "assigned_role": step.role,
                    "required_role": required_role,
                    "action": step.action,
                    "permission_type": act,
                },
            ))

    return violations


def get_role_permissions() -> list[dict]:
    """Return all role-permission mappings for display."""
    try:
        enforcer = _get_enforcer()
        policies = enforcer.get_policy()
        return [
            {"role": p[0], "resource": p[1], "action": p[2]}
            for p in policies
        ]
    except Exception as e:
        logger.error(f"Failed to get policies: {e}")
        return []


def get_role_hierarchy() -> list[dict]:
    """Return role groupings for display."""
    try:
        enforcer = _get_enforcer()
        groupings = enforcer.get_grouping_policy()
        return [
            {"role": g[0], "group": g[1]}
            for g in groupings
        ]
    except Exception as e:
        logger.error(f"Failed to get role hierarchy: {e}")
        return []
