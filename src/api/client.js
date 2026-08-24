import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const verifyPolicy = async (policyText, scenario = null) => {
  const response = await api.post('/verify', { policy_text: policyText, scenario });
  return response.data;
};

export const parsePolicy = async (policyText, scenario = null) => {
  const response = await api.post('/parse', { policy_text: policyText, scenario });
  return response.data;
};

export const getScenarios = async () => {
  const response = await api.get('/scenarios');
  return response.data;
};

export const runScenario = async (scenarioId) => {
  const response = await api.post(`/scenarios/${scenarioId}`);
  return response.data;
};

export const getWhatIfScenarios = async () => {
  const response = await api.get('/what-if/scenarios');
  return response.data;
};

export const runWhatIf = async (workflowIr, scenarioId) => {
  const response = await api.post('/what-if', { workflow_ir: workflowIr, scenario_id: scenarioId });
  return response.data;
};

export const createExecution = async (workflowIr, verificationId = null) => {
  const response = await api.post('/execute/create', {
    workflow_ir: workflowIr,
    verification_id: verificationId,
  });
  return response.data;
};

export const stepExecution = async (workflowId) => {
  const response = await api.post('/execute/step', { workflow_id: workflowId });
  return response.data;
};

export const approveExecutionStep = async (workflowId, approved = true, userRole = 'Finance Manager') => {
  const response = await api.post('/execute/approve', {
    workflow_id: workflowId,
    approved,
    user_role: userRole,
  });
  return response.data;
};

export const resetExecution = async (workflowId) => {
  const response = await api.post('/execute/reset', { workflow_id: workflowId });
  return response.data;
};

export const getExecutionState = async (workflowId) => {
  const response = await api.get(`/execute/state/${workflowId}`);
  return response.data;
};

export const getComplianceRules = async () => {
  const response = await api.get('/compliance-rules');
  return response.data;
};

export const createComplianceRule = async (rule) => {
  const response = await api.post('/compliance-rules', rule);
  return response.data;
};

export const toggleComplianceRule = async (ruleId) => {
  const response = await api.patch(`/compliance-rules/${ruleId}/toggle`);
  return response.data;
};

export const deleteComplianceRule = async (ruleId) => {
  const response = await api.delete(`/compliance-rules/${ruleId}`);
  return response.data;
};

export const getRbacMatrix = async () => {
  const response = await api.get('/rbac/matrix');
  return response.data;
};

export const getAuditLogs = async () => {
  const response = await api.get('/audit-logs');
  return response.data;
};

export const getWorkflows = async () => {
  const response = await api.get('/workflows');
  return response.data;
};

export const saveWorkflow = async (payload) => {
  const response = await api.post('/workflows/save', payload);
  return response.data;
};

export const deleteWorkflow = async (workflowId) => {
  const response = await api.delete(`/workflows/${workflowId}`);
  return response.data;
};

export const getWorkflowVersions = async (workflowId) => {
  const response = await api.get(`/workflows/${workflowId}/versions`);
  return response.data;
};
