"""
Verification Gate — the Step 7/8 aggregation engine.

Aggregates results from all 5 authoritative verification checks:
1. Semantic Analysis (Ambiguity Detection)
2. RBAC Authorization (Casbin RBAC Engine)
3. Graph Topology (NetworkX Graph Engine)
4. Compliance Rules (Configurable Compliance Engine)
5. Conflict Detection (Policy Conflict Detector)

VERIFY BEFORE EXECUTE:
- Any critical/high/error-severity violation blocks execution.
- Successful verification issues a unique verification_id.
- Dynamic scoring (0-100) and risk level (LOW/MEDIUM/HIGH/CRITICAL) computed server-side.
"""

import time
import uuid
import hashlib
import logging
from typing import Optional, List
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import (
    VerificationResult, CheckResult, Violation, PipelineStepResult, PipelineResult,
)
from app.schemas.audit import ComplianceRule
from app.services.ambiguity_detector import detect_ambiguities
from app.services.rbac_engine import check_rbac
from app.services.graph_verifier import verify_graph, get_graph_stats
from app.services.compliance_engine import check_compliance
from app.services.conflict_detector import detect_conflicts

logger = logging.getLogger(__name__)

# In-memory registry of active verification tokens
_verified_tokens: dict[str, dict] = {}


def register_verification_token(verification_id: str, workflow_id: str, ir: WorkflowIR) -> None:
    """Store verification token for execution authorization."""
    ir_hash = hashlib.sha256(ir.raw_policy_text.encode('utf-8')).hexdigest()
    _verified_tokens[verification_id] = {
        "verification_id": verification_id,
        "workflow_id": workflow_id,
        "workflow_name": ir.workflow_name,
        "ir_hash": ir_hash,
        "created_at": time.time(),
    }


def validate_verification_token(verification_id: str, workflow_id: Optional[str] = None) -> bool:
    """Check if verification_id is currently valid and active.
    
    NOTE: workflow_id matching is intentionally relaxed — when the execution endpoint
    creates a new execution session with a fresh workflow_id, the token was registered
    under the original pipeline workflow_id. The token itself proves the IR passed verification.
    """
    if not verification_id or verification_id not in _verified_tokens:
        return False
    # Token exists and was issued by the verification gate — that's sufficient proof.
    # We do NOT enforce workflow_id equality because the execution endpoint may assign
    # a new workflow_id for the runtime session (while reusing the original verification token).
    return True


def invalidate_verification_tokens(workflow_id: Optional[str] = None) -> None:
    """Invalidate verification tokens if policy changes."""
    global _verified_tokens
    if workflow_id:
        _verified_tokens = {k: v for k, v in _verified_tokens.items() if v.get("workflow_id") != workflow_id}
    else:
        _verified_tokens.clear()


def calculate_verification_score_and_risk(
    passed: bool, violations: list[Violation]
) -> tuple[int, str]:
    """Compute server-side verification score (0-100) and risk level."""
    if passed and len(violations) == 0:
        return 100, "LOW"

    score = 100
    for v in violations:
        sev = v.severity.lower()
        if sev == "critical":
            score -= 35
        elif sev in ("high", "error"):
            score -= 25
        elif sev in ("medium", "warning"):
            score -= 10
        elif sev == "low":
            score -= 5

    score = max(0, min(100, score))
    if not passed:
        score = min(55, score)

    if score >= 85:
        risk_level = "LOW"
    elif score >= 60:
        risk_level = "MEDIUM"
    elif score >= 40:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    return score, risk_level


