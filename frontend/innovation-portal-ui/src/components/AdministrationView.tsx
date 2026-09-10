import React, { useState } from 'react';
import { EvaluationCycle } from '../types';
import { getErrorMessage } from '../lib/api';

interface AdministrationViewProps {
  cycles: EvaluationCycle[];
  onPublish: (cycleId: string) => Promise<void>;
}

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

const statusColor: Record<string, string> = {
  EVALUATION_COMPLETED: 'bg-[#dce9ff] text-[#00152f]',
  SCORES_AGGREGATED: 'bg-[#dce9ff] text-[#00152f]',
  PRIORITIZED: 'bg-[#cce5ff] text-[#001d31]',
  PHASE_3_READY: 'bg-[#cce5ff] text-[#001d31]',
  RECEIVED: 'bg-[#eff4ff] text-[#74777f]',
  ANALYZING: 'bg-[#ffdfa0] text-[#5c4300]',
  ROUTING: 'bg-[#ffdfa0] text-[#5c4300]',
  EVALUATION_IN_PROGRESS: 'bg-[#ffdfa0] text-[#5c4300]',
  ANALYSIS_FAILED: 'bg-[#ffdad6] text-[#ba1a1a]',
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col w-full pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col max-w-3xl">
          <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">
            Cycles & Portal Publish
          </h1>
          <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
            Evaluation cycles for problems. Cycles that reach EVALUATION_COMPLETED are auto-published to the
            portal; use the action below to manually retry a publish (idempotent).
          </p>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[#43474e]">
          {publishable.length} publishable · {cycles.length} total
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-[#cce5ff] border border-[#99cbff] text-[#002c47] flex items-center justify-between text-[13px] font-semibold">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">verified</span><span>{notice}</span></div>
          <button onClick={() => setNotice(null)}><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] flex items-center justify-between text-[13px] font-semibold">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">error</span><span>{error}</span></div>
          <button onClick={() => setError(null)}><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}

      <div className="w-full bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
        {cycles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#74777f] mb-4 mx-auto">
              <span className="material-symbols-outlined text-[36px]">sync_problem</span>
            </div>
            <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">No Evaluation Cycles</h3>
            <p className="text-[13px] text-[#43474e] max-w-lg mx-auto mt-1 leading-relaxed">
              Evaluation cycles are created when a registered problem is started for evaluation. Once a cycle
              completes, it appears here and can be published to the innovation portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#43474e] text-[11px] uppercase tracking-wider font-bold border-b border-[#e2e8f0]">
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Final Score</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[13px] text-[#0b1c30]">
                {cycles.map((c) => (
                  <tr key={c.cycleId} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] font-bold text-[#00152f]">{shortId(c.cycleId)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${statusColor[c.status] || 'bg-[#eff4ff] text-[#74777f]'}`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px]">{c.finalScore ?? '—'}</td>
                    <td className="py-3 px-3 text-[12px] text-[#43474e]">{new Date(c.startedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePublish(c.cycleId)}
                        disabled={busyId === c.cycleId || !publishable.some((p) => p.cycleId === c.cycleId)}
                        className={`px-3 py-1 rounded text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${publishable.some((p) => p.cycleId === c.cycleId) ? 'bg-[#00152f] text-white hover:bg-[#0f2a4a]' : 'bg-[#eff4ff] text-[#74777f]'}`}
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