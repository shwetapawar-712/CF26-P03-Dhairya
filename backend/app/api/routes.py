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
from app.services.verification_gate import (
    run_verification_gate,
    run_full_pipeline,
    validate_verification_token,
    invalidate_verification_tokens,
)
from app.services.what_if_simulator import simulate_what_if, get_available_scenarios
from app.services import execution_simulator
from app.services.rbac_engine import get_role_permissions, get_role_hierarchy
from app.services import compliance_engine
from app.services.vendor_verifier import verify_vendor_signals

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
    # Load dynamic compliance rules from database
    active_rules = None
    try:
        rule_result = await db.execute(select(ComplianceRuleModel).where(ComplianceRuleModel.active == True))
        db_rules = rule_result.scalars().all()
        if db_rules:
            active_rules = [
                ComplianceRule(
                    id=r.id,
                    name=r.name,
                    description=r.description or "",
                    rule_type=getattr(r, "rule_type", "threshold") or "threshold",
                    threshold=getattr(r, "threshold", None),
                    condition=r.condition or "",
                    required_action=r.required_action or "",
                    severity=r.severity,
                    active=r.active
                )
                for r in db_rules
            ]
    except Exception as e:
        logger.warning(f"Could not load compliance rules from DB: {e}")

    result = await run_full_pipeline(
        policy_text=policy_text,
        scenario=scenario,
        active_compliance_rules=active_rules,
    )
    workflow_id = result.workflow_id
    verif = result.verification
    verif_id = verif.verification_id if verif and verif.verification_id else ""

    # Record Audit Log in DB
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        verification_id=verif_id,
        action="verify_pipeline",
        policy_text=policy_text,
        verification_status="passed" if verif and verif.passed else "blocked",
        errors=[v.problem for v in (verif.violations if verif else []) if v.severity in ("critical", "high", "error")],
        details={
            "scenario": scenario,
            "verification_id": verif_id,
            "score": verif.score if verif else 0,
            "risk_level": verif.risk_level if verif else "HIGH",
            "total_errors": verif.total_errors if verif else 0,
            "total_warnings": verif.total_warnings if verif else 0,
            "failed_checks": verif.failed_checks if verif else [],
            "passed_checks": verif.passed_checks if verif else [],
        }
    )
    db.add(audit_entry)

    # Save Workflow & Version if IR exists
    if result.workflow_ir:
        wf = Workflow(
            workflow_id=workflow_id,
            verification_id=verif_id,
            name=result.workflow_ir.get("workflow_name", "Untitled Workflow"),
            category=result.workflow_ir.get("category", "General"),
            description=result.workflow_ir.get("description", ""),
            ir_json=result.workflow_ir,
            graph_json=result.graph_data or {},
            status="verified" if verif and verif.passed else "blocked"
        )
        db.add(wf)

        ver = WorkflowVersion(
            workflow_id=workflow_id,
            version=1,
            policy_text=policy_text,
            ir_json=result.workflow_ir,
            changes_summary="Policy compilation and verification check"
        )
        db.add(ver)

        # Initialize execution state machine ONLY if verification passed
        if verif and verif.execution_allowed:
            try:
                ir_obj = WorkflowIR(**result.workflow_ir)
                execution_simulator.create_execution(
                    workflow_id,
                    ir_obj,
                    verification_id=verif.verification_id
                )
            except Exception as e:
                logger.warning(f"Could not init execution state: {e}")
        else:
            # Explicitly invalidate any previous execution states for this workflow
            invalidate_verification_tokens(workflow_id)

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
# 2.5 Dynamic Vendor Verification Endpoint
# --------------------------------------------------------------------------- #

@router.post("/vendor/verify")
async def api_verify_vendor(
    vendor_name: str = Body(..., embed=True)
):
    """
    Dynamically verify any vendor using multi-tier public/authoritative registries.
    Returns structured evidence list, source references, and an Evidence-Based Risk Assessment (0-100).
    """
    return verify_vendor_signals(vendor_name)


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
# 4. Execution Simulator Endpoints (SECURITY-GATED)
# --------------------------------------------------------------------------- #

@router.post("/execute/create")
async def api_create_execution(
    workflow_ir: dict = Body(...),
    verification_id: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_session)
):
    """
    Initialize an execution state for a workflow IR.
    SECURITY GATED: Strictly rejects unverified workflows.
    """
    try:
        ir_obj = WorkflowIR(**workflow_ir)
        wf_id = f"wf_{uuid.uuid4().hex[:8]}"

        # Validate verification
        state = execution_simulator.create_execution(
            workflow_id=wf_id,
            ir=ir_obj,
            verification_id=verification_id
        )

        # Record audit log
        audit_entry = AuditLog(
            workflow_id=wf_id,
            verification_id=verification_id or "",
            action="execute_create",
            policy_text=ir_obj.raw_policy_text or f"Execution initialized for {ir_obj.workflow_name}",
            verification_status="passed",
            errors=[],
            details={"verification_id": verification_id}
        )
        db.add(audit_entry)
        await db.commit()

        return {"workflow_id": wf_id, "state": state}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid execution request: {str(e)}")


