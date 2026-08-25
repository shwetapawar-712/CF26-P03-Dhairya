"""SQLAlchemy ORM models for the NLC database."""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), default="")
    role = Column(String(100), default="user")           # legacy / workflow role field
    app_role = Column(String(50), default="employee")    # application role: employee | manager
    password_hash = Column(String(255), default="")      # bcrypt hash
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user_rel")
    submitted_approvals = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.employee_id",
        back_populates="employee_rel",
    )
    managed_approvals = relationship(
        "ApprovalRequest",
        foreign_keys="ApprovalRequest.manager_id",
        back_populates="manager_rel",
    )


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    raw_text = Column(Text, nullable=False)
    created_by = Column(String(100), default="demo_user")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    workflows = relationship("Workflow", back_populates="policy_rel")


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(100), unique=True, nullable=False)
    verification_id = Column(String(100), default="")
    name = Column(String(200), nullable=False)
    category = Column(String(100), default="General")
    description = Column(Text, default="")
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=True)
    ir_json = Column(JSON, default=dict)
    graph_json = Column(JSON, default=dict)
    # status: pending, verified, blocked, executing, completed,
    #         waiting_for_manager, approved, rejected
    status = Column(String(50), default="pending")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # employee user id
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    policy_rel = relationship("Policy", back_populates="workflows")
    versions = relationship("WorkflowVersion", back_populates="workflow_rel")
    executions = relationship("Execution", back_populates="workflow_rel")
    approval_requests = relationship("ApprovalRequest", back_populates="workflow_rel")


class ApprovalRequest(Base):
    """Manager approval gate between verification and execution."""
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(100), ForeignKey("workflows.workflow_id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # status: pending, approved, rejected
    status = Column(String(20), default="pending")
    policy_text = Column(Text, default="")          # snapshot of the original policy
    workflow_name = Column(String(200), default="")
    verification_id = Column(String(100), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(200), nullable=True)  # display name
    rejection_reason = Column(Text, default="")

    # Relationships
    workflow_rel = relationship("Workflow", back_populates="approval_requests")
    employee_rel = relationship("User", foreign_keys=[employee_id], back_populates="submitted_approvals")
    manager_rel = relationship("User", foreign_keys=[manager_id], back_populates="managed_approvals")


class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(100), ForeignKey("workflows.workflow_id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    policy_text = Column(Text, default="")
    ir_json = Column(JSON, default=dict)
    changes_summary = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    workflow_rel = relationship("Workflow", back_populates="versions")


class Execution(Base):
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(100), ForeignKey("workflows.workflow_id"), nullable=False)
    status = Column(String(50), default="not_started")  # not_started, running, completed, failed
    current_step = Column(String(100), default="")
    execution_log = Column(JSON, default=list)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    workflow_rel = relationship("Workflow", back_populates="executions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(100), default="")
    verification_id = Column(String(100), default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # submit, verify, execute, fail, login, approval_*
    policy_text = Column(Text, default="")
    verification_status = Column(String(50), default="pending")
    errors = Column(JSON, default=list)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user_rel = relationship("User", back_populates="audit_logs")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), default="")
    department = Column(String(100), default="")
    description = Column(Text, default="")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(100), ForeignKey("roles.name"), nullable=False)
    resource = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    effect = Column(String(20), default="allow")  # allow, deny


class ComplianceRuleModel(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    rule_type = Column(String(50), default="threshold")  # threshold, requirement, approval, role, multi_condition
    threshold = Column(Float, nullable=True)
    condition = Column(String(500), default="")
    required_action = Column(String(200), default="")
    severity = Column(String(20), default="error")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
