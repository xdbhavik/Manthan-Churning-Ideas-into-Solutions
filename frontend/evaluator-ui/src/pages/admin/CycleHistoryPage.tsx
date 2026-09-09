import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCycleHistory } from '../../services/adminEvalService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { EvaluationStatusHistoryResponse } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';

export default function CycleHistoryPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();

  const [history, setHistory] = useState<EvaluationStatusHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true); setError(null);
    try {
      setHistory(await getCycleHistory(cycleId));
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, [cycleId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading history…" /></div>;
  if (error) return <div className="p-6 max-w-3xl mx-auto"><ErrorPanel status={error.status} message={error.msg} onRetry={load} /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(`/evaluation/cycles/${cycleId}`)} className="flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0A2540] font-semibold transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Cycle Details
        </button>
        <button onClick={load} className="p-2 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] text-[#64748B]">
          <span className="material-symbols-outlined text-[18px]">sync</span>
        </button>
      </div>

      <div>
        <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Cycle History</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5 font-mono-code">Cycle ID: {cycleId}</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
        {history.length === 0 ? (
          <div className="text-center py-8 text-[#64748B] text-[14px]">No history records found for this cycle.</div>
        ) : (
          <div className="relative border-l-2 border-[#E2E8F0] ml-4 space-y-8">
            {history.map((record) => (
              <div key={record.historyId} className="relative pl-6">
                <div className="absolute w-4 h-4 bg-white border-2 border-[#0A2540] rounded-full -left-[9px] top-1"></div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={record.toStatus} />
                    <span className="text-[12px] text-[#64748B] font-medium">{new Date(record.changedAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-[13px] mt-1">
                    <div className="flex items-center gap-2 text-[#475569] mb-1">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span>Changed by: <span className="font-mono-code font-semibold">{record.changedByUserId}</span></span>
                    </div>
                    {record.fromStatus && (
                      <div className="text-[#64748B]">
                        Previous Status: <span className="font-semibold">{record.fromStatus}</span>
                      </div>
                    )}
                    {record.comment && (
                      <div className="mt-2 text-[#0A2540] whitespace-pre-wrap italic">
                        "{record.comment}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