@router.post("/execute/step")
async def api_step_execution(
    workflow_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_session)
):
    """
    Advance execution by one step.
    SECURITY GATED: Rejects execution if workflow is unverified or blocked.
    """
    res = execution_simulator.advance_execution(workflow_id)
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])

    # Audit log step progression
    try:
        audit_entry = AuditLog(
            workflow_id=workflow_id,
            action="execute_step",
            policy_text=f"Execution step forward on {workflow_id}",
            verification_status="passed",
            errors=[],
            details={"current_step": res.get("current_step"), "is_complete": res.get("is_complete")}
        )
        db.add(audit_entry)
        await db.commit()
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")

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
        raise HTTPException(status_code=403, detail=res["error"])

    # Record Audit Log for Business Approval Event
    action_type = "business_approval_approved" if approved else "business_approval_rejected"
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        user_id=1,
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
    """Get all compliance rules, seeding defaults on first run."""
    result = await db.execute(select(ComplianceRuleModel))
    rules = result.scalars().all()
    if not rules:
        # Seed defaults into DB on first run
        defaults = compliance_engine.get_default_rules()
        for r in defaults:
            db_r = ComplianceRuleModel(
                name=r.name,
                description=r.description or "",
                rule_type=r.rule_type if hasattr(r, 'rule_type') else "threshold",
                threshold=r.threshold if hasattr(r, 'threshold') else None,
                condition=r.condition or "",
                required_action=r.required_action or "",
                severity=r.severity,
                active=r.active,
            )
            db.add(db_r)
        await db.commit()
        result = await db.execute(select(ComplianceRuleModel))
        rules = result.scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description or "",
            "rule_type": getattr(r, 'rule_type', 'threshold') or 'threshold',
            "threshold": getattr(r, 'threshold', None),
            "condition": r.condition or "",
            "required_action": r.required_action or "",
            "severity": r.severity,
            "active": r.active,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rules
    ]


