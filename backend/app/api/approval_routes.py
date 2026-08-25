"""Approval request API routes for the Employee→Manager workflow approval gate."""

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.database import get_session
from app.models.database_models import (
    ApprovalRequest, Workflow, User, AuditLog
)
from app.auth import get_current_user, require_manager

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CreateApprovalRequestBody(BaseModel):
    workflow_id: str
    policy_text: Optional[str] = ""
    workflow_name: Optional[str] = ""
    verification_id: Optional[str] = ""


class RejectBody(BaseModel):
    rejection_reason: Optional[str] = ""


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_request(
    req: ApprovalRequest,
    employee: Optional[User] = None,
    workflow: Optional[Workflow] = None,
) -> dict:
    """Serialize an ApprovalRequest to a dict for API responses."""
    data = {
        "id": req.id,
        "workflow_id": req.workflow_id,
        "employee_id": req.employee_id,
        "manager_id": req.manager_id,
        "status": req.status,
        "policy_text": req.policy_text or (workflow.description if workflow else ""),
        "workflow_name": req.workflow_name or (workflow.name if workflow else ""),
        "verification_id": req.verification_id or (workflow.verification_id if workflow else ""),
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
        "reviewed_by": req.reviewed_by or "",
        "rejection_reason": req.rejection_reason or "",
        "employee_name": (employee.display_name or employee.username) if employee else "",
    }
    if workflow:
        data["workflow_status"] = workflow.status
        data["ir_json"] = workflow.ir_json or {}
        data["graph_json"] = workflow.graph_json or {}
    return data


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/approval-requests", status_code=201)
async def create_approval_request(
    body: CreateApprovalRequestBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Employee creates a manager approval request after verification passes.
    Employees cannot create requests for other employees' workflows.
    """
    # Verify the workflow exists and is in 'verified' state
    wf_result = await db.execute(
        select(Workflow).where(Workflow.workflow_id == body.workflow_id)
    )
    workflow = wf_result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    if workflow.status not in ("verified", "waiting_for_manager"):
        raise HTTPException(
            status_code=400,
            detail=f"Workflow is not in a verified state (current: {workflow.status})."
        )

    # If a PENDING request already exists for this workflow, reuse it (idempotent)
    existing_result = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.workflow_id == body.workflow_id,
            ApprovalRequest.status == "pending",
        )
    )
    existing_pending = existing_result.scalar_one_or_none()
    if existing_pending:
        # Reuse the existing request — return it without creating a duplicate
        emp_result = await db.execute(select(User).where(User.id == existing_pending.employee_id))
        emp = emp_result.scalar_one_or_none()
        logger.info(f"Reusing existing pending approval request {existing_pending.id} for workflow {body.workflow_id}")
        return _serialize_request(existing_pending, emp or current_user)

    # Find the manager user to assign to
    manager_result = await db.execute(
        select(User).where(User.app_role == "manager")
    )
    manager = manager_result.scalars().first()

    # Create the approval request
    approval = ApprovalRequest(
        workflow_id=body.workflow_id,
        employee_id=current_user.id,
        manager_id=manager.id if manager else None,
        status="pending",
        policy_text=body.policy_text,
        workflow_name=body.workflow_name or workflow.name,
        verification_id=body.verification_id or workflow.verification_id,
    )
    db.add(approval)

    # Update workflow status
    workflow.status = "waiting_for_manager"

    # Audit log
    audit = AuditLog(
        workflow_id=body.workflow_id,
        verification_id=body.verification_id,
        user_id=current_user.id,
        action="workflow_submitted_for_approval",
        policy_text=body.policy_text[:500] if body.policy_text else "",
        verification_status="passed",
        errors=[],
        details={
            "workflow_id": body.workflow_id,
            "employee": current_user.username,
            "manager_id": manager.id if manager else None,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(approval)

    logger.info(f"Approval request created: {approval.id} for workflow {body.workflow_id}")
    return _serialize_request(approval, current_user)


@router.get("/approval-requests")
async def list_approval_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    List approval requests.
    - Manager: sees all workflow approval requests (pending first, then history).
    - Employee: sees their own submitted requests.
    """
    if current_user.app_role == "manager":
        result = await db.execute(
            select(ApprovalRequest).order_by(desc(ApprovalRequest.created_at))
        )
    else:
        result = await db.execute(
            select(ApprovalRequest)
            .where(ApprovalRequest.employee_id == current_user.id)
            .order_by(desc(ApprovalRequest.created_at))
        )

    requests = result.scalars().all()

    # Fetch employee names and workflows for the response
    serialized = []
    for req in requests:
        emp_result = await db.execute(select(User).where(User.id == req.employee_id))
        emp = emp_result.scalar_one_or_none()
        wf_result = await db.execute(select(Workflow).where(Workflow.workflow_id == req.workflow_id))
        wf = wf_result.scalar_one_or_none()
        serialized.append(_serialize_request(req, emp, wf))

    return serialized


@router.get("/approval-requests/{request_id}")
async def get_approval_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a single approval request with full workflow data."""
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")

    # Access control: employee can only see their own, manager can see any request
    if current_user.app_role == "employee" and req.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Fetch the associated workflow data
    wf_result = await db.execute(
        select(Workflow).where(Workflow.workflow_id == req.workflow_id)
    )
    workflow = wf_result.scalar_one_or_none()

    emp_result = await db.execute(select(User).where(User.id == req.employee_id))
    emp = emp_result.scalar_one_or_none()

    serialized = _serialize_request(req, emp, workflow)

    # Audit log: manager opened request
    if current_user.app_role == "manager":
        audit = AuditLog(
            workflow_id=req.workflow_id,
            user_id=current_user.id,
            action="manager_opened_request",
            policy_text=f"Manager '{current_user.username}' opened approval request {request_id}",
            verification_status="passed",
            errors=[],
            details={"request_id": request_id, "workflow_id": req.workflow_id},
        )
        db.add(audit)
        await db.commit()

    return serialized


@router.post("/approval-requests/{request_id}/approve")
async def approve_request(
    request_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_session),
):
    """
    Manager approves a pending workflow request.
    Server-side checks:
    1. User is authenticated
    2. User has app_role = manager (enforced by require_manager dependency)
    3. Approval request exists
    4. Request is still PENDING
    """
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")

    if req.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Request cannot be approved — current status: {req.status}."
        )

    # Assign approving manager
    req.manager_id = current_user.id

    # Verify the workflow is in a waiting state
    wf_result = await db.execute(
        select(Workflow).where(Workflow.workflow_id == req.workflow_id)
    )
    workflow = wf_result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Associated workflow not found.")
    if workflow.status not in ("waiting_for_manager", "verified"):
        raise HTTPException(
            status_code=400,
            detail=f"Workflow is not awaiting approval (status: {workflow.status})."
        )

    # Approve
    req.status = "approved"
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = current_user.display_name or current_user.username

    workflow.status = "approved"

    # Audit log
    audit = AuditLog(
        workflow_id=req.workflow_id,
        verification_id=req.verification_id,
        user_id=current_user.id,
        action="manager_approved_workflow",
        policy_text=f"Manager '{current_user.username}' approved workflow {req.workflow_id}",
        verification_status="passed",
        errors=[],
        details={
            "request_id": request_id,
            "workflow_id": req.workflow_id,
            "manager": current_user.username,
        },
    )
    db.add(audit)
    await db.commit()

    logger.info(f"Manager '{current_user.username}' approved request {request_id}")

    # Return the workflow IR so the frontend can proceed to execution
    emp_result = await db.execute(select(User).where(User.id == req.employee_id))
    emp = emp_result.scalar_one_or_none()

    serialized = _serialize_request(req, emp)
    serialized["ir_json"] = workflow.ir_json or {}
    serialized["graph_json"] = workflow.graph_json or {}
    serialized["verification_id"] = req.verification_id or workflow.verification_id

    return {"status": "approved", "request": serialized}


@router.post("/approval-requests/{request_id}/reject")
async def reject_request(
    request_id: int,
    body: RejectBody = Body(default=RejectBody()),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_session),
):
    """
    Manager rejects a pending workflow request.
    Server-side checks mirror the approve endpoint.
    """
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")

    # Assign rejecting manager
    req.manager_id = current_user.id

    if req.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Request cannot be rejected — current status: {req.status}."
        )

    wf_result = await db.execute(
        select(Workflow).where(Workflow.workflow_id == req.workflow_id)
    )
    workflow = wf_result.scalar_one_or_none()

    # Reject
    req.status = "rejected"
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by = current_user.display_name or current_user.username
    req.rejection_reason = body.rejection_reason or ""

    if workflow:
        workflow.status = "rejected"

    # Audit log
    audit = AuditLog(
        workflow_id=req.workflow_id,
        user_id=current_user.id,
        action="manager_rejected_workflow",
        policy_text=f"Manager '{current_user.username}' rejected workflow {req.workflow_id}",
        verification_status="blocked",
        errors=[body.rejection_reason] if body.rejection_reason else [],
        details={
            "request_id": request_id,
            "workflow_id": req.workflow_id,
            "manager": current_user.username,
            "reason": body.rejection_reason or "No reason given",
        },
    )
    db.add(audit)
    await db.commit()

    logger.info(f"Manager '{current_user.username}' rejected request {request_id}")

    emp_result = await db.execute(select(User).where(User.id == req.employee_id))
    emp = emp_result.scalar_one_or_none()

    return {"status": "rejected", "request": _serialize_request(req, emp)}
