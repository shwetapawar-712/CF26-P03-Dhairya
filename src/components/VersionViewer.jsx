import React, { useState, useEffect } from 'react';
import { Clock, X, RefreshCw } from 'lucide-react';
import { getWorkflowVersions } from '../api/client';

export default function VersionViewer({ workflowId = 1, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkflowVersions(workflowId)
      .then((res) => setVersions(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [workflowId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
      <div className="vf-bg-card border vf-border rounded-xl shadow-2xl max-w-3xl w-full p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b vf-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold vf-text-primary">Workflow Version History</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="vf-text-secondary hover:vf-text-primary cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="py-4 overflow-y-auto space-y-2 flex-1">
          {loading ? (
            <div className="p-8 text-center vf-text-secondary font-mono">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" /> Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center vf-text-tertiary italic">No previous versions recorded.</div>
          ) : (
            <div className="space-y-2">
              {versions.map((ver) => (
                <div key={ver.id} className="p-3 vf-bg-editor rounded border vf-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold vf-text-primary text-xs">Version v{ver.version_number || ver.id}</span>
                    <span className="vf-text-tertiary text-[10px] font-mono">{ver.created_at || 'Saved'}</span>
                  </div>
                  <p className="vf-text-secondary text-[11px] font-mono line-clamp-2">{ver.policy_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {onClose && (
          <div className="pt-3 border-t vf-border flex justify-end">
            <button onClick={onClose} className="btn btn-secondary text-xs cursor-pointer">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