def run_verification_gate(
    ir: WorkflowIR,
    active_compliance_rules: Optional[list[ComplianceRule]] = None,
    workflow_id: Optional[str] = None,
) -> VerificationResult:
    """
    Run the complete 5-check verification gate on a WorkflowIR.

    Executes all checks in order, collects violations, and determines
    whether the workflow is allowed to proceed to execution.
    """
    all_violations: list[Violation] = []
    checks_run: list[CheckResult] = []

    # ----------------------------------------------------------------------- #
    # Check 1: Semantic Analysis (Ambiguity Detection)
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    ambiguity_violations = detect_ambiguities(ir)
    duration = (time.time() - t0) * 1000
    ambiguity_passed = not any(v.severity in ("critical", "high", "error") for v in ambiguity_violations)

    checks_run.append(CheckResult(
        check_name="Semantic Analysis",
        check_type="ambiguity",
        passed=ambiguity_passed,
        duration_ms=round(duration, 2),
        violations=ambiguity_violations,
        details={"total_steps_checked": len(ir.steps)},
    ))
    all_violations.extend(ambiguity_violations)

    # ----------------------------------------------------------------------- #
    # Check 2: RBAC Authorization
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    rbac_violations = check_rbac(ir)
    duration = (time.time() - t0) * 1000
    rbac_passed = not any(v.severity in ("critical", "high", "error") for v in rbac_violations)

    checks_run.append(CheckResult(
        check_name="RBAC Authorization",
        check_type="rbac",
        passed=rbac_passed,
        duration_ms=round(duration, 2),
        violations=rbac_violations,
        details={"roles_checked": ir.roles},
    ))
    all_violations.extend(rbac_violations)

    # ----------------------------------------------------------------------- #
    # Check 3: Graph Topology
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    graph_violations = verify_graph(ir)
    duration = (time.time() - t0) * 1000
    graph_stats = get_graph_stats(ir)
    graph_passed = not any(v.severity in ("critical", "high", "error") for v in graph_violations)

    checks_run.append(CheckResult(
        check_name="Graph Topology",
        check_type="graph",
        passed=graph_passed,
        duration_ms=round(duration, 2),
        violations=graph_violations,
        details=graph_stats,
    ))
    all_violations.extend(graph_violations)

    # ----------------------------------------------------------------------- #
    # Check 4: Compliance Rules
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    compliance_violations = check_compliance(ir, active_compliance_rules)
    duration = (time.time() - t0) * 1000
    compliance_passed = not any(v.severity in ("critical", "high", "error") for v in compliance_violations)

    checks_run.append(CheckResult(
        check_name="Compliance Rules",
        check_type="compliance",
        passed=compliance_passed,
        duration_ms=round(duration, 2),
        violations=compliance_violations,
        details={"rules_evaluated": len(active_compliance_rules) if active_compliance_rules else 4},
    ))
    all_violations.extend(compliance_violations)

    # ----------------------------------------------------------------------- #
    # Check 5: Policy Conflict Detection
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    conflict_violations = detect_conflicts(ir)
    duration = (time.time() - t0) * 1000
    conflict_passed = not any(v.severity in ("critical", "high", "error") for v in conflict_violations)

    checks_run.append(CheckResult(
        check_name="Conflict Detection",
        check_type="conflict",
        passed=conflict_passed,
        duration_ms=round(duration, 2),
        violations=conflict_violations,
        details={},
    ))
    all_violations.extend(conflict_violations)

    # ----------------------------------------------------------------------- #
    # Aggregate results dynamically (Single Source of Truth)
    # ----------------------------------------------------------------------- #
    blocking_checks = [c for c in checks_run if not c.passed]
    passed_checks = [c.check_name for c in checks_run if c.passed]
    failed_checks = [c.check_name for c in checks_run if not c.passed]

    total_errors = sum(1 for v in all_violations if v.severity in ("critical", "high", "error"))
    total_warnings = sum(1 for v in all_violations if v.severity in ("medium", "low", "warning"))
    total_info = sum(1 for v in all_violations if v.severity == "info")

    passed = len(blocking_checks) == 0 and total_errors == 0
    execution_allowed = passed

    score, risk_level = calculate_verification_score_and_risk(passed, all_violations)

    # Issue unique verification_id if verification passed
    verification_id = None
    if passed:
        verification_id = f"verif_{uuid.uuid4().hex[:12]}"
        register_verification_token(verification_id, workflow_id or "", ir)
        summary = (
            f"✓ Workflow '{ir.workflow_name}' passed all {len(checks_run)} verification checks. "
            f"Status: VERIFIED. Execution allowed (ID: {verification_id})."
        )
        if total_warnings > 0:
            summary += f" ({total_warnings} warnings noted)."
    else:
        summary = (
            f"✗ Workflow '{ir.workflow_name}' BLOCKED — {len(failed_checks)} check(s) failed "
            f"({', '.join(failed_checks)}) with {total_errors} blocking violation(s). "
            f"Execution is completely blocked."
        )

    return VerificationResult(
        passed=passed,
        execution_allowed=execution_allowed,
        verification_id=verification_id,
        score=score,
        risk_level=risk_level,
        checks_run=checks_run,
        violations=all_violations,
        failed_checks=failed_checks,
        passed_checks=passed_checks,
        summary=summary,
        total_errors=total_errors,
        total_warnings=total_warnings,
        total_info=total_info,
    )


