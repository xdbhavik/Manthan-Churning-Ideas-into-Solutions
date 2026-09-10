import React, { useState } from 'react';
import { Submission, SubmissionStatus, SubmissionMetaRequest, SubmissionFile } from '../types';
import { downloadFile } from '../services/portalService';
import { getErrorMessage } from '../lib/api';

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
      ? 'bg-[#ffdfa0] text-[#795900]'
      : s === 'RETURNED'
      ? 'bg-[#ffdad6] text-[#ba1a1a]'
      : s === 'ACCEPTED'
      ? 'bg-[#dce9ff] text-[#00152f]'
      : 'bg-[#eff4ff] text-[#74777f]';

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="bg-[#eff4ff] border-b border-[#dce9ff] -mx-6 -mt-6 mb-5 px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#795900]"></span>
          <span className="text-[#0b1c30] font-semibold">SIH-2026 Innovation Portal</span>
          <span className="text-[#74777f]">|</span>
          <span className="text-[#43474e]">Submissions Dossier</span>
        </div>
        <div className="text-[#74777f]">
          {submissions.length} submission{submissions.length === 1 ? '' : 's'}
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-[#cce5ff] border border-[#99cbff] text-[#002c47] flex items-center justify-between text-[13px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">verified</span>
            <span>{notice}</span>
          </div>
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
        {/* Left: list */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-[15px] font-bold text-[#0b1c30]">My Submissions</h2>
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-[#eff4ff] text-[#00152f]">{submissions.length}</span>
              </div>
              <button onClick={onNewSubmissionClick} className="px-2.5 py-1 rounded bg-[#00152f] hover:bg-[#0f2a4a] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors" type="button">
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>New</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#74777f] text-[18px]">search</span>
              <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Filter by title, team or id…" className="w-full pl-8 pr-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded text-[12px] text-[#0b1c30] placeholder:text-[#74777f] focus:outline-none focus:bg-white" type="text" />
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {['ALL', 'DRAFT', 'UNDER_REVIEW', 'RETURNED', 'ACCEPTED'].map((st) => (
                <button key={st} onClick={() => setFilterStatus(st)} className={`px-2 py-0.5 rounded transition-colors ${filterStatus === st ? 'bg-[#00152f] text-white' : 'bg-[#eff4ff] text-[#43474e] hover:bg-[#dce9ff]'}`} type="button">
                  {st === 'UNDER_REVIEW' ? 'IN REVIEW' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredSubmissions.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#74777f] bg-white rounded-xl border border-[#e2e8f0]">No submissions.</div>
            )}
            {filteredSubmissions.map((sub) => {
              const isSelected = sub.submissionId === selectedSubmission?.submissionId;
              return (
                <div
                  key={sub.submissionId}
                  onClick={() => onSelectSubmission(sub.submissionId)}
                  className={`bg-white rounded-xl p-3.5 shadow-xs border cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'border-[#00152f] ring-2 ring-[#00152f]/10 shadow-sm' : 'border-[#e2e8f0] hover:border-[#cbd5e1]'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${sub.status === 'UNDER_REVIEW' ? 'bg-[#795900]' : sub.status === 'RETURNED' ? 'bg-[#ba1a1a]' : sub.status === 'ACCEPTED' ? 'bg-[#002c47]' : 'bg-[#94a3b8]'}`}></div>
                  <div className="pl-2 flex flex-col">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[#00152f]">{shortId(sub.submissionId)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${statusColor(sub.status)}`}>{sub.status === 'UNDER_REVIEW' ? 'UNDER REVIEW' : sub.status}</span>
                    </div>
                    <h4 className="font-semibold text-[13px] text-[#0b1c30] line-clamp-1 leading-snug">{sub.title || 'Untitled submission'}</h4>
                    <div className="flex items-center justify-between text-[11px] text-[#43474e] mt-2 pt-2 border-t border-[#f1f5f9]">
                      <span className="truncate max-w-[140px]">{sub.team?.name || 'Individual'}</span>
                      <span className="text-[#74777f]">R{sub.reviewRound}</span>
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
              <div className="p-4 rounded-xl bg-[#ffdfa0]/50 border border-[#ffdfa0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#5c4300]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#ffdfa0] flex items-center justify-center text-[#795900] shrink-0"><span className="material-symbols-outlined text-[20px]">hourglass_top</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Under Review</h3>
                    <p className="text-[12px] text-[#795900] leading-snug mt-0.5">Your submission is with the assigned evaluator. Round {selectedSubmission.reviewRound}.</p>
                  </div>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'RETURNED' && (
              <div className="p-4 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#93000a]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#ffb4ab] flex items-center justify-center text-[#ba1a1a] shrink-0"><span className="material-symbols-outlined text-[20px]">warning</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Returned — Remedy Required</h3>
                    <p className="text-[12px] text-[#93000a] leading-snug mt-0.5"><strong>Evaluator note:</strong> {selectedSubmission.decisionComment || 'No comment provided.'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="px-3 py-1.5 rounded bg-white text-[#93000a] font-semibold text-[12px] border border-[#ffb4ab] hover:bg-[#fff] transition-colors" type="button">Edit</button>
                  <button onClick={handleSubmit} disabled={busy} className="px-3.5 py-1.5 rounded bg-[#ba1a1a] text-white font-semibold text-[12px] hover:bg-[#93000a] transition-colors shrink-0 flex items-center gap-1 disabled:opacity-60" type="button">
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                    <span>Resubmit Round {selectedSubmission.reviewRound + 1}</span>
                  </button>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'ACCEPTED' && (
              <div className="p-4 rounded-xl bg-[#dce9ff] border border-[#b2d3ff] flex items-center gap-2.5 text-[#00152f]">
                <div className="w-9 h-9 rounded-lg bg-[#00152f] flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-[20px]">verified</span></div>
                <div>
                  <h3 className="font-bold text-[13px] uppercase tracking-wide">Accepted</h3>
                  <p className="text-[12px] text-[#0b1c30] leading-snug mt-0.5">{selectedSubmission.decisionComment || 'Your proposal was accepted by the evaluator.'}</p>
                </div>
              </div>
            )}
            {selectedSubmission.status === 'DRAFT' && (
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#0b1c30]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#00152f] shrink-0"><span className="material-symbols-outlined text-[20px]">edit_note</span></div>
                  <div>
                    <h3 className="font-bold text-[13px] uppercase tracking-wide">Draft — Not Yet Submitted</h3>
                    <p className="text-[12px] text-[#43474e] leading-snug mt-0.5">Finalize files and meta, then submit for review.</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="px-3 py-1.5 rounded bg-white text-[#00152f] font-semibold text-[12px] border border-[#dce9ff] transition-colors" type="button">Edit</button>
                  <button onClick={handleSubmit} disabled={busy} className="px-3.5 py-1.5 rounded bg-[#00152f] text-white font-semibold text-[12px] hover:bg-[#0f2a4a] transition-colors shrink-0 disabled:opacity-60" type="button">Submit for Review</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#00152f] text-white">{shortId(selectedSubmission.submissionId)}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#eff4ff] text-[#00152f]">{selectedSubmission.status}</span>
                </div>
                <h1 className="font-headline text-[20px] font-bold text-[#0b1c30] tracking-tight">{selectedSubmission.title || 'Untitled submission'}</h1>
                {selectedSubmission.summary && <p className="text-[13px] text-[#43474e] mt-1.5 leading-relaxed max-w-2xl">{selectedSubmission.summary}</p>}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-[#74777f]">
                  <span>Team: <strong className="text-[#0b1c30]">{selectedSubmission.team?.name || 'Individual'}</strong></span>
                  <span>•</span>
                  <span>Round: <strong className="text-[#0b1c30]">{selectedSubmission.reviewRound}</strong></span>
                  {selectedSubmission.submittedAt && (
                    <>
                      <span>•</span>
                      <span>Submitted: <strong className="text-[#0b1c30]">{new Date(selectedSubmission.submittedAt).toLocaleString()}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {editing && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#00152f] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Edit Submission</h3>
                  <button onClick={() => setEditing(false)} className="text-[#74777f]"><span className="material-symbols-outlined text-[20px]">close</span></button>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Title</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[13px] focus:outline-none focus:bg-white" type="text" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Abstract</label>
                  <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[12px] focus:outline-none focus:bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">GitHub</label>
                  <input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg font-mono text-[12px] text-[#0b1c30] focus:outline-none focus:bg-white" type="text" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveEdit} disabled={busy} className="px-4 py-2 rounded-lg bg-[#00152f] text-white font-semibold text-[12px] disabled:opacity-60" type="button">{busy ? 'Saving…' : 'Save Changes'}</button>
                  <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg text-[#43474e] hover:bg-[#eff4ff] text-[12px] font-semibold" type="button">Cancel</button>
                </div>
              </div>
            )}

            {/* Team */}
            {selectedSubmission.team && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Team Roster ({selectedSubmission.team.name})</h3>
                  <span className="text-[11px] text-[#74777f]">{selectedSubmission.team.members.length} member(s)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedSubmission.team.members.map((mem) => (
                    <div key={mem.participantId} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
                      <span className="font-bold text-[13px] text-[#0b1c30]">{mem.fullName}</span>
                      <div className="font-mono text-[10px] text-[#74777f] mt-1">{mem.participantId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(selectedSubmission.githubUrl || selectedSubmission.links.length > 0) && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-2">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">External Links</h3>
                {selectedSubmission.githubUrl && (
                  <a href={selectedSubmission.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#00152f] hover:underline truncate">GitHub: {selectedSubmission.githubUrl}</a>
                )}
                {selectedSubmission.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className="font-mono text-[12px] font-bold text-[#00152f] hover:underline truncate">{l.label}: {l.url}</a>
                ))}
              </div>
            )}

            {/* Files */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Attached Files</h3>
                <span className="font-mono text-[11px] text-[#74777f]">{selectedSubmission.files.length} file(s)</span>
              </div>

              {editable && (
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" multiple />
                  <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="px-3 py-1.5 rounded bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00152f] text-[12px] font-semibold flex items-center gap-1 disabled:opacity-60" type="button">
                    <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                    Upload File
                  </button>
                </div>
              )}

              <div className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-lg overflow-hidden">
                {selectedSubmission.files.length === 0 && (
                  <div className="p-6 text-center text-[12px] text-[#74777f]">No files attached.</div>
                )}
                {selectedSubmission.files.map((file) => (
                  <div key={file.fileId} className="p-3 flex items-center justify-between hover:bg-[#f8f9ff] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#eff4ff] text-[#00152f] flex items-center justify-center font-bold text-[11px]">
                        <span className="material-symbols-outlined text-[18px]">description</span>
                      </div>
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
                      {editable && (
                        <button onClick={() => onDeleteFile(selectedSubmission.submissionId, file.fileId).catch((e) => setError(getErrorMessage(e)))} className="text-[#ba1a1a] hover:opacity-80" type="button" title="Delete file">
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
          <div className="lg:col-span-8 bg-white rounded-xl p-12 text-center text-[#74777f]">
            Select a submission from the list to view its dossier.
          </div>
        )}
      </div>
    </div>
  );
};