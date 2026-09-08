import { useEffect, useState, useCallback } from 'react';
import { getEvaluationQueue, analyzeEvaluation, routeEvaluation } from '../../services/adminEvalService';
import { getErrorMessage } from '../../lib/api';
import type { EvaluationCycleResponse, EvaluationStatus } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';

export default function EvaluationQueuePage() {
  const [cycles, setCycles] = useState<EvaluationCycleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | ''>('');

  const [actionLoading, setActionLoading] = useState<string | null>(null); // cycleId

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getEvaluationQueue(page, size, statusFilter || undefined);
      setCycles(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [page, size, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleAction = async (cycleId: string, action: 'analyze' | 'route') => {
    setActionLoading(cycleId);
    try {
      if (action === 'analyze') await analyzeEvaluation(cycleId);
      if (action === 'route') await routeEvaluation(cycleId);
      void load();
    } catch (e) {
      alert('Action failed: ' + getErrorMessage(e));
    } finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Evaluation Queue</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">Manage evaluation cycles</p>
        </div>
        <button onClick={load} className="p-2 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC]"><span className="material-symbols-outlined text-[18px]">sync</span></button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as EvaluationStatus | ''); setPage(0); }} className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px]">
          <option value="">All Statuses</option>
          <option value="RECEIVED">RECEIVED</option>
          <option value="ANALYZING">ANALYZING</option>
          <option value="ROUTING">ROUTING</option>
          <option value="EVALUATION_IN_PROGRESS">IN PROGRESS</option>
          <option value="EVALUATION_COMPLETED">COMPLETED</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading && cycles.length === 0 ? (
          <div className="p-12 flex justify-center"><LoadingSpinner /></div>
        ) : error ? (
          <div className="p-6"><ErrorPanel message={error} onRetry={load} /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Cycle ID</th>
                    <th className="px-4 py-3">Problem ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {cycles.map(c => (
                    <tr key={c.cycleId} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-mono-code font-semibold text-[#0A2540]">{c.cycleId.substring(0,8)}</td>
                      <td className="px-4 py-3 font-mono-code text-[#475569]">{c.problemId}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-[#64748B]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {c.status === 'RECEIVED' && (
                            <button disabled={actionLoading === c.cycleId} onClick={() => handleAction(c.cycleId, 'analyze')} className="text-[12px] font-semibold bg-[#0A2540] text-white px-2 py-1 rounded hover:bg-[#1E3A8A] disabled:opacity-50">Analyze</button>
                          )}
                          {c.status === 'ANALYZING' && (
                            <button disabled={actionLoading === c.cycleId} onClick={() => handleAction(c.cycleId, 'route')} className="text-[12px] font-semibold bg-[#1E3A8A] text-white px-2 py-1 rounded hover:bg-[#1e40af] disabled:opacity-50">Route</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cycles.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No cycles found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} size={size} totalElements={totalElements} onPageChange={setPage} onSizeChange={setSize} />
          </>
        )}
      </div>
    </div>
  );
}
