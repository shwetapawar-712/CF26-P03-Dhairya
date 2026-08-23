"""
Verification Gate — the Step 7 aggregation engine.

Aggregates results from all verification checks:
- Ambiguity Detection (Step 4)
- RBAC Authorization (Step 5)
- Graph Verification (Step 6)
- Compliance Checks (Step 6)
- Policy Conflict Detection (Step 6)

Any error-severity violation blocks execution.
Generates the full explainable report for every violation.
"""

import time
import logging
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import (
    VerificationResult, CheckResult, Violation, PipelineStepResult, PipelineResult,
)
from app.services.ambiguity_detector import detect_ambiguities
from app.services.rbac_engine import check_rbac
from app.services.graph_verifier import verify_graph, get_graph_stats
from app.services.compliance_engine import check_compliance
from app.services.conflict_detector import detect_conflicts

logger = logging.getLogger(__name__)


def run_verification_gate(ir: WorkflowIR) -> VerificationResult:
    """
    Run the complete verification gate on a WorkflowIR.

    Executes all checks in order, collects violations, and determines
    whether the workflow is allowed to proceed to execution.
    """
    all_violations: list[Violation] = []
    checks_run: list[CheckResult] = []

    # ----------------------------------------------------------------------- #
    # Check 1: Ambiguity Detection
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    ambiguity_violations = detect_ambiguities(ir)
    duration = (time.time() - t0) * 1000

    checks_run.append(CheckResult(
        check_name="Semantic Ambiguity Detection",
        check_type="ambiguity",
        passed=not any(v.severity == "error" for v in ambiguity_violations),
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

    checks_run.append(CheckResult(
        check_name="RBAC Authorization",
        check_type="rbac",
        passed=not any(v.severity == "error" for v in rbac_violations),
        duration_ms=round(duration, 2),
        violations=rbac_violations,
        details={"roles_checked": ir.roles},
    ))
    all_violations.extend(rbac_violations)

    # ----------------------------------------------------------------------- #
    # Check 3: Graph Verification
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    graph_violations = verify_graph(ir)
    duration = (time.time() - t0) * 1000

    graph_stats = get_graph_stats(ir)
    checks_run.append(CheckResult(
        check_name="Graph Structure Verification",
        check_type="graph",
        passed=not any(v.severity == "error" for v in graph_violations),
        duration_ms=round(duration, 2),
        violations=graph_violations,
        details=graph_stats,
    ))
    all_violations.extend(graph_violations)

    # ----------------------------------------------------------------------- #
    # Check 4: Compliance
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    compliance_violations = check_compliance(ir)
    duration = (time.time() - t0) * 1000

    checks_run.append(CheckResult(
        check_name="Compliance Rule Evaluation",
        check_type="compliance",
        passed=not any(v.severity == "error" for v in compliance_violations),
        duration_ms=round(duration, 2),
        violations=compliance_violations,
        details={"rules_evaluated": 4},
    ))
    all_violations.extend(compliance_violations)

    # ----------------------------------------------------------------------- #
    # Check 5: Policy Conflict Detection
    # ----------------------------------------------------------------------- #
    t0 = time.time()
    conflict_violations = detect_conflicts(ir)
    duration = (time.time() - t0) * 1000

    checks_run.append(CheckResult(
        check_name="Policy Conflict Detection",
        check_type="conflict",
        passed=not any(v.severity == "error" for v in conflict_violations),
        duration_ms=round(duration, 2),
        violations=conflict_violations,
        details={},
    ))
    all_violations.extend(conflict_violations)

    # ----------------------------------------------------------------------- #
    # Aggregate results
    # ----------------------------------------------------------------------- #
    total_errors = sum(1 for v in all_violations if v.severity == "error")
    total_warnings = sum(1 for v in all_violations if v.severity == "warning")
    passed = total_errors == 0
    execution_allowed = passed

    # Generate summary
    if passed:
        summary = (
            f"✓ Workflow '{ir.workflow_name}' passed all {len(checks_run)} verification checks. "
            f"No errors detected."
        )
        if total_warnings > 0:
            summary += f" {total_warnings} warning(s) noted."
    else:
        failed_checks = [c.check_name for c in checks_run if not c.passed]
        summary = (
            f"✗ Workflow '{ir.workflow_name}' BLOCKED — "
            f"{total_errors} error(s) in {', '.join(failed_checks)}. "
            f"Workflow cannot proceed to execution until all errors are resolved."
        )

    return VerificationResult(
        passed=passed,
        execution_allowed=execution_allowed,
        checks_run=checks_run,
        violations=all_violations,
        summary=summary,
        total_errors=total_errors,
        total_warnings=total_warnings,
    )


async def run_full_pipeline(policy_text: str, scenario: str | None = None) -> PipelineResult:
    """
    Run the complete 8-step pipeline from raw policy text to verification result.

    Returns a PipelineResult with all step outputs.
    """
    from app.services.nlp_parser import parse_policy
    from app.services.ir_builder import build_ir

    pipeline_steps: list[PipelineStepResult] = []

    # Step 1: Submit Policy
    pipeline_steps.append(PipelineStepResult(
        step_number=1,
        step_name="Submit Policy",
        status="passed",
        input_data={"policy_text": policy_text},
        output_data={"length": len(policy_text)},
    ))

    # Step 2: NLP Parse
    t0 = time.time()
    try:
        parsed = await parse_policy(policy_text, scenario)
        duration = (time.time() - t0) * 1000
        parsed_dict = parsed.model_dump()
        pipeline_steps.append(PipelineStepResult(
            step_number=2,
            step_name="AI/NLP Parser",
            status="passed",
            duration_ms=round(duration, 2),
            input_data={"policy_text": policy_text},
            output_data=parsed_dict,
        ))
    except Exception as e:
        pipeline_steps.append(PipelineStepResult(
            step_number=2,
            step_name="AI/NLP Parser",
            status="blocked",
            error=str(e),
        ))
        return PipelineResult(
            policy_text=policy_text,
            steps=pipeline_steps,
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

    # Steps 4-6: Verification (handled by gate)
    t0 = time.time()
    verification = run_verification_gate(ir)
    duration = (time.time() - t0) * 1000

    # Map check results to pipeline steps
    check_step_map = {
        "ambiguity": (4, "Ambiguity Detection"),
        "rbac": (5, "RBAC Authorization"),
        "graph": (6, "Graph & Compliance Verification"),
    }

    for check in verification.checks_run:
        step_num, step_name = check_step_map.get(
            check.check_type, (6, "Graph & Compliance Verification")
        )
        # Don't duplicate step 6
        existing = [s for s in pipeline_steps if s.step_number == step_num]
        if existing:
            continue

        pipeline_steps.append(PipelineStepResult(
            step_number=step_num,
            step_name=step_name,
            status="passed" if check.passed else "blocked",
            duration_ms=check.duration_ms,
            output_data={
                "check_name": check.check_name,
                "violations": [v.model_dump() for v in check.violations],
            },
        ))

    # Ensure steps 4, 5, 6 all exist
    for step_num, step_name in [(4, "Ambiguity Detection"), (5, "RBAC Authorization"), (6, "Graph & Compliance")]:
        if not any(s.step_number == step_num for s in pipeline_steps):
            pipeline_steps.append(PipelineStepResult(
                step_number=step_num,
                step_name=step_name,
                status="passed",
            ))

    # Step 7: Verification Gate
    pipeline_steps.append(PipelineStepResult(
        step_number=7,
        step_name="Verification Gate",
        status="passed" if verification.passed else "blocked",
        duration_ms=round(duration, 2),
        output_data=verification.model_dump(),
    ))

    # Step 8: Generate Workflow Graph
    if verification.execution_allowed:
        # Build graph data for React Flow
        graph_data = _build_react_flow_graph(ir)
        pipeline_steps.append(PipelineStepResult(
            step_number=8,
            step_name="Generate Workflow Graph",
            status="passed",
            output_data=graph_data,
        ))
    else:
        pipeline_steps.append(PipelineStepResult(
            step_number=8,
            step_name="Generate Workflow Graph",
            status="skipped",
            error="Workflow blocked at verification gate.",
        ))

    # Sort steps by number
    pipeline_steps.sort(key=lambda s: s.step_number)

    return PipelineResult(
        policy_text=policy_text,
        steps=pipeline_steps,
        parsed_policy=parsed_dict if 'parsed_dict' in dir() else None,
        workflow_ir=ir_dict if 'ir_dict' in dir() else None,
        verification=verification,
        graph_data=graph_data if verification.execution_allowed else None,
    )


def _build_react_flow_graph(ir: WorkflowIR) -> dict:
    """Convert WorkflowIR into React Flow compatible graph data."""
    nodes = []
    edges = []

    # Layout positions (simple vertical layout)
    step_ids = ["START"] + [s.id for s in ir.steps] + ["END"]
    y_spacing = 120
    x_center = 300

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
