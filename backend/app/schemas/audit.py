"""Audit log and versioning schemas."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class AuditLogEntry(BaseModel):
    """A single audit log entry."""
    id: Optional[int] = None
    workflow_id: str = ""
    user: str = "demo_user"
    policy_text: str = ""
    verification_status: Literal["passed", "blocked", "pending"] = "pending"
    errors: list[str] = Field(default_factory=list)
    execution_status: Literal["not_started", "running", "completed", "failed"] = "not_started"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)


class WorkflowVersionEntry(BaseModel):
    """A workflow version snapshot."""
    id: Optional[int] = None
    workflow_id: str
    version: int = 1
    policy_text: str = ""
    workflow_ir_json: dict = Field(default_factory=dict)
    changes_summary: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowDiff(BaseModel):
    """Diff between two workflow versions."""
    version_from: int
    version_to: int
    changes: list[DiffItem] = Field(default_factory=list)


class DiffItem(BaseModel):
    """A single change between versions."""
    field: str
    old_value: str
    new_value: str
    change_type: Literal["added", "removed", "modified"]


class ComplianceRule(BaseModel):
    """A compliance rule in the library."""
    id: Optional[int] = None
    name: str
    description: Optional[str] = ""
    rule_type: Literal["threshold", "requirement", "approval", "role", "multi_condition"] = "threshold"
    threshold: Optional[float] = None
    condition: Optional[str] = ""
    required_action: Optional[str] = ""
    severity: Literal["info", "low", "medium", "high", "critical", "error", "warning"] = "high"
    active: bool = True
    created_at: Optional[datetime] = None


# Rebuild models to resolve forward references
WorkflowDiff.model_rebuild()
