import React, { useState } from 'react';
import { Submission, SubmissionStatus, SubmissionMetaRequest, SubmissionFile } from '../types';
import { downloadFile } from '../services/portalService';
import { getErrorMessage } from '../lib/api';
import { triggerTricolorConfetti } from '../lib/confetti';

interface SubmissionsDossierProps {
  submissions: Submission[];
  selectedSubmissionId: string;
  onSelectSubmission: (id: string) => void;
  onNewSubmissionClick: () => void;
  onUpdateMeta: (subId: string, req: SubmissionMetaRequest) => Promise<Submission>;
  onSubmitSubmission: (subId: string) => Promise<Submission>;
  onUploadFile: (subId: string, file: File) => Promise<void>;
  onDeleteFile: (subId: string, fileId: string) => Promise<void>;
}

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export const SubmissionsDossier: React.FC<SubmissionsDossierProps> = ({
  submissions,
  selectedSubmissionId,
  onSelectSubmission,
  onNewSubmissionClick,
  onUpdateMeta,
  onSubmitSubmission,
  onUploadFile,
  onDeleteFile,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editGithub, setEditGithub] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedSubmission =
    submissions.find((s) => s.submissionId === selectedSubmissionId) || submissions[0];

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus !== 'ALL' && sub.status !== filterStatus) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        (sub.title || '').toLowerCase().includes(q) ||
        (sub.team?.name || '').toLowerCase().includes(q) ||
        sub.submissionId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const editable = selectedSubmission && ['DRAFT', 'RETURNED'].includes(selectedSubmission.status);

  const startEdit = () => {
    if (!selectedSubmission) return;
    setEditTitle(selectedSubmission.title || '');
    setEditSummary(selectedSubmission.summary || '');
    setEditGithub(selectedSubmission.githubUrl || '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSubmission) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdateMeta(selectedSubmission.submissionId, {
        title: editTitle.trim() || undefined,
        summary: editSummary.trim() || undefined,
        githubUrl: editGithub.trim() || undefined,
      });
      setEditing(false);
      setNotice('Submission updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubmission) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmitSubmission(selectedSubmission.submissionId);
      setNotice(selectedSubmission.status === 'RETURNED' ? 'Resubmitted for review (new round).' : 'Submitted for review.');
      triggerTricolorConfetti();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSubmission || !e.target.files) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(e.target.files)) {
        await onUploadFile(selectedSubmission.submissionId, f);
      }
      setNotice('File(s) uploaded.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const statusColor = (s: SubmissionStatus) =>
    s === 'UNDER_REVIEW'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : s === 'RETURNED'
      ? 'bg-red-50 text-red-600 border border-red-200'
      : s === 'ACCEPTED'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-[#F1F5F9] text-[#64748B] border border-[#E5E7EB]';

  const statusBar = (s: SubmissionStatus) =>
    s === 'UNDER_REVIEW' ? 'bg-amber-500' : s === 'RETURNED' ? 'bg-red-500' : s === 'ACCEPTED' ? 'bg-emerald-600' : 'bg-[#94A3B8]';

  return (
    <div className="flex flex-col w-full pb-16 page-enter">
      {/* Header bar */}
      <div className="bg-[#F7F8FC] border-b border-[#E5E7EB] -mx-6 -mt-6 mb-5 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#FF9933]" />
          <span className="text-[#0A2540] font-semibold">National Innovation Portal</span>
          <span className="text-[#94A3B8]">|</span>
          <span className="text-[#64748B]">Submissions Dossier</span>
        </div>
        <div className="text-[#94A3B8] font-mono">
          {submissions.length} submission{submissions.length === 1 ? '' : 's'}
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-[13px] font-semibold animate-slideDown">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-[13px] font-semibold animate-slideDown">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">error</span><span>{error}</span></div>
          <button onClick={() => setError(null)} className="text-red-500"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: list */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-[15px] font-bold text-[#0A2540]">My Submissions</h2>
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#0A2540]">{submissions.length}</span>
              </div>
              <button onClick={onNewSubmissionClick} className="px-2.5 py-1.5 rounded-lg bg-[#0A2540] hover:bg-[#163B65] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors" type="button">
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>New</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
              <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Filter by title, team or id…" className="w-full pl-8 pr-3 py-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-lg text-[12px] text-[#0A2540] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 transition-all" type="text" />
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {['ALL', 'DRAFT', 'UNDER_REVIEW', 'RETURNED', 'ACCEPTED'].map((st) => (
                <button key={st} onClick={() => setFilterStatus(st)} className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === st ? 'bg-[#0A2540] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E5E7EB]'}`} type="button">
                  {st === 'UNDER_REVIEW' ? 'IN REVIEW' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredSubmissions.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-[#E5E7EB] animate-fadeInUp">
                <div className="w-12 h-12 rounded-xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mx-auto mb-3">
                  <span className="material-symbols-outlined text-[28px]">folder_off</span>
                </div>
                <p className="text-[12px] text-[#64748B]">No submissions match your filter.</p>
              </div>
            )}
            {filteredSubmissions.map((sub) => {
              const isSelected = sub.submissionId === selectedSubmission?.submissionId;
              return (
                <div
                  key={sub.submissionId}
                  onClick={() => onSelectSubmission(sub.submissionId)}
                  className={`bg-white rounded-xl p-3.5 border cursor-pointer transition-all relative overflow-hidden card-hover ${isSelected ? 'border-[#0A2540] ring-2 ring-[#0A2540]/10' : 'border-[#E5E7EB] hover:border-[#94A3B8]'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full ${statusBar(sub.status)}`} />
                  <div className="pl-2 flex flex-col">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[#0A2540]">{shortId(sub.submissionId)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${statusColor(sub.status)}`}>{sub.status === 'UNDER_REVIEW' ? 'UNDER REVIEW' : sub.status}</span>
                    </div>
                    <h4 className="font-semibold text-[13px] text-[#1E293B] line-clamp-1 leading-snug">{sub.title || 'Untitled submission'}</h4>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
                      <span className="truncate max-w-[140px]">{sub.team?.name || 'Individual'}</span>
                      <span className="text-[#94A3B8]">R{sub.reviewRound}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: dossier */}
        {selectedSubmission ? (
          <div className="lg:col-span-8 flex flex-col gap-4">
            {selectedSubmission.status === 'UNDER_REVIEW' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><span className="material-symbols-outlined text-[20px]">hourglass_top</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Under Review</h3>
                    <p className="text-[12px] text-amber-700 leading-snug mt-0.5">Your submission is with the assigned evaluator. Round {selectedSubmission.reviewRound}.</p>
                  </div>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'RETURNED' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0"><span className="material-symbols-outlined text-[20px]">warning</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Returned — Remedy Required</h3>
                    <p className="text-[12px] text-red-600 leading-snug mt-0.5"><strong>Evaluator note:</strong> {selectedSubmission.decisionComment || 'No comment provided.'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-white text-red-600 font-semibold text-[12px] border border-red-200 hover:bg-red-50 transition-colors" type="button">Edit</button>
                  <button onClick={handleSubmit} disabled={busy} className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-[12px] hover:bg-red-700 transition-colors shrink-0 flex items-center gap-1 disabled:opacity-60" type="button">
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                    <span>Resubmit Round {selectedSubmission.reviewRound + 1}</span>
                  </button>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'ACCEPTED' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><span className="material-symbols-outlined text-[20px]">verified</span></div>
                <div>
                  <h3 className="font-bold text-[13px] uppercase tracking-wide">Accepted</h3>
                  <p className="text-[12px] text-emerald-700 leading-snug mt-0.5">{selectedSubmission.decisionComment || 'Your proposal was accepted by the evaluator.'}</p>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'DRAFT' && (
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#0A2540]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0A2540] shrink-0"><span className="material-symbols-outlined text-[20px]">edit_note</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Draft — Not Yet Submitted</h3>
                    <p className="text-[12px] text-[#64748B] leading-snug mt-0.5">Finalize files and meta, then submit for review.</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-white text-[#0A2540] font-semibold text-[12px] border border-[#E5E7EB] hover:bg-[#F1F5F9] transition-colors" type="button">Edit</button>
                  <button onClick={handleSubmit} disabled={busy} className="px-3.5 py-1.5 rounded-lg bg-[#0A2540] text-white font-semibold text-[12px] hover:bg-[#163B65] transition-colors shrink-0 disabled:opacity-60" type="button">Submit for Review</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0A2540] text-white">{shortId(selectedSubmission.submissionId)}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusColor(selectedSubmission.status)}`}>{selectedSubmission.status}</span>
                </div>
                <h1 className="font-headline text-[20px] font-bold text-[#0A2540] tracking-tight">{selectedSubmission.title || 'Untitled submission'}</h1>
                {selectedSubmission.summary && <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed max-w-2xl">{selectedSubmission.summary}</p>}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-[#94A3B8]">
                  <span>Team: <strong className="text-[#0A2540]">{selectedSubmission.team?.name || 'Individual'}</strong></span>
                  <span>•</span>
                  <span>Round: <strong className="text-[#0A2540]">{selectedSubmission.reviewRound}</strong></span>
                  {selectedSubmission.submittedAt && (
                    <>
                      <span>•</span>
                      <span>Submitted: <strong className="text-[#0A2540]">{new Date(selectedSubmission.submittedAt).toLocaleString()}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {editing && (
              <div className="bg-white rounded-xl p-5 border-2 border-[#0A2540] flex flex-col gap-3 animate-scaleIn">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Edit Submission</h3>
                  <button onClick={() => setEditing(false)} className="text-[#94A3B8] hover:text-[#0A2540]"><span className="material-symbols-outlined text-[20px]">close</span></button>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Title</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[13px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 transition-all" type="text" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Abstract</label>
                  <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[12px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">GitHub</label>
                  <input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} className="w-full px-3 py-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl font-mono text-[12px] text-[#0A2540] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 transition-all" type="text" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveEdit} disabled={busy} className="px-4 py-2 rounded-xl bg-[#0A2540] text-white font-semibold text-[12px] hover:bg-[#163B65] disabled:opacity-60 transition-colors" type="button">{busy ? 'Saving…' : 'Save Changes'}</button>
                  <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] text-[12px] font-semibold transition-colors" type="button">Cancel</button>
                </div>
              </div>
            )}

            {/* Team */}
            {selectedSubmission.team && (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Team Roster ({selectedSubmission.team.name})</h3>
                  <span className="text-[11px] text-[#94A3B8]">{selectedSubmission.team.members.length} member(s)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedSubmission.team.members.map((mem) => (
                    <div key={mem.participantId} className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]">
                      <span className="font-bold text-[13px] text-[#0A2540]">{mem.fullName}</span>
                      <div className="font-mono text-[10px] text-[#94A3B8] mt-1">{mem.participantId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(selectedSubmission.githubUrl || selectedSubmission.links.length > 0) && (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">External Links</h3>
                {selectedSubmission.githubUrl && (
                  <a href={selectedSubmission.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#0A2540] hover:underline truncate">GitHub: {selectedSubmission.githubUrl}</a>
                )}
                {selectedSubmission.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#0A2540] hover:underline truncate">{l.label}: {l.url}</a>
                ))}
              </div>
            )}

            {/* Files */}
            <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-[15px] font-bold text-[#0A2540]">Attached Files</h3>
                <span className="font-mono text-[11px] text-[#94A3B8]">{selectedSubmission.files.length} file(s)</span>
              </div>

              {editable && (
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" multiple />
                  <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#0A2540] text-[12px] font-semibold flex items-center gap-1 disabled:opacity-60 transition-colors" type="button">
                    <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                    Upload File
                  </button>
                </div>
              )}

              <div className="divide-y divide-[#F1F5F9] border border-[#E5E7EB] rounded-xl overflow-hidden">
                {selectedSubmission.files.length === 0 && (
                  <div className="p-6 text-center text-[12px] text-[#94A3B8]">No files attached.</div>
                )}
                {selectedSubmission.files.map((file) => (
                  <div key={file.fileId} className="p-3 flex items-center justify-between hover:bg-[#F7F8FC] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#0A2540] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">description</span>
                      </div>
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
                      {editable && (
                        <button onClick={() => onDeleteFile(selectedSubmission.submissionId, file.fileId).catch((e) => setError(getErrorMessage(e)))} className="text-red-500 hover:text-red-700 transition-colors" type="button" title="Delete file">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-xl p-12 text-center border border-[#E5E7EB] animate-fadeInUp">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mx-auto mb-3">
              <span className="material-symbols-outlined text-[32px]">folder_shared</span>
            </div>
            <p className="text-[13px] text-[#64748B]">Select a submission from the list to view its dossier.</p>
          </div>
        )}
      </div>
    </div>
  );
};