"""
IR Builder — converts ParsedPolicy into a formal WorkflowIR.

Adds START/END sentinel nodes, resolves dependency chains into directed edges,
and assigns node types (action, decision, approval, start, end).
"""

from app.schemas.workflow import (
    ParsedPolicy, WorkflowIR, WorkflowNode, WorkflowEdge, WorkflowStep,
)


def build_ir(parsed: ParsedPolicy) -> WorkflowIR:
    """
    Convert a ParsedPolicy into a formal Workflow Intermediate Representation.

    - Injects START and END sentinel nodes.
    - Creates typed nodes for each step.
    - Builds directed edges from dependencies.
    - Collects all unique roles and policies.
    """
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []
    roles: set[str] = set()
    step_ids = {step.id for step in parsed.steps}

    # START node
    nodes.append(WorkflowNode(id="START", label="Start", node_type="start"))

    # Create nodes from steps
    for step in parsed.steps:
        node_type = "approval" if step.approval_required else "action"
        if step.conditions:
            node_type = "decision"

        nodes.append(WorkflowNode(
            id=step.id,
            label=step.action,
            node_type=node_type,
            role=step.role,
            metadata={
                "description": step.description,
                "threshold": step.threshold,
                "approval_required": step.approval_required,
            },
        ))

        if step.role:
            roles.add(step.role)

    # END node
    nodes.append(WorkflowNode(id="END", label="End", node_type="end"))

    # Create edges from dependencies
    for step in parsed.steps:
        if not step.dependencies:
            # No dependencies — connect from START
            edges.append(WorkflowEdge(
                source="START",
                target=step.id,
                label="begin",
                edge_type="default",
            ))
        else:
            for dep_id in step.dependencies:
                if dep_id in step_ids:
                    # Determine edge type
                    dep_step = next((s for s in parsed.steps if s.id == dep_id), None)
                    edge_type = "default"
                    label = ""

                    if dep_step and dep_step.conditions:
                        edge_type = "conditional"
                        label = dep_step.conditions[0].label or f"{dep_step.conditions[0].field} {dep_step.conditions[0].operator.value} {dep_step.conditions[0].value}"
                    elif dep_step and dep_step.approval_required:
                        edge_type = "approval"
                        label = "approved"

                    edges.append(WorkflowEdge(
                        source=dep_id,
                        target=step.id,
                        label=label,
                        edge_type=edge_type,
                    ))

    # Connect terminal nodes to END
    target_ids = {e.target for e in edges}
    source_ids = {e.source for e in edges}
    terminal_ids = source_ids - target_ids - {"START"}

    # Nodes that are targets but not sources (leaf nodes) connect to END
    all_step_ids_in_edges = source_ids | target_ids
    for step in parsed.steps:
        is_source = step.id in source_ids
        if not is_source:
            edges.append(WorkflowEdge(
                source=step.id,
                target="END",
                label="complete",
                edge_type="default",
            ))

    # Collect policies from conditions and thresholds
    policies = []
    for step in parsed.steps:
        if step.threshold:
            policies.append(f"{step.action} has threshold: {step.threshold}")
        if step.approval_required:
            policies.append(f"{step.action} requires approval by {step.role}")

    return WorkflowIR(
        workflow_name=parsed.workflow_name,
        description=f"Workflow compiled from policy: {parsed.raw_text[:100]}...",
        steps=parsed.steps,
        nodes=nodes,
        edges=edges,
        roles=sorted(roles),
        policies=policies,
        raw_policy_text=parsed.raw_text,
    )
