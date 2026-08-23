import React, { useState } from 'react';
import ScenarioSelector from './ScenarioSelector';
import PolicyEditorIDE from './PolicyEditorIDE';
import AIInterpretationCard from './AIInterpretationCard';
import InteractivePipelineBar from './InteractivePipelineBar';
import VerificationGateView from './VerificationGateView';
import WorkflowGraphVisualizer from './WorkflowGraphVisualizer';
import ExecutionSimulator from './ExecutionSimulator';
import WhatIfPanel from './WhatIfPanel';
import CompilerTerminalConsole from './CompilerTerminalConsole';
import StageDetailModal from './StageDetailModal';

export default function CompilerStudio({
  policyText,
  onChangePolicyText,
  selectedScenario,
  onSelectScenario,
  pipelineResult,
  isLoading,
  onCompile,
  onReset,
  onApplyFixText,
  executionState,
  onExecutionChange,
}) {
  const [selectedStageForInspection, setSelectedStageForInspection] = useState(null);

  const verification = pipelineResult?.verification;
  const isVerified = verification?.passed;

  return (
    <div className="space-y-5">
      {/* Demo Scenario Selector Bar */}
      <ScenarioSelector
        selectedScenario={selectedScenario}
        onSelectScenario={onSelectScenario}
        isLoading={isLoading}
      />

      {/* Top 2-Column IDE Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <PolicyEditorIDE
            policyText={policyText}
            onChangePolicyText={onChangePolicyText}
            onCompile={onCompile}
            isLoading={isLoading}
            onReset={onReset}
            irJson={pipelineResult?.workflow_ir}
          />
        </div>

        <div className="lg:col-span-5">
          <AIInterpretationCard
            parsedPolicy={pipelineResult?.parsed_policy}
            workflowIr={pipelineResult?.workflow_ir}
          />
        </div>
      </div>

      {/* Middle 8-Stage Clickable Verification Pipeline Bar */}
      <InteractivePipelineBar
        stepsResult={pipelineResult?.steps}
        onStageClick={(stageNum) => setSelectedStageForInspection(stageNum)}
        isRunning={isLoading}
      />

      {/* Verification Gate Result View */}
      <VerificationGateView
        verification={verification}
        currentPolicyText={policyText}
        onApplyFixText={onApplyFixText}
        onExecute={() => {
          // Execute trigger
        }}
      />

      {/* Bottom Terminal Output Console */}
      <CompilerTerminalConsole
        pipelineResult={pipelineResult}
        isCompiling={isLoading}
      />

      {/* Split Graph & What-If Simulator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <WorkflowGraphVisualizer
            graphData={pipelineResult?.graph_data}
            workflowIr={pipelineResult?.workflow_ir}
            executionState={executionState}
          />
        </div>

        <div className="lg:col-span-4 space-y-5">
          <WhatIfPanel workflowIr={pipelineResult?.workflow_ir} />

          {isVerified && (
            <ExecutionSimulator
              workflowId={pipelineResult?.workflow_id}
              workflowIr={pipelineResult?.workflow_ir}
              onExecutionChange={onExecutionChange}
            />
          )}
        </div>
      </div>

      {/* Interactive Stage Inspector Modal */}
      {selectedStageForInspection && (
        <StageDetailModal
          stageNumber={selectedStageForInspection}
          pipelineResult={pipelineResult}
          onClose={() => setSelectedStageForInspection(null)}
        />
      )}
    </div>
  );
}
