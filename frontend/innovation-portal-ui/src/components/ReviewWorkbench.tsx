import React, { useState } from 'react';
import { ProjectReview, ProjectReviewStatus } from '../types';
import { downloadFile } from '../services/portalService';
import { getErrorMessage } from '../lib/api';

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
      ? 'bg-[#ffdfa0] text-[#795900]'
      : s === 'ACCEPTED'
      ? 'bg-[#dce9ff] text-[#00152f]'
      : 'bg-[#ffdad6] text-[#ba1a1a]';

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
    <div className="flex flex-col w-full pb-16">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col max-w-3xl">
          <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">
            Project Review Queue
          </h1>
          <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
            Submissions routed to you from the innovation portal. Download artifacts, review, then ACCEPT or
            RETURN with a decision note.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[#43474e]">
          {workItems.filter((r) => r.reviewStatus === 'ASSIGNED').length} pending
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left queue */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e2e8f0]">
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {(['ALL', 'ASSIGNED', 'ACCEPTED', 'RETURNED'] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`px-2 py-0.5 rounded transition-colors ${filter === s ? 'bg-[#00152f] text-white' : 'bg-[#eff4ff] text-[#43474e] hover:bg-[#dce9ff]'}`} type="button">{s}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#74777f] bg-white rounded-xl border border-[#e2e8f0]">No reviews in this state.</div>
            )}
            {filtered.map((item) => {
              const isSelected = item.reviewId === selected?.reviewId;
              return (
                <div
                  key={item.reviewId}
                  onClick={() => onSelectItem(item.reviewId)}
                  className={`bg-white rounded-xl p-3.5 shadow-xs border cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'border-[#00152f] ring-2 ring-[#00152f]/10 shadow-sm' : 'border-[#e2e8f0] hover:border-[#cbd5e1]'}`}
                >
                  <div className="pl-1 flex flex-col">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[#00152f]">{item.submissionTitle || 'Submission'}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${statusColor(item.reviewStatus)}`}>{item.reviewStatus}</span>
                    </div>
                    <h4 className="font-semibold text-[13px] text-[#0b1c30] line-clamp-2 leading-snug">{item.problemTitle}</h4>
                    <div className="flex items-center justify-between text-[11px] text-[#43474e] mt-2 pt-2 border-t border-[#f1f5f9]">
                      <span>Round {item.submissionRound}</span>
                      <span className="text-[#74777f]">{item.submittedFiles.length} file(s)</span>
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
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#eff4ff] text-[#00152f]">Round {selected.submissionRound}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${statusColor(selected.reviewStatus)}`}>{selected.reviewStatus}</span>
                </div>
                <h1 className="font-headline text-[20px] font-bold text-[#0b1c30] tracking-tight">{selected.submissionTitle}</h1>
                <div className="text-[13px] text-[#43474e] mt-1 leading-relaxed">{selected.problemTitle}</div>
                {selected.submissionSummary && <p className="text-[13px] text-[#43474e] mt-2 leading-relaxed">{selected.submissionSummary}</p>}
              </div>
            </div>

            {(selected.githubUrl || selected.additionalLinks.length > 0) && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Links</h3>
                {selected.githubUrl && (
                  <a href={selected.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#00152f] hover:underline truncate">GitHub: {selected.githubUrl}</a>
                )}
                {selected.additionalLinks.map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#00152f] hover:underline truncate">{l}</a>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Artifacts</h3>
                <span className="font-mono text-[11px] text-[#74777f]">{selected.submittedFiles.length} file(s)</span>
              </div>
              <div className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-lg overflow-hidden">
                {selected.submittedFiles.length === 0 && <div className="p-6 text-center text-[12px] text-[#74777f]">No artifacts attached.</div>}
                {selected.submittedFiles.map((file) => (
                  <div key={file.fileId} className="p-3 flex items-center justify-between hover:bg-[#f8f9ff] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#eff4ff] text-[#00152f] flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">description</span></div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[12px] font-bold text-[#0b1c30]">{file.originalName}</span>
                        <span className="text-[11px] text-[#74777f]">SHA-256: <code className="font-mono">{file.sha256.substring(0, 12)}…</code></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#43474e]">{fmtBytes(file.sizeBytes)}</span>
                      <button
                        onClick={() => downloadFile(file.fileId, file.originalName).catch((e) => setError(getErrorMessage(e)))}
                        className="px-2.5 py-1 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00152f] text-[11px] font-semibold flex items-center gap-1 transition-colors"
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
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-4">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Review Decision</h3>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#eff4ff] rounded-lg border border-[#dce9ff]">
                  <button onClick={() => setDetermination('ACCEPTED')} className={`py-1.5 rounded text-[12px] font-semibold transition-all ${determination === 'ACCEPTED' ? 'bg-[#00152f] text-white shadow-xs' : 'text-[#43474e]'}`} type="button">ACCEPT</button>
                  <button onClick={() => setDetermination('RETURNED')} className={`py-1.5 rounded text-[12px] font-semibold transition-all ${determination === 'RETURNED' ? 'bg-[#ba1a1a] text-white shadow-xs' : 'text-[#43474e]'}`} type="button">RETURN</button>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Decision Remarks {determination === 'RETURNED' ? '(required)' : '(optional)'}</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[12px] leading-relaxed focus:outline-none focus:bg-white" />
                </div>
                <button onClick={openConfirm} className="px-4 py-2 rounded-lg bg-[#00152f] hover:bg-[#0f2a4a] text-white font-semibold text-[13px] transition-colors shadow-xs" type="button">
                  Commit Decision
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Decided — {selected.reviewStatus}</h3>
                <p className="text-[12px] text-[#43474e]">{selected.existingDecisionComment || 'No comment.'}</p>
                {selected.decisionAt && <span className="text-[11px] text-[#74777f]">{new Date(selected.decisionAt).toLocaleString()}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-xl p-12 text-center text-[#74777f]">
            No project reviews in your queue.
          </div>
        )}
      </div>

      {confirmOpen && selected && (
        <div className="fixed inset-0 bg-[#00152f]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-[16px] font-bold text-[#0b1c30]">Confirm Review Decision</h3>
            <p className="text-[12px] text-[#43474e] leading-relaxed">
              Record <strong className="text-[#0b1c30]">{determination}</strong> for{' '}
              <strong className="text-[#0b1c30]">{selected.submissionTitle || 'this submission'}</strong>. The decision is
              pushed back to the innovation portal.
            </p>
            {remarks && <p className="text-[12px] text-[#43474e] bg-[#eff4ff] p-2.5 rounded border border-[#dce9ff]">{remarks}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-1.5 rounded-lg text-[#43474e] hover:bg-[#eff4ff] text-[12px] font-semibold" type="button">Cancel</button>
              <button onClick={handleConfirm} disabled={busy} className="px-4 py-1.5 rounded-lg bg-[#00152f] text-white font-semibold text-[12px] hover:bg-[#0f2a4a] disabled:opacity-60" type="button">{busy ? 'Recording…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};