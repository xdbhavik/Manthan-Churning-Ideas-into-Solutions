import React, { useState } from 'react';
import { EvaluationCycle } from '../types';
import { getErrorMessage } from '../lib/api';
import { triggerTricolorConfetti } from '../lib/confetti';

interface AdministrationViewProps {
  cycles: EvaluationCycle[];
  onPublish: (cycleId: string) => Promise<void>;
}

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

const statusColor: Record<string, string> = {
  EVALUATION_COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SCORES_AGGREGATED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PRIORITIZED: 'bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE]',
  PHASE_3_READY: 'bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE]',
  RECEIVED: 'bg-[#F1F5F9] text-[#64748B] border border-[#E5E7EB]',
  ANALYZING: 'bg-amber-50 text-amber-700 border border-amber-200',
  ROUTING: 'bg-amber-50 text-amber-700 border border-amber-200',
  EVALUATION_IN_PROGRESS: 'bg-amber-50 text-amber-700 border border-amber-200',
  ANALYSIS_FAILED: 'bg-red-50 text-red-600 border border-red-200',
};

export const AdministrationView: React.FC<AdministrationViewProps> = ({ cycles, onPublish }) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const publishable = cycles.filter((c) =>
    ['EVALUATION_COMPLETED', 'SCORES_AGGREGATED', 'PRIORITIZED', 'PHASE_3_READY'].includes(c.status)
  );

  const handlePublish = async (cycleId: string) => {
    setBusyId(cycleId);
    setError(null);
    setNotice(null);
    try {
      await onPublish(cycleId);
      setNotice(`Cycle ${shortId(cycleId)} published to the portal.`);
      triggerTricolorConfetti('Cycle Published to National Portal');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 page-enter">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col max-w-3xl">
          <h1 className="font-headline text-[26px] font-bold text-[#0A2540] tracking-tight">
            Cycles & Portal Publish
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
            Evaluation cycles for problems. Cycles that reach completion are auto-published to the
            portal; use the action below to manually retry a publish.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[#64748B]">
          <span className="font-semibold text-[#138808]">{publishable.length}</span> publishable · <span className="font-semibold">{cycles.length}</span> total
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-[13px] font-semibold animate-slideDown">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">check_circle</span><span>{notice}</span></div>
          <button onClick={() => setNotice(null)} className="text-emerald-600"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-[13px] font-semibold animate-slideDown">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">error</span><span>{error}</span></div>
          <button onClick={() => setError(null)} className="text-red-500"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}

      <div className="w-full bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {cycles.length === 0 ? (
          <div className="p-12 text-center animate-fadeInUp">
            <div className="w-16 h-16 rounded-2xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mb-4 mx-auto">
              <span className="material-symbols-outlined text-[36px]">sync_problem</span>
            </div>
            <h3 className="font-headline text-[18px] font-bold text-[#0A2540]">No Evaluation Cycles</h3>
            <p className="text-[13px] text-[#64748B] max-w-lg mx-auto mt-1 leading-relaxed">
              Evaluation cycles are created when a registered problem is started for evaluation. Once a cycle
              completes, it appears here and can be published to the innovation portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F7F8FC] text-[#64748B] text-[11px] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Final Score</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[13px] text-[#1E293B]">
                {cycles.map((c) => (
                  <tr key={c.cycleId} className="hover:bg-[#F7F8FC] transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] font-bold text-[#0A2540]">{shortId(c.cycleId)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${statusColor[c.status] || 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E5E7EB]'}`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px]">{c.finalScore ?? '—'}</td>
                    <td className="py-3 px-3 text-[12px] text-[#64748B]">{new Date(c.startedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePublish(c.cycleId)}
                        disabled={busyId === c.cycleId || !publishable.some((p) => p.cycleId === c.cycleId)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${publishable.some((p) => p.cycleId === c.cycleId) ? 'bg-[#0A2540] text-white hover:bg-[#163B65]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}
                        type="button"
                      >
                        {busyId === c.cycleId ? 'Publishing…' : 'Publish to Portal'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};