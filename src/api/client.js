import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── JWT Token Interceptor ────────────────────────────────────────────────────
// Automatically attach the stored Bearer token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vf_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Existing API Functions (unchanged) ──────────────────────────────────────

export const verifyPolicy = async (policyText, scenario = null) => {
  const response = await api.post('/verify', { policy_text: policyText, scenario });
  return response.data;
};

export const verifyVendor = async (vendorName) => {
  const response = await api.post('/vendor/verify', { vendor_name: vendorName });
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

// ─── Authentication API ───────────────────────────────────────────────────────

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  const { access_token, user } = response.data;
  // Persist token in localStorage for session restoration
  localStorage.setItem('vf_access_token', access_token);
  return user;
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('vf_access_token');
  if (!token) return null;
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch {
    // Token expired or invalid — clear it
    localStorage.removeItem('vf_access_token');
    return null;
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors — always clear client-side token
  }
  localStorage.removeItem('vf_access_token');
};

// ─── Approval Request API ─────────────────────────────────────────────────────

export const createApprovalRequest = async ({ workflowId, policyText, workflowName, verificationId }) => {
  const response = await api.post('/approval-requests', {
    workflow_id: workflowId,
    policy_text: policyText,
    workflow_name: workflowName,
    verification_id: verificationId,
  });
  return response.data;
};

export const getApprovalRequests = async () => {
  const response = await api.get('/approval-requests');
  return response.data;
};

export const getApprovalRequest = async (requestId) => {
  const response = await api.get(`/approval-requests/${requestId}`);
  return response.data;
};

export const approveRequest = async (requestId) => {
  const response = await api.post(`/approval-requests/${requestId}/approve`);
  return response.data;
};

export const rejectRequest = async (requestId, rejectionReason = '') => {
  const response = await api.post(`/approval-requests/${requestId}/reject`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
};
