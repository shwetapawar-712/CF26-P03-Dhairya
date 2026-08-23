"""FastAPI Router containing all REST endpoints for NLC."""

import json
import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_session
from app.models.database_models import (
    Policy, Workflow, WorkflowVersion, AuditLog, ComplianceRuleModel, User
)
from app.schemas.workflow import ParsedPolicy, WorkflowIR
from app.schemas.verification import VerificationResult, PipelineResult
from app.schemas.audit import AuditLogEntry, WorkflowVersionEntry, ComplianceRule
from app.services.nlp_parser import parse_policy, get_scenario_policies
from app.services.ir_builder import build_ir
from app.services.verification_gate import run_verification_gate, run_full_pipeline
from app.services.what_if_simulator import simulate_what_if, get_available_scenarios
from app.services import execution_simulator
from app.services.rbac_engine import get_role_permissions, get_role_hierarchy
from app.services import compliance_engine

logger = logging.getLogger(__name__)
router = APIRouter()

# --------------------------------------------------------------------------- #
# 1. Parse & Verify Endpoints
# --------------------------------------------------------------------------- #

@router.post("/parse", response_model=ParsedPolicy)
async def api_parse_policy(
    policy_text: str = Body(..., embed=True),
    scenario: Optional[str] = Body(None, embed=True)
):
    """Parse policy text into structured steps using Gemini / Mock Parser."""
    return await parse_policy(policy_text, scenario)


@router.post("/verify", response_model=PipelineResult)
async def api_verify_policy(
    policy_text: str = Body(..., embed=True),
    scenario: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_session)
):
    """Run full 8-step verification pipeline, audit log, and store workflow."""
    result = await run_full_pipeline(policy_text, scenario)
    workflow_id = f"wf_{uuid.uuid4().hex[:8]}"
    result.workflow_id = workflow_id

    # Record Audit Log in DB
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        action="verify_pipeline",
        policy_text=policy_text,
        verification_status="passed" if result.verification and result.verification.passed else "blocked",
        errors=[v.problem for v in (result.verification.violations if result.verification else []) if v.severity == "error"],
        details={
            "scenario": scenario,
            "total_errors": result.verification.total_errors if result.verification else 0,
            "total_warnings": result.verification.total_warnings if result.verification else 0,
        }
    )
    db.add(audit_entry)

    # Save Workflow & Version if IR exists
    if result.workflow_ir:
        wf = Workflow(
            workflow_id=workflow_id,
            name=result.workflow_ir.get("workflow_name", "Untitled Workflow"),
            ir_json=result.workflow_ir,
            graph_json=result.graph_data or {},
            status="verified" if result.verification and result.verification.passed else "blocked"
        )
        db.add(wf)

        ver = WorkflowVersion(
            workflow_id=workflow_id,
            version=1,
            policy_text=policy_text,
            ir_json=result.workflow_ir,
            changes_summary="Initial compilation"
        )
        db.add(ver)

        # Initialize execution state machine
        try:
            ir_obj = WorkflowIR(**result.workflow_ir)
            execution_simulator.create_execution(workflow_id, ir_obj)
        except Exception as e:
            logger.warning(f"Could not init execution state: {e}")

    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# 2. Scenario Endpoints
# --------------------------------------------------------------------------- #

@router.get("/scenarios")
async def api_get_scenarios():
    """List available demo scenarios."""
    return get_scenario_policies()


@router.post("/scenarios/{scenario_id}", response_model=PipelineResult)
async def api_run_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_session)
):
    """Run a specific preset demo scenario (1, 2, 3, or 4)."""
    scenarios = get_scenario_policies()
    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    
    text = scenarios[scenario_id]["text"]
    return await api_verify_policy(policy_text=text, scenario=scenario_id, db=db)


# --------------------------------------------------------------------------- #
# 3. What-If Simulation Endpoint
# --------------------------------------------------------------------------- #

@router.get("/what-if/scenarios")
async def api_get_what_if_scenarios():
    """List available what-if simulation options."""
    return get_available_scenarios()


@router.post("/what-if")
async def api_run_what_if(
    workflow_ir: dict = Body(..., embed=True),
    scenario_id: str = Body(..., embed=True)
):
    """Simulate a what-if scenario on a Workflow IR."""
    try:
        ir_obj = WorkflowIR(**workflow_ir)
        return simulate_what_if(ir_obj, scenario_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Workflow IR: {str(e)}")


# --------------------------------------------------------------------------- #
# 4. Execution Simulator Endpoints
# --------------------------------------------------------------------------- #

@router.post("/execute/create")
async def api_create_execution(workflow_ir: dict = Body(...)):
    """Initialize an execution state for a workflow IR."""
    try:
        ir_obj = WorkflowIR(**workflow_ir)
        wf_id = f"wf_{uuid.uuid4().hex[:8]}"
        state = execution_simulator.create_execution(wf_id, ir_obj)
        return {"workflow_id": wf_id, "state": state}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid IR: {str(e)}")


@router.post("/execute/step")
async def api_step_execution(workflow_id: str = Body(..., embed=True)):
    """Advance execution by one step."""
    res = execution_simulator.advance_execution(workflow_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@router.post("/execute/approve")
async def api_approve_execution_step(
    workflow_id: str = Body(..., embed=True),
    approved: bool = Body(True, embed=True),
    user_role: str = Body("Finance Manager", embed=True),
    db: AsyncSession = Depends(get_session)
):
    """Approve or reject a waiting business approval step during workflow runtime execution."""
    res = execution_simulator.approve_execution_step(workflow_id, approved, user_role)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])

    # Record Audit Log for Business Approval Event
    action_type = "business_approval_approved" if approved else "business_approval_rejected"
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        user_id=user_role,
        action=action_type,
        policy_text=f"Business Step Action: {'APPROVED' if approved else 'REJECTED'} by {user_role}",
        verification_status="passed" if approved else "blocked",
        errors=[] if approved else ["Workflow execution stopped due to human business rejection."],
        details={"approved": approved, "role": user_role}
    )
    db.add(audit_entry)
    await db.commit()

    return res