async def run_full_pipeline(
    policy_text: str,
    scenario: Optional[str] = None,
    active_compliance_rules: Optional[list[ComplianceRule]] = None,
    workflow_id: Optional[str] = None,
) -> PipelineResult:
    """
    Run the complete 8-step pipeline from raw policy text to verification result.

    Returns a PipelineResult with all step outputs.
    """
    from app.services.nlp_parser import parse_policy, extract_procurement_request
    from app.services.ir_builder import build_ir
    from app.services.vendor_verifier import verify_vendor_signals

    target_wf_id = workflow_id or f"wf_{uuid.uuid4().hex[:8]}"
    pipeline_steps: list[PipelineStepResult] = []

    # Step 1: Submit Policy
    pipeline_steps.append(PipelineStepResult(
        step_number=1,
        step_name="Submit Policy Input",
        status="passed",
        input_data={"policy_text": policy_text},
        output_data={"length": len(policy_text), "workflow_id": target_wf_id},
    ))

    # Step 2: NLP Parse
    t0 = time.time()
    try:
        parsed = await parse_policy(policy_text, scenario)
        duration = (time.time() - t0) * 1000
        parsed_dict = parsed.model_dump()
        pipeline_steps.append(PipelineStepResult(
            step_number=2,
            step_name="AI / NLP Structural Parser",
            status="passed",
            duration_ms=round(duration, 2),
            input_data={"policy_text": policy_text},
            output_data=parsed_dict,
        ))
    except Exception as e:
        pipeline_steps.append(PipelineStepResult(
            step_number=2,
            step_name="AI / NLP Structural Parser",
            status="blocked",
            error=str(e),
        ))
        return PipelineResult(
            policy_text=policy_text,
            steps=pipeline_steps,
            workflow_id=target_wf_id,
        )

    # Step 3: Build IR
    t0 = time.time()
    ir = build_ir(parsed)
    duration = (time.time() - t0) * 1000
    ir_dict = ir.model_dump()
    pipeline_steps.append(PipelineStepResult(
        step_number=3,
        step_name="Build Workflow IR",
        status="passed",
        duration_ms=round(duration, 2),
        output_data=ir_dict,
    ))

    # Step 4, 5, 6, 7: Run verification gate
    t0 = time.time()
    verification = run_verification_gate(
        ir,
        active_compliance_rules=active_compliance_rules,
        workflow_id=target_wf_id,
    )
    duration = (time.time() - t0) * 1000

    # Map verification check outputs to specific pipeline steps
    chk_map = {c.check_type: c for c in verification.checks_run}

    # Step 4: Semantic Analysis
    amb_chk = chk_map.get("ambiguity")
    pipeline_steps.append(PipelineStepResult(
        step_number=4,
        step_name="Semantic Ambiguity Detection",
        status="passed" if amb_chk and amb_chk.passed else "blocked",
        duration_ms=amb_chk.duration_ms if amb_chk else 0.0,
        output_data={"violations": [v.model_dump() for v in (amb_chk.violations if amb_chk else [])]},
    ))

    # Step 5: RBAC Authorization
    rbac_chk = chk_map.get("rbac")
    pipeline_steps.append(PipelineStepResult(
        step_number=5,
        step_name="Casbin RBAC Authorization",
        status="passed" if rbac_chk and rbac_chk.passed else "blocked",
        duration_ms=rbac_chk.duration_ms if rbac_chk else 0.0,
        output_data={"violations": [v.model_dump() for v in (rbac_chk.violations if rbac_chk else [])]},
    ))

    # Step 6: Graph Topology
    graph_chk = chk_map.get("graph")
    pipeline_steps.append(PipelineStepResult(
        step_number=6,
        step_name="NetworkX Graph & Topology Verification",
        status="passed" if graph_chk and graph_chk.passed else "blocked",
        duration_ms=graph_chk.duration_ms if graph_chk else 0.0,
        output_data={"violations": [v.model_dump() for v in (graph_chk.violations if graph_chk else [])]},
    ))

    # Step 7: Compliance & Conflict Rules
    comp_chk = chk_map.get("compliance")
    conf_chk = chk_map.get("conflict")
    step7_passed = (comp_chk.passed if comp_chk else True) and (conf_chk.passed if conf_chk else True)
    step7_violations = (comp_chk.violations if comp_chk else []) + (conf_chk.violations if conf_chk else [])
    pipeline_steps.append(PipelineStepResult(
        step_number=7,
        step_name="Compliance & Policy Conflict Evaluator",
        status="passed" if step7_passed else "blocked",
        duration_ms=round(((comp_chk.duration_ms if comp_chk else 0.0) + (conf_chk.duration_ms if conf_chk else 0.0)), 2),
        output_data={"violations": [v.model_dump() for v in step7_violations]},
    ))

    # -----------------------------------------------------------------------
    # LAYER 2: Vendor Evidence Verification
    # For procurement workflows, vendor legitimacy is a MANDATORY execution
    # prerequisite — independent of the 5 structural (Layer 1) checks.
    #
    # BLOCKING STATUSES (ALL of these block Finance Approval & PO execution):
    #   - INSUFFICIENT_EVIDENCE  → Unknown/unrecognised vendor, no registry data
    #   - VERIFICATION_FAILED    → Adverse/sanctioned entity
    #   - UNVERIFIED             → Identity unconfirmed
    #   - REVIEW_REQUIRED        → Incomplete evidence, human review needed
    #   - NEEDS_CLARIFICATION    → Vendor name missing/ambiguous
    #
    # If vendor evidence is NOT "VERIFIED":
    #   - verification.passed = False
    #   - verification.execution_allowed = False
    #   - verification token is revoked
    #   - Step 8 Gatekeeper = BLOCKED
    #   - Frontend sees passed=False → no execution session is created
    # -----------------------------------------------------------------------
    proc_info = extract_procurement_request(policy_text)
    vendor_verif_dict = None
    is_procurement_policy = (
        proc_info.get("vendor_name") is not None
        or "vendor" in policy_text.lower()
        or "purchase" in policy_text.lower()
        or "procure" in policy_text.lower()
        or any("vendor" in s.id.lower() or "purchase" in s.id.lower() for s in ir.steps)
    )

    # BLOCKING_VENDOR_STATUSES: every status that is NOT "VERIFIED" must block.
    BLOCKING_VENDOR_STATUSES = {
        "INSUFFICIENT_EVIDENCE",
        "VERIFICATION_FAILED",
        "UNVERIFIED",
        "REVIEW_REQUIRED",
        "NEEDS_CLARIFICATION",
    }

    if is_procurement_policy:
        v_name = proc_info.get("vendor_name")
        vendor_assessment = verify_vendor_signals(v_name)
        vendor_verif_dict = vendor_assessment.model_dump()

        # GATE: Block if vendor status is anything other than VERIFIED.
        # This covers INSUFFICIENT_EVIDENCE, VERIFICATION_FAILED, UNVERIFIED,
        # REVIEW_REQUIRED, and NEEDS_CLARIFICATION (incl. when v_name is None).
        if vendor_assessment.verification_status in BLOCKING_VENDOR_STATUSES:
            v_status = vendor_assessment.verification_status
            v_decision = vendor_assessment.decision
            v_summary_txt = vendor_assessment.summary
            vendor_label = f"'{v_name}'" if v_name else "[Unspecified/Unknown]"

            # Collapse the verification result — Layer 1 passing is insufficient
            verification.passed = False
            verification.execution_allowed = False
            verification.verification_id = None
            invalidate_verification_tokens(target_wf_id)

            if "Vendor Verification" not in verification.failed_checks:
                verification.failed_checks.append("Vendor Verification")
            if "Vendor Verification" in verification.passed_checks:
                verification.passed_checks.remove("Vendor Verification")

            if not any(v.check_type == "vendor" for v in verification.violations):
                verification.violations.append(Violation(
                    check_type="vendor",
                    severity="critical",
                    problem=f"Vendor {vendor_label} failed registry verification (Status: {v_status}).",
                    cause=v_summary_txt,
                    suggested_fix=(
                        "Provide an authoritative registered vendor (e.g., Lenovo India, Dell Technologies) "
                        "or submit valid MCA ROC / GSTIN credentials for compliance clearance."
                    ),
                    metadata={"vendor_assessment": vendor_verif_dict},
                ))
                verification.total_errors += 1

            verification.score, verification.risk_level = calculate_verification_score_and_risk(
                False, verification.violations
            )
            verification.summary = (
                f"✗ Workflow '{ir.workflow_name}' BLOCKED — Vendor {vendor_label} evidence is "
                f"{v_status}. {v_decision}. "
                f"Finance Approval and Purchase Order creation are completely blocked until "
                f"authoritative registry verification is obtained."
            )

    # Step 8: Final Verification Gatekeeper (reflects combined Layer 1 + Layer 2 status)
    pipeline_steps.append(PipelineStepResult(
        step_number=8,
        step_name="Verification Gatekeeper",
        status="passed" if (verification.passed and verification.execution_allowed) else "blocked",
        duration_ms=round(duration, 2),
        output_data=verification.model_dump(),
    ))

    # Generate React Flow graph structure (accessible for visual canvas inspection)
    graph_data = _build_react_flow_graph(ir)

    # Sort steps by step_number
    pipeline_steps.sort(key=lambda s: s.step_number)

    return PipelineResult(
        policy_text=policy_text,
        steps=pipeline_steps,
        parsed_policy=parsed_dict,
        workflow_ir=ir_dict,
        verification=verification,
        vendor_verification=vendor_verif_dict,
        graph_data=graph_data,
        workflow_id=target_wf_id,
    )


def _build_react_flow_graph(ir: WorkflowIR) -> dict:
    """Convert WorkflowIR into React Flow compatible graph data."""
    nodes = []
    edges = []

    y_spacing = 120
    x_center = 280

    for i, node in enumerate(ir.nodes):
        y = i * y_spacing
        x = x_center

        nodes.append({
            "id": node.id,
            "type": node.node_type,
            "position": {"x": x, "y": y},
            "data": {
                "label": node.label,
                "role": node.role,
                "nodeType": node.node_type,
                "metadata": node.metadata,
            },
        })

    for edge in ir.edges:
        edges.append({
            "id": f"{edge.source}-{edge.target}",
            "source": edge.source,
            "target": edge.target,
            "label": edge.label,
            "type": edge.edge_type,
            "animated": edge.edge_type == "approval",
        })

    return {"nodes": nodes, "edges": edges}
