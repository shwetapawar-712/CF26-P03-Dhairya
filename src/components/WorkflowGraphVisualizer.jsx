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
import { PlayCircle, ShieldCheck, HelpCircle, Flag, Sparkles, CheckCircle2, Clock, XCircle } from 'lucide-react';

// Custom Dark Node Components
const StartNode = () => (
  <div className="px-4 py-2 rounded-full bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 min-w-[90px] justify-center">
    <PlayCircle className="w-4 h-4 text-emerald-400" />
    <span>START</span>
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-emerald-500" />
  </div>
);

const EndNode = () => (
  <div className="px-4 py-2 rounded-full bg-slate-900 border-2 border-slate-600 text-slate-300 text-xs font-bold shadow-lg flex items-center gap-1.5 min-w-[90px] justify-center">
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-500" />
    <Flag className="w-4 h-4 text-slate-400" />
    <span>END</span>
  </div>
);

const ActionNode = ({ data }) => {
  let statusBorder = 'border-[#635bff]';
  let statusIcon = null;

  if (data.status === 'completed') {
    statusBorder = 'border-emerald-500 ring-2 ring-emerald-500/30';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (data.status === 'running') {
    statusBorder = 'border-indigo-400 ring-2 ring-indigo-400/50 animate-pulse';
    statusIcon = <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />;
  } else if (data.status === 'rejected' || data.status === 'blocked') {
    statusBorder = 'border-rose-500 ring-2 ring-rose-500/40';
    statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  } else if (data.status === 'locked') {
    statusBorder = 'border-slate-600 opacity-60';
  }

  return (
    <div className={`px-4 py-3 rounded-xl vf-bg-card border-2 ${statusBorder} vf-text-primary text-xs shadow-xl min-w-[170px]`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-indigo-500" />
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-xs vf-text-primary leading-snug">{data.label}</span>
        {statusIcon}
      </div>
      {data.role && (
        <span className="badge badge-blue text-[9px] py-0.5 px-2">
          {data.role}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-indigo-500" />
    </div>
  );
};

const ApprovalNode = ({ data }) => {
  let statusBorder = 'border-purple-500';
  let statusIcon = null;

  if (data.status === 'completed') {
    statusBorder = 'border-emerald-500 ring-2 ring-emerald-500/30';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (data.status === 'waiting_for_approval') {
    statusBorder = 'border-amber-400 ring-2 ring-amber-400/60 animate-pulse';
    statusIcon = <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
  } else if (data.status === 'running') {
    statusBorder = 'border-purple-400 ring-2 ring-purple-400/50 animate-pulse';
    statusIcon = <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin" />;
  } else if (data.status === 'rejected' || data.status === 'blocked') {
    statusBorder = 'border-rose-500 ring-2 ring-rose-500/40';
    statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  } else if (data.status === 'locked') {
    statusBorder = 'border-slate-700 opacity-60';
  }

  return (
    <div className={`px-4 py-3 rounded-xl bg-purple-950/40 border-2 ${statusBorder} text-purple-100 text-xs shadow-xl min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-purple-500" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-xs text-purple-200 leading-snug">{data.label}</span>
        </div>
        {statusIcon}
      </div>
      {data.role && (
        <span className="badge badge-purple text-[9px] py-0.5 px-2">
          Role: {data.role}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-purple-500" />
    </div>
  );
};

const DecisionNode = ({ data }) => {
  let statusBorder = 'border-amber-500';
  let statusIcon = null;

  if (data.status === 'completed') {
    statusBorder = 'border-emerald-500 ring-2 ring-emerald-500/30';
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (data.status === 'rejected' || data.status === 'blocked') {
    statusBorder = 'border-rose-500 ring-2 ring-rose-500/40';
    statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  }

  return (
    <div className={`px-4 py-3 rounded-xl bg-amber-950/40 border-2 ${statusBorder} text-amber-100 text-xs shadow-xl min-w-[170px]`}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-amber-500" />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs text-amber-200 leading-snug">{data.label}</span>
        </div>
        {statusIcon}
      </div>
      {data.role && (
        <span className="badge badge-yellow text-[9px] py-0.5 px-2">
          {data.role}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-amber-500" />
    </div>
  );
};

export default function WorkflowGraphVisualizer({ graphData, workflowIr, executionState, onNodeClick }) {
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
        data: { label: step.action, role: step.role, id: step.id },
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
      <div className="w-full h-full vf-bg-primary flex flex-col items-center justify-center text-center p-6 vf-text-tertiary select-none">
        <div className="w-16 h-16 rounded-full bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="font-bold vf-text-primary text-sm mb-1">Start by Writing a Policy</h3>
        <p className="text-xs vf-text-secondary max-w-sm leading-relaxed">
          Type or select a demo policy in the left Policy Studio, then click <strong>Compile & Verify</strong> to construct your directed workflow graph.
        </p>
      </div>
    );
  }

  const formattedEdges = (activeGraph.edges || []).map((e) => ({
    ...e,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: e.animated ? '#a855f7' : '#635bff',
    },
    style: {
      strokeWidth: 2,
      stroke: e.animated ? '#a855f7' : '#635bff',
    },
  }));

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
    <div className="w-full h-full vf-bg-primary relative overflow-hidden">
      <ReactFlow
        nodes={formattedNodes}
        edges={formattedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick && onNodeClick(node)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.8}
      >
        <Background color="var(--vf-border)" gap={24} size={1} />
        <Controls className="!bg-[var(--vf-bg-card)] !border-[var(--vf-border)] !text-[var(--vf-text-primary)] rounded-lg shadow-xl" />
      </ReactFlow>
    </div>
  );
}