@router.post("/execute/reset")
async def api_reset_execution(workflow_id: str = Body(..., embed=True)):
    """Reset execution state."""
    res = execution_simulator.reset_execution(workflow_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@router.get("/execute/state/{workflow_id}")
async def api_get_execution_state(workflow_id: str):
    """Fetch current execution state."""
    res = execution_simulator.get_execution_state(workflow_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


# --------------------------------------------------------------------------- #
# 5. RBAC Permissions Endpoint
# --------------------------------------------------------------------------- #

@router.get("/rbac/matrix")
async def api_get_rbac_matrix():
    """Fetch Casbin RBAC permissions matrix and role hierarchy."""
    return {
        "permissions": get_role_permissions(),
        "hierarchy": get_role_hierarchy()
    }


# --------------------------------------------------------------------------- #
# 6. Compliance Rules Endpoints
# --------------------------------------------------------------------------- #

@router.get("/compliance-rules")
async def api_get_compliance_rules(db: AsyncSession = Depends(get_session)):
    """Get active compliance rules."""
    result = await db.execute(select(ComplianceRuleModel))
    rules = result.scalars().all()
    if not rules:
        # Seed defaults into DB
        defaults = compliance_engine.get_default_rules()
        for r in defaults:
            db_r = ComplianceRuleModel(
                name=r.name,
                description=r.description,
                condition=r.condition,
                required_action=r.required_action,
                severity=r.severity,
                active=r.active
            )
            db.add(db_r)
        await db.commit()
        result = await db.execute(select(ComplianceRuleModel))
        rules = result.scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "condition": r.condition,
            "required_action": r.required_action,
            "severity": r.severity,
            "active": r.active
        }
        for r in rules
    ]


@router.post("/compliance-rules")
async def api_create_compliance_rule(
    rule: ComplianceRule,
    db: AsyncSession = Depends(get_session)
):
    """Add a new compliance rule."""
    db_rule = ComplianceRuleModel(
        name=rule.name,
        description=rule.description,
        condition=rule.condition,
        required_action=rule.required_action,
        severity=rule.severity,
        active=rule.active
    )
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    return {"status": "created", "rule_id": db_rule.id}


@router.delete("/compliance-rules/{rule_id}")
async def api_delete_compliance_rule(rule_id: int, db: AsyncSession = Depends(get_session)):
    """Delete a compliance rule."""
    result = await db.execute(select(ComplianceRuleModel).where(ComplianceRuleModel.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"status": "deleted", "rule_id": rule_id}


# --------------------------------------------------------------------------- #
# 7. Audit Log Endpoints
# --------------------------------------------------------------------------- #

@router.get("/audit-logs")
async def api_get_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_session)
):
    """Fetch audit logs."""
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "workflow_id": log.workflow_id,
            "user": "demo_user",
            "action": log.action,
            "policy_text": log.policy_text,
            "verification_status": log.verification_status,
            "errors": log.errors or [],
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "details": log.details or {}
        }
        for log in logs
    ]


# --------------------------------------------------------------------------- #
# 8. Workflows & Versioning Endpoints
# --------------------------------------------------------------------------- #

@router.get("/workflows")
async def api_list_workflows(db: AsyncSession = Depends(get_session)):
    """List all compiled workflows."""
    result = await db.execute(select(Workflow).order_by(desc(Workflow.created_at)))
    workflows = result.scalars().all()
    return [
        {
            "workflow_id": w.workflow_id,
            "name": w.name,
            "status": w.status,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "ir_json": w.ir_json
        }
        for w in workflows
    ]


@router.get("/workflows/{workflow_id}/versions")
async def api_get_workflow_versions(
    workflow_id: str,
    db: AsyncSession = Depends(get_session)
):
    """Get version history for a workflow."""
    result = await db.execute(
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow_id)
        .order_by(desc(WorkflowVersion.version))
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id,
            "workflow_id": v.workflow_id,
            "version": v.version,
            "policy_text": v.policy_text,
            "ir_json": v.ir_json,
            "changes_summary": v.changes_summary,
            "created_at": v.created_at.isoformat() if v.created_at else None
        }
        for v in versions
    ]