@router.post("/compliance-rules")
async def api_create_compliance_rule(
    rule: ComplianceRule,
    db: AsyncSession = Depends(get_session)
):
    """Add a new compliance rule (supports multi-type: threshold, requirement, approval, role, multi_condition)."""
    db_rule = ComplianceRuleModel(
        name=rule.name,
        description=rule.description or "",
        rule_type=rule.rule_type or "threshold",
        threshold=rule.threshold,
        condition=rule.condition or "",
        required_action=rule.required_action or "",
        severity=rule.severity,
        active=rule.active,
    )
    db.add(db_rule)

    # Audit log: rule created
    audit_entry = AuditLog(
        workflow_id="",
        action="rule_created",
        policy_text=f"Compliance rule created: {rule.name} (type: {rule.rule_type})",
        verification_status="passed",
        errors=[],
        details={"rule_name": rule.name, "rule_type": rule.rule_type or "threshold", "threshold": rule.threshold}
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(db_rule)
    return {
        "status": "created",
        "rule_id": db_rule.id,
        "rule": {
            "id": db_rule.id,
            "name": db_rule.name,
            "description": db_rule.description,
            "rule_type": getattr(db_rule, 'rule_type', 'threshold') or 'threshold',
            "threshold": getattr(db_rule, 'threshold', None),
            "condition": db_rule.condition,
            "required_action": db_rule.required_action,
            "severity": db_rule.severity,
            "active": db_rule.active,
        }
    }


@router.patch("/compliance-rules/{rule_id}/toggle")
async def api_toggle_compliance_rule(rule_id: int, db: AsyncSession = Depends(get_session)):
    """Toggle enable/disable a compliance rule."""
    result = await db.execute(select(ComplianceRuleModel).where(ComplianceRuleModel.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.active = not rule.active
    # Audit log: rule toggled
    audit_entry = AuditLog(
        workflow_id="",
        action="rule_toggled",
        policy_text=f"Compliance rule '{rule.name}' {'enabled' if rule.active else 'disabled'}",
        verification_status="passed",
        errors=[],
        details={"rule_id": rule_id, "rule_name": rule.name, "active": rule.active}
    )
    db.add(audit_entry)
    await db.commit()
    return {"status": "toggled", "rule_id": rule_id, "active": rule.active}


@router.delete("/compliance-rules/{rule_id}")
async def api_delete_compliance_rule(rule_id: int, db: AsyncSession = Depends(get_session)):
    """Delete a compliance rule."""
    result = await db.execute(select(ComplianceRuleModel).where(ComplianceRuleModel.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule_name = rule.name
    await db.delete(rule)
    # Audit log: rule deleted
    audit_entry = AuditLog(
        workflow_id="",
        action="rule_deleted",
        policy_text=f"Compliance rule deleted: {rule_name}",
        verification_status="passed",
        errors=[],
        details={"rule_id": rule_id, "rule_name": rule_name}
    )
    db.add(audit_entry)
    await db.commit()
    return {"status": "deleted", "rule_id": rule_id}


# --------------------------------------------------------------------------- #
# 7. Audit Log Endpoints
# --------------------------------------------------------------------------- #

@router.get("/audit-logs")
async def api_get_audit_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_session)
):
    """Fetch audit logs in reverse-chronological order."""
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    )
    logs = result.scalars().all()

    ACTION_LABELS = {
        "verify_pipeline": "Workflow Compiled & Verified",
        "execute_create": "Execution Initialized",
        "execute_step": "Execution Step Advanced",
        "business_approval_approved": "Business Approval Granted",
        "business_approval_rejected": "Business Approval Rejected",
        "rule_created": "Compliance Rule Created",
        "rule_deleted": "Compliance Rule Deleted",
        "rule_toggled": "Compliance Rule Toggled",
        "workflow_saved": "Workflow Saved",
        "workflow_deleted": "Workflow Deleted",
    }

    return [
        {
            "id": log.id,
            "workflow_id": log.workflow_id or "",
            "verification_id": log.verification_id or (log.details.get("verification_id") if log.details else ""),
            "actor": "System / Compliance Engine",
            "action": log.action,
            "action_label": ACTION_LABELS.get(log.action, log.action.replace('_', ' ').title()),
            "policy_text": log.policy_text or "",
            "verification_status": log.verification_status or "pending",
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
    """List all compiled/saved workflows with metadata."""
    result = await db.execute(select(Workflow).order_by(desc(Workflow.created_at)))
    workflows = result.scalars().all()
    return [
        {
            "workflow_id": w.workflow_id,
            "verification_id": w.verification_id or "",
            "name": w.name,
            "category": getattr(w, 'category', 'General') or 'General',
            "description": getattr(w, 'description', '') or '',
            "status": w.status,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "ir_json": w.ir_json,
            "graph_json": w.graph_json or {},
        }
        for w in workflows
    ]


@router.post("/workflows/save")
async def api_save_workflow(
    workflow_id: str = Body(..., embed=True),
    name: str = Body(..., embed=True),
    category: str = Body("General", embed=True),
    description: str = Body("", embed=True),
    policy_text: str = Body("", embed=True),
    ir_json: Optional[dict] = Body(None, embed=True),
    graph_json: Optional[dict] = Body(None, embed=True),
    status: str = Body("verified", embed=True),
    verification_id: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_session)
):
    """Save or update a workflow in the directory with category and metadata."""
    # Check if workflow already exists
    result = await db.execute(select(Workflow).where(Workflow.workflow_id == workflow_id))
    existing = result.scalar_one_or_none()

    if existing:
        existing.name = name
        existing.category = category
        existing.description = description
        existing.status = status
        if ir_json:
            existing.ir_json = ir_json
        if graph_json:
            existing.graph_json = graph_json
        if verification_id:
            existing.verification_id = verification_id
    else:
        wf = Workflow(
            workflow_id=workflow_id,
            name=name,
            category=category,
            description=description,
            status=status,
            ir_json=ir_json or {},
            graph_json=graph_json or {},
            verification_id=verification_id or "",
        )
        db.add(wf)

    # Audit log: workflow saved
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        action="workflow_saved",
        policy_text=policy_text or f"Workflow '{name}' saved to directory",
        verification_status="passed",
        errors=[],
        details={"name": name, "category": category, "status": status}
    )
    db.add(audit_entry)
    await db.commit()
    return {"status": "saved", "workflow_id": workflow_id, "name": name, "category": category}


@router.delete("/workflows/{workflow_id}")
async def api_delete_workflow(workflow_id: str, db: AsyncSession = Depends(get_session)):
    """Delete a workflow from the directory."""
    result = await db.execute(select(Workflow).where(Workflow.workflow_id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf_name = wf.name
    await db.delete(wf)
    audit_entry = AuditLog(
        workflow_id=workflow_id,
        action="workflow_deleted",
        policy_text=f"Workflow '{wf_name}' deleted from directory",
        verification_status="passed",
        errors=[],
        details={"workflow_id": workflow_id, "name": wf_name}
    )
    db.add(audit_entry)
    await db.commit()
    return {"status": "deleted", "workflow_id": workflow_id}


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
