import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCycle, analyzeEvaluation, routeEvaluation, publishToPortal } from '../../services/adminEvalService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { EvaluationCycleResponse } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';

export default function CycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<EvaluationCycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true); setError(null);
    try {
      setCycle(await getCycle(cycleId));
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, [cycleId]);

  useEffect(() => { void load(); }, [load]);

  const handleAction = async (action: 'analyze' | 'route' | 'publish') => {
    if (!cycleId) return;
    setActionLoading(action);
    try {
      if (action === 'analyze') await analyzeEvaluation(cycleId);
      if (action === 'route') await routeEvaluation(cycleId);
      if (action === 'publish') await publishToPortal(cycleId);
      await load();
    } catch (e) {
      alert(`Action failed: ${getErrorMessage(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading cycle details…" /></div>;
  if (error) return <div className="p-6 max-w-4xl mx-auto"><ErrorPanel status={error.status} message={error.msg} onRetry={load} /></div>;
  if (!cycle) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/evaluation/queue')} className="flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0A2540] font-semibold transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Queue
        </button>
        <button onClick={load} className="p-2 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] text-[#64748B]">
          <span className="material-symbols-outlined text-[18px]">sync</span>
        </button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Cycle Details</h1>
          <StatusBadge status={cycle.status} />
        </div>
        <div className="flex items-center gap-3 text-[13px] text-[#64748B] font-mono-code mb-4 border-b border-[#E2E8F0] pb-4">
          <span>ID: {cycle.cycleId}</span>
          <span>Problem: {cycle.problemId}</span>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[16px] font-bold text-[#0A2540]">Actions & History</h2>
          <Link to={`/evaluation/cycles/${cycle.cycleId}/history`} className="text-[13px] font-semibold text-[#1E40AF] hover:underline flex items-center gap-1">
            View History <span className="material-symbols-outlined text-[16px]">history</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <button
            disabled={actionLoading !== null || !['RECEIVED', 'ANALYSIS_FAILED'].includes(cycle.status)}
            onClick={() => handleAction('analyze')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded hover:bg-[#1E3A8A] disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'analyze' ? <LoadingSpinner size="sm" /> : <span className="material-symbols-outlined text-[16px]">analytics</span>}
            Run AI Analysis
          </button>
          
          <button
            disabled={actionLoading !== null || cycle.status !== 'ROUTING'}
            onClick={() => handleAction('route')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-[13px] font-semibold rounded hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'route' ? <LoadingSpinner size="sm" /> : <span className="material-symbols-outlined text-[16px]">route</span>}
            Manual Route
          </button>

          <button
            disabled={actionLoading !== null || !['EVALUATION_COMPLETED', 'SCORES_AGGREGATED', 'PRIORITIZED'].includes(cycle.status)}
            onClick={() => handleAction('publish')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#0A2540] text-[13px] font-semibold rounded hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'publish' ? <LoadingSpinner size="sm" /> : <span className="material-symbols-outlined text-[16px]">publish</span>}
            Publish to Portal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0A2540] mb-3">Cycle Meta</h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#64748B]">Trigger:</span> <span className="font-medium text-[#0A2540]">{cycle.triggerMethod}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Version:</span> <span className="font-medium text-[#0A2540]">{cycle.version}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Created:</span> <span className="font-medium text-[#0A2540]">{new Date(cycle.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Updated:</span> <span className="font-medium text-[#0A2540]">{new Date(cycle.updatedAt).toLocaleString()}</span></div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0A2540] mb-3">Evaluation Results</h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#64748B]">Final Score:</span> <span className="font-medium text-[#0A2540]">{cycle.finalScore ?? 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Impact Level:</span> <span className="font-medium text-[#0A2540]">{cycle.impactLevel || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Priority Score:</span> <span className="font-medium text-[#0A2540]">{cycle.priorityScore ?? 'N/A'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
