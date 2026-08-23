"""Workflow IR Pydantic schemas — the core data structures for the pipeline."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ConditionOperator(str, Enum):
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_EQUAL = "greater_equal"
    LESS_EQUAL = "less_equal"
    CONTAINS = "contains"


class Condition(BaseModel):
    """A condition attached to a workflow step or edge."""
    field: str = Field(..., description="The field being evaluated, e.g. 'budget_amount'")
    operator: ConditionOperator = Field(..., description="Comparison operator")
    value: str = Field(..., description="The threshold or comparison value")
    label: str = Field("", description="Human-readable label for this condition")


class WorkflowStep(BaseModel):
    """A single step extracted from the natural-language policy."""
    id: str = Field(..., description="Unique step identifier, e.g. 'verify_vendor'")
    action: str = Field(..., description="The action to perform, e.g. 'Verify Vendor'")
    role: str = Field(..., description="Role responsible, e.g. 'Procurement Officer'")
    dependencies: list[str] = Field(default_factory=list, description="IDs of steps that must complete first")
    conditions: list[Condition] = Field(default_factory=list, description="Conditions for this step to execute")
    approval_required: bool = Field(False, description="Whether this step is an approval gate")
    description: str = Field("", description="Detailed description of the step")
    threshold: Optional[str] = Field(None, description="Monetary or quantitative threshold, e.g. '$10,000'")


class WorkflowNode(BaseModel):
    """A node in the workflow graph."""
    id: str
    label: str
    node_type: Literal["start", "end", "action", "decision", "approval"] = "action"
    role: str = ""
    metadata: dict = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    """A directed edge in the workflow graph."""
    source: str
    target: str
    label: str = ""
    condition: Optional[Condition] = None
    edge_type: Literal["default", "conditional", "approval"] = "default"


class WorkflowIR(BaseModel):
    """The complete Intermediate Representation of a workflow."""
    workflow_name: str = Field(..., description="Name of the workflow")
    description: str = Field("", description="Workflow description")
    steps: list[WorkflowStep] = Field(default_factory=list)
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    policies: list[str] = Field(default_factory=list)
    raw_policy_text: str = Field("", description="Original policy text")


class ParsedPolicy(BaseModel):
    """Output from the NLP parser before IR construction."""
    workflow_name: str
    steps: list[WorkflowStep]
    raw_text: str = ""
