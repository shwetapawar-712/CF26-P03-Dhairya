import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlayCircle, ShieldCheck, HelpCircle, CheckCircle, Flag } from 'lucide-react';

// Light Theme Custom Node Components
const StartNode = () => (
  <div className="px-4 py-2 rounded-full bg-emerald-50 border-2 border-emerald-600 text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-1.5 min-w-[90px] justify-center">
    <PlayCircle className="w-4 h-4 text-emerald-600" />
    <span>START</span>
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-emerald-600" />
  </div>
);

const EndNode = () => (
  <div className="px-4 py-2 rounded-full bg-slate-100 border-2 border-slate-500 text-slate-800 text-xs font-bold shadow-sm flex items-center gap-1.5 min-w-[90px] justify-center">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-500" />
    <Flag className="w-4 h-4 text-slate-600" />
    <span>END</span>
  </div>
);

const ActionNode = ({ data }) => (
  <div className="px-4 py-3 rounded-xl bg-white border-2 border-indigo-200 text-slate-900 text-xs shadow-md min-w-[170px]">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-indigo-500" />
    <div className="flex items-center justify-between mb-1.5">
      <span className="font-bold text-sm text-slate-900 leading-snug">{data.label}</span>
    </div>
    {data.role && (
      <span className="badge badge-blue text-[10px] py-0.5 px-2">
        {data.role}
      </span>
    )}
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-indigo-500" />
  </div>
);

const ApprovalNode = ({ data }) => (
  <div className="px-4 py-3 rounded-xl bg-purple-50/80 border-2 border-purple-400 text-purple-950 text-xs shadow-md min-w-[180px]">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-purple-600" />
    <div className="flex items-center gap-1.5 mb-1.5">
      <ShieldCheck className="w-4 h-4 text-purple-600" />
      <span className="font-bold text-sm text-purple-950 leading-snug">{data.label}</span>
    </div>
    {data.role && (
      <span className="badge badge-purple text-[10px] py-0.5 px-2">
        Role: {data.role}
      </span>
    )}
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-purple-600" />
  </div>
);

const DecisionNode = ({ data }) => (
  <div className="px-4 py-3 rounded-xl bg-amber-50/80 border-2 border-amber-400 text-amber-950 text-xs shadow-md min-w-[170px]">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-amber-600" />
    <div className="flex items-center gap-1.5 mb-1">
      <HelpCircle className="w-4 h-4 text-amber-600" />
      <span className="font-bold text-sm text-amber-950 leading-snug">{data.label}</span>
    </div>
    {data.role && (
      <span className="badge badge-yellow text-[10px] py-0.5 px-2">
        {data.role}
      </span>
    )}
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-amber-600" />
  </div>
);

export default function WorkflowGraphVisualizer({ graphData, workflowIr, executionState }) {
  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      end: EndNode,
      action: ActionNode,
      approval: ApprovalNode,
      decision: DecisionNode,
    }),
    []
  );

  // Construct dynamic graph nodes and edges if graphData is absent but workflowIr exists
  const activeGraph = useMemo(() => {
    if (graphData?.nodes?.length > 0) return graphData;
    if (!workflowIr?.steps?.length) return null;

    const steps = workflowIr.steps;
    const nodes = [
      { id: 'START', type: 'start', position: { x: 250, y: 0 }, data: { label: 'START' } },
    ];
    const edges = [];

    let prevId = 'START';
    steps.forEach((step, idx) => {
      const type = step.approval_required ? 'approval' : 'action';
      const y = (idx + 1) * 110;
      nodes.push({
        id: step.id,
        type,
        position: { x: 250, y },
        data: { label: step.action, role: step.role },
      });

      if (step.dependencies && step.dependencies.length > 0) {
        step.dependencies.forEach((dep) => {
          edges.push({
            id: `${dep}-${step.id}`,
            source: dep,
            target: step.id,
            type: 'default',
            animated: step.approval_required,
          });
        });
      } else {
        edges.push({
          id: `${prevId}-${step.id}`,
          source: prevId,
          target: step.id,
          type: 'default',
          animated: step.approval_required,
        });
      }
      prevId = step.id;
    });

    nodes.push({
      id: 'END',
      type: 'end',
      position: { x: 250, y: (steps.length + 1) * 110 },
      data: { label: 'END' },
    });
    edges.push({
      id: `${prevId}-END`,
      source: prevId,
      target: 'END',
      type: 'default',
      animated: false,
    });

    return { nodes, edges };
  }, [graphData, workflowIr]);

  if (!activeGraph || !activeGraph.nodes || activeGraph.nodes.length === 0) {
    return (
      <div className="saas-card p-6 text-center text-slate-500 min-h-[300px] flex items-center justify-center">
        <p className="text-xs">No workflow graph generated yet. Run a valid policy through the pipeline to compile the graph.</p>
      </div>
    );
  }

  // Format edges
  const formattedEdges = (activeGraph.edges || []).map((e) => ({
    ...e,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: e.animated ? '#6366f1' : '#64748b',
    },
    style: {
      strokeWidth: 2,
      stroke: e.animated ? '#6366f1' : '#94a3b8',
    },
    labelStyle: { fill: '#475569', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', rx: 4, ry: 4 },
  }));

  // Update node states
  const formattedNodes = (activeGraph.nodes || []).map((n) => {
    let nodeStatus = 'pending';
    if (executionState && executionState.step_states) {
      nodeStatus = executionState.step_states[n.id] || 'pending';
    }
    return {
      ...n,
      data: {
        ...n.data,
        status: nodeStatus,
      },
    };
  });

  return (
    <div className="saas-card p-4 h-[420px] relative flex flex-col">
      <div className="flex items-center justify-between mb-2 z-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Step 08: Verified Executable Workflow Graph
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">
          {activeGraph.nodes.length} nodes · {activeGraph.edges.length} transitions
        </span>
      </div>

      <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50/60 relative">
        <ReactFlow
          nodes={formattedNodes}
          edges={formattedEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="!bg-white !border-slate-200 !text-slate-700 rounded-lg shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  );
}
