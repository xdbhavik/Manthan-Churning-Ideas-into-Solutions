import React, { useState } from 'react';
import { ProjectReview, ProjectReviewStatus } from '../types';
import { downloadFile } from '../services/portalService';
import { getErrorMessage } from '../lib/api';
import { triggerTricolorConfetti } from '../lib/confetti';

interface ReviewWorkbenchProps {
  workItems: ProjectReview[];
  selectedItemId: string;
  onSelectItem: (id: string) => void;
  onCommitDecision: (reviewId: string, decision: 'ACCEPTED' | 'RETURNED', comment: string) => Promise<void>;
}

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export const ReviewWorkbench: React.FC<ReviewWorkbenchProps> = ({
  workItems,
  selectedItemId,
  onSelectItem,
  onCommitDecision,
}) => {
  const [filter, setFilter] = useState<'ALL' | ProjectReviewStatus>('ALL');
  const [determination, setDetermination] = useState<'ACCEPTED' | 'RETURNED'>('ACCEPTED');
  const [remarks, setRemarks] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected =
    workItems.find((r) => r.reviewId === selectedItemId) || workItems[0];

  const filtered = filter === 'ALL' ? workItems : workItems.filter((r) => r.reviewStatus === filter);

  const statusColor = (s: ProjectReviewStatus) =>
    s === 'ASSIGNED'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : s === 'ACCEPTED'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-600 border border-red-200';

  const openConfirm = () => {
    if (determination === 'RETURNED' && !remarks.trim()) {
      setError('Please provide remarks before returning a submission.');
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await onCommitDecision(selected.reviewId, determination, remarks.trim() || undefined);
      setNotice(`Decision recorded: ${determination}.`);
      if (determination === 'ACCEPTED') triggerTricolorConfetti();
      setConfirmOpen(false);
      setRemarks('');
      setDetermination('ACCEPTED');
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 page-enter">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col max-w-3xl">
          <h1 className="font-headline text-[26px] font-bold text-[#0A2540] tracking-tight">
            Project Review Queue
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
            Submissions routed to you from the innovation portal. Download artifacts, review, then ACCEPT or
            RETURN with a decision note.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          <span className="material-symbols-outlined text-[15px] text-amber-600">pending</span>
          <span className="font-semibold text-amber-700">{workItems.filter((r) => r.reviewStatus === 'ASSIGNED').length} pending</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left queue */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {(['ALL', 'ASSIGNED', 'ACCEPTED', 'RETURNED'] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-lg transition-colors ${filter === s ? 'bg-[#0A2540] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E5E7EB]'}`} type="button">{s}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {filtered.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-[#E5E7EB] animate-fadeInUp">
                <div className="w-12 h-12 rounded-xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mx-auto mb-3">
                  <span className="material-symbols-outlined text-[28px]">fact_check</span>
                </div>
                <p className="text-[12px] text-[#64748B]">No reviews in this state.</p>
              </div>
            )}
            {filtered.map((item) => {
              const isSelected = item.reviewId === selected?.reviewId;
              return (
                <div
                  key={item.reviewId}
                  onClick={() => onSelectItem(item.reviewId)}
                  className={`bg-white rounded-xl p-3.5 border cursor-pointer transition-all relative overflow-hidden card-hover ${isSelected ? 'border-[#0A2540] ring-2 ring-[#0A2540]/10' : 'border-[#E5E7EB] hover:border-[#94A3B8]'}`}
                >
                  <div className="pl-1 flex flex-col">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[#0A2540] truncate">{item.submissionTitle || 'Submission'}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${statusColor(item.reviewStatus)}`}>{item.reviewStatus}</span>
                    </div>
                    <h4 className="font-semibold text-[13px] text-[#1E293B] line-clamp-2 leading-snug">{item.problemTitle}</h4>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
                      <span>Round {item.submissionRound}</span>
                      <span className="text-[#94A3B8]">{item.submittedFiles.length} file(s)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right dossier */}
        {selected ? (
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#0A2540]">Round {selected.submissionRound}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${statusColor(selected.reviewStatus)}`}>{selected.reviewStatus}</span>
                </div>
                <h1 className="font-headline text-[20px] font-bold text-[#0A2540] tracking-tight">{selected.submissionTitle}</h1>
                <div className="text-[13px] text-[#64748B] mt-1 leading-relaxed">{selected.problemTitle}</div>
                {selected.submissionSummary && <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">{selected.submissionSummary}</p>}
              </div>
            </div>

            {(selected.githubUrl || selected.additionalLinks.length > 0) && (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Links</h3>
                {selected.githubUrl && (
                  <a href={selected.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#0A2540] hover:underline truncate">GitHub: {selected.githubUrl}</a>
                )}
                {selected.additionalLinks.map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#0A2540] hover:underline truncate">{l}</a>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Artifacts</h3>
                <span className="font-mono text-[11px] text-[#94A3B8]">{selected.submittedFiles.length} file(s)</span>
              </div>
              <div className="divide-y divide-[#F1F5F9] border border-[#E5E7EB] rounded-xl overflow-hidden">
                {selected.submittedFiles.length === 0 && <div className="p-6 text-center text-[12px] text-[#94A3B8]">No artifacts attached.</div>}
                {selected.submittedFiles.map((file) => (
                  <div key={file.fileId} className="p-3 flex items-center justify-between hover:bg-[#F7F8FC] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#0A2540] flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">description</span></div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[12px] font-bold text-[#1E293B]">{file.originalName}</span>
                        <span className="text-[11px] text-[#94A3B8]">SHA-256: <code className="font-mono">{file.sha256.substring(0, 12)}…</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#64748B]">{fmtBytes(file.sizeBytes)}</span>
                      <button
                        onClick={() => downloadFile(file.fileId, file.originalName).catch((e) => setError(getErrorMessage(e)))}
                        className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#0A2540] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selected.reviewStatus === 'ASSIGNED' ? (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-4">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Review Decision</h3>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F1F5F9] rounded-xl">
                  <button onClick={() => setDetermination('ACCEPTED')} className={`py-2 rounded-lg text-[12px] font-semibold transition-all ${determination === 'ACCEPTED' ? 'bg-[#0A2540] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0A2540]'}`} type="button">ACCEPT</button>
                  <button onClick={() => setDetermination('RETURNED')} className={`py-2 rounded-lg text-[12px] font-semibold transition-all ${determination === 'RETURNED' ? 'bg-red-600 text-white shadow-sm' : 'text-[#64748B] hover:text-red-600'}`} type="button">RETURN</button>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Decision Remarks {determination === 'RETURNED' ? '(required)' : '(optional)'}</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[12px] leading-relaxed focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 transition-all" />
                </div>
                <button onClick={openConfirm} className="px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#163B65] text-white font-semibold text-[13px] transition-colors shadow-sm" type="button">
                  Commit Decision
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Decided — {selected.reviewStatus}</h3>
                <p className="text-[12px] text-[#64748B]">{selected.existingDecisionComment || 'No comment.'}</p>
                {selected.decisionAt && <span className="text-[11px] text-[#94A3B8]">{new Date(selected.decisionAt).toLocaleString()}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-xl p-12 text-center border border-[#E5E7EB] animate-fadeInUp">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mx-auto mb-3">
              <span className="material-symbols-outlined text-[32px]">fact_check</span>
            </div>
            <p className="text-[13px] text-[#64748B]">No project reviews in your queue.</p>
          </div>
        )}
      </div>

      {confirmOpen && selected && (
        <div className="fixed inset-0 bg-[#0A2540]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E7EB] flex flex-col gap-4 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-[16px] font-bold text-[#0A2540]">Confirm Review Decision</h3>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Record <strong className="text-[#0A2540]">{determination}</strong> for{' '}
              <strong className="text-[#0A2540]">{selected.submissionTitle || 'this submission'}</strong>. The decision is
              pushed back to the innovation portal.
            </p>
            {remarks && <p className="text-[12px] text-[#64748B] bg-[#F7F8FC] p-2.5 rounded-xl border border-[#E5E7EB]">{remarks}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setConfirmOpen(false)} className="px-3.5 py-2 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] text-[12px] font-semibold transition-colors" type="button">Cancel</button>
              <button onClick={handleConfirm} disabled={busy} className="px-4 py-2 rounded-xl bg-[#0A2540] text-white font-semibold text-[12px] hover:bg-[#163B65] disabled:opacity-60 transition-colors" type="button">{busy ? 'Recording…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};