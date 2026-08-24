"""
Graph Verifier — NetworkX-based directed graph analysis.

Performs:
- Cycle detection (Tarjan's algorithm via nx.simple_cycles)
- Reachability analysis (BFS from START)
- Dead-end detection (nodes with no outgoing edges except END)
- Topological sort validation
- Dependency validation (all referenced deps exist)
"""

import logging
import networkx as nx
from app.schemas.workflow import WorkflowIR
from app.schemas.verification import Violation

logger = logging.getLogger(__name__)


def _build_graph(ir: WorkflowIR) -> nx.DiGraph:
    """Build a NetworkX DiGraph from the WorkflowIR."""
    G = nx.DiGraph()

    # Add nodes
    for node in ir.nodes:
        G.add_node(node.id, label=node.label, node_type=node.node_type, role=node.role)

    # Add edges
    for edge in ir.edges:
        G.add_edge(edge.source, edge.target, label=edge.label, edge_type=edge.edge_type)

    return G


def verify_graph(ir: WorkflowIR) -> list[Violation]:
    """Run all graph verification checks and return violations."""
    violations: list[Violation] = []
    G = _build_graph(ir)

    # ----------------------------------------------------------------------- #
    # 1. Cycle Detection
    # ----------------------------------------------------------------------- #
    try:
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            # Filter out trivial self-loops if any
            if len(cycle) < 2:
                continue

            cycle_str = " → ".join(cycle) + " → " + cycle[0]
            node_labels = []
            for nid in cycle:
                data = G.nodes.get(nid, {})
                node_labels.append(data.get("label", nid))
            label_str = " -> ".join(node_labels) + " -> " + node_labels[0]

            violations.append(Violation(
                check_type="graph",
                severity="critical",
                problem=f"Circular dependency detected: {' -> '.join(cycle)} -> {cycle[0]}.",
                cause=(
                    f"Steps {label_str} form a cycle where each step depends on the other. "
                    f"This creates an infinite loop — no step in the cycle can ever start."
                ),
                suggested_fix=(
                    f"Break the cycle by removing one dependency. For example, remove the "
                    f"dependency from '{node_labels[-1]}' to '{node_labels[0]}'."
                ),
                metadata={
                    "cycle_node_ids": cycle,
                    "cycle_labels": [G.nodes.get(n, {}).get("label", n) for n in cycle],
                },
            ))
    except Exception as e:
        logger.error(f"Cycle detection failed: {e}")

    # ----------------------------------------------------------------------- #
    # 2. Reachability Analysis (from START)
    # ----------------------------------------------------------------------- #
    if G.has_node("START"):
        reachable = set(nx.descendants(G, "START")) | {"START"}
        all_nodes = set(G.nodes())
        unreachable = all_nodes - reachable

        for node_id in unreachable:
            if node_id in ("START", "END"):
                continue
            node_data = G.nodes.get(node_id, {})
            label = node_data.get("label", node_id)
            violations.append(Violation(
                check_type="graph",
                severity="high",
                problem=f"Unreachable step: '{label}' cannot be reached from the start of the workflow.",
                cause=(
                    f"There is no path from START to '{label}'. This step will never execute."
                ),
                suggested_fix=(
                    f"Add a dependency edge from an earlier step to '{label}', "
                    f"or remove it if it's no longer needed."
                ),
                metadata={"step_id": node_id, "label": label},
            ))

    # ----------------------------------------------------------------------- #
    # 3. Dead-End Detection
    # ----------------------------------------------------------------------- #
    for node_id in G.nodes():
        if node_id in ("START", "END"):
            continue
        successors = list(G.successors(node_id))
        if not successors:
            node_data = G.nodes.get(node_id, {})
            label = node_data.get("label", node_id)
            violations.append(Violation(
                check_type="graph",
                severity="medium",
                problem=f"Dead-end step: '{label}' has no outgoing transitions.",
                cause=(
                    f"The step '{label}' does not lead to any subsequent step or END node. "
                    f"The workflow would stall here."
                ),
                suggested_fix=(
                    f"Connect '{label}' to the next step in the workflow or to the END node."
                ),
                metadata={"step_id": node_id, "label": label},
            ))

    # ----------------------------------------------------------------------- #
    # 4. Topological Sort Validation
    # ----------------------------------------------------------------------- #
    if not cycles:
        try:
            topo_order = list(nx.topological_sort(G))
            logger.info(f"Valid topological order: {topo_order}")
        except nx.NetworkXUnfeasible:
            violations.append(Violation(
                check_type="graph",
                severity="critical",
                problem="Workflow graph has no valid execution order.",
                cause="The graph contains cycles that prevent determining a valid topological ordering.",
                suggested_fix="Remove circular dependencies to establish a clear execution sequence.",
                metadata={},
            ))

    # ----------------------------------------------------------------------- #
    # 5. Dependency Validation
    # ----------------------------------------------------------------------- #
    step_ids = {step.id for step in ir.steps}
    for step in ir.steps:
        for dep_id in step.dependencies:
            if dep_id not in step_ids:
                violations.append(Violation(
                    check_type="graph",
                    severity="critical",
                    problem=f"Step '{step.action}' depends on unknown step '{dep_id}'.",
                    cause=f"The dependency '{dep_id}' does not match any defined step ID.",
                    suggested_fix=f"Check the dependency list for '{step.action}'. Valid step IDs: {', '.join(sorted(step_ids))}.",
                    metadata={"step_id": step.id, "missing_dep": dep_id},
                ))

    # ----------------------------------------------------------------------- #
    # 6. END Reachability
    # ----------------------------------------------------------------------- #
    if G.has_node("END"):
        # Check that END is reachable from START
        if G.has_node("START"):
            try:
                if not nx.has_path(G, "START", "END"):
                    violations.append(Violation(
                        check_type="graph",
                        severity="high",
                        problem="The END node is not reachable from START.",
                        cause="There is no complete path through the workflow from beginning to end.",
                        suggested_fix="Ensure all workflow branches eventually connect to the END node.",
                        metadata={},
                    ))
            except nx.NetworkXError:
                pass  # Graph issues handled by cycle detection

    return violations


def get_topological_order(ir: WorkflowIR) -> list[str]:
    """Return the topological sort order if the graph is a DAG."""
    G = _build_graph(ir)
    try:
        return list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        return []


def get_graph_stats(ir: WorkflowIR) -> dict:
    """Return graph statistics for display."""
    G = _build_graph(ir)
    return {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "is_dag": nx.is_directed_acyclic_graph(G),
        "density": round(nx.density(G), 4),
        "has_cycles": not nx.is_directed_acyclic_graph(G),
    }
