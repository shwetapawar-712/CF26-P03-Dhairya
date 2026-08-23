"""Verification result schemas — structured output from all verification checks."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal, Optional


class Violation(BaseModel):
    """A single verification violation with full explainability."""
    check_type: Literal["ambiguity", "rbac", "graph", "compliance", "conflict"] = Field(
        ..., description="Which verification check produced this violation"
    )
    severity: Literal["error", "warning", "info"] = Field(
        ..., description="Severity level"
    )
    problem: str = Field(..., description="What went wrong")
    cause: str = Field(..., description="Why it went wrong")
    suggested_fix: str = Field(..., description="How to fix it")
    metadata: dict = Field(default_factory=dict, description="Additional context")


class CheckResult(BaseModel):
    """Result of a single verification check."""
    check_name: str = Field(..., description="e.g. 'Ambiguity Detection', 'RBAC Authorization'")
    check_type: Literal["ambiguity", "rbac", "graph", "compliance", "conflict"]
    passed: bool
    duration_ms: float = 0.0
    violations: list[Violation] = Field(default_factory=list)
    details: dict = Field(default_factory=dict)


class VerificationResult(BaseModel):
    """Aggregated result from the Verification Gate (Step 7)."""
    passed: bool = Field(..., description="Whether the workflow passed all checks")
    execution_allowed: bool = Field(..., description="Whether the workflow can proceed to execution")
    checks_run: list[CheckResult] = Field(default_factory=list)
    violations: list[Violation] = Field(default_factory=list)
    summary: str = Field("", description="Human-readable summary of the verification outcome")
    total_errors: int = 0
    total_warnings: int = 0


class PipelineStepResult(BaseModel):
    """Result of a single pipeline step (Steps 1-8)."""
    step_number: int
    step_name: str
    status: Literal["idle", "running", "passed", "blocked", "skipped"] = "idle"
    duration_ms: float = 0.0
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    error: Optional[str] = None


class PipelineResult(BaseModel):
    """Full pipeline execution result."""
    policy_text: str
    steps: list[PipelineStepResult] = Field(default_factory=list)
    parsed_policy: Optional[dict] = None
    workflow_ir: Optional[dict] = None
    verification: Optional[VerificationResult] = None
    graph_data: Optional[dict] = None
    workflow_id: Optional[str] = None
