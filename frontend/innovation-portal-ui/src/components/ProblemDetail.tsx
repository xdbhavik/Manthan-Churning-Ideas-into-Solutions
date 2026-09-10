import React, { useState, useRef } from 'react';
import {
  PublishedProblem,
  Participant,
  Submission,
  SubmissionCreateRequest,
  SubmissionMetaRequest,
} from '../types';
import { getErrorMessage } from '../lib/api';

interface ProblemDetailProps {
  problem: PublishedProblem;
  participant: Participant | null;
  existingSubmission?: Submission;
  onBack: () => void;
  onViewSubmission: (sub: Submission) => void;
  onCreateSubmission: (req: SubmissionCreateRequest) => Promise<Submission>;
  onUpdateMeta: (subId: string, req: SubmissionMetaRequest) => Promise<Submission>;
  onSubmitSubmission: (subId: string) => Promise<Submission>;
  onUploadFile: (subId: string, file: File) => Promise<void>;
  onDeleteFile: (subId: string, fileId: string) => Promise<void>;
}

const BUCKET_LABEL: Record<string, string> = {
  GOVT: 'GOVT',
  CITIZEN: 'CITIZEN',
  INDUSTRY: 'INDUSTRY',
  COMMUNITY: 'COMMUNITY',
  HEI: 'HEI',
};

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

export const ProblemDetail: React.FC<ProblemDetailProps> = ({
  problem,
  participant,
  existingSubmission,
  onBack,
  onViewSubmission,
  onCreateSubmission,
  onUpdateMeta,
  onSubmitSubmission,
  onUploadFile,
  onDeleteFile,
}) => {
  const editable = existingSubmission && ['DRAFT', 'RETURNED'].includes(existingSubmission.status);

  const [isSolo, setIsSolo] = useState<boolean>(false);
  const [teamName, setTeamName] = useState<string>('');
  const [memberIds, setMemberIds] = useState<string>('');
  const [submissionTitle, setSubmissionTitle] = useState<string>(existingSubmission?.title || '');
  const [summary, setSummary] = useState<string>(existingSubmission?.summary || '');
  const [repoUrl, setRepoUrl] = useState<string>(existingSubmission?.githubUrl || '');
  const [demoUrl, setDemoUrl] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const links = demoUrl.trim() ? [{ label: 'Demo / Media', url: demoUrl.trim() }] : [];

  const addPendingFiles = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((cur) => [...cur, ...Array.from(files)]);
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((cur) => cur.filter((_, i) => i !== idx));
  };

  const doCreate = async (submit: boolean): Promise<Submission> => {
    const req: SubmissionCreateRequest = {
      problemId: problem.problemId,
      title: submissionTitle.trim() || undefined,
      summary: summary.trim() || undefined,
      githubUrl: repoUrl.trim() || undefined,
      links: links.length ? links : undefined,
      teamName: isSolo ? undefined : teamName.trim() || undefined,
      memberUserIds: isSolo
        ? undefined
        : memberIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    };
    const created = await onCreateSubmission(req);
    // upload any pending files onto the draft
    for (const f of pendingFiles) {
      await onUploadFile(created.submissionId, f);
    }
    setPendingFiles([]);
    if (submit) {
      return await onSubmitSubmission(created.submissionId);
    }
    return created;
  };

  const handleSave = async (submit: boolean) => {
    setError(null);
    setNotice(null);
    if (!submit && !acceptedTerms) {
      setError('Please certify and accept the terms of original intellectual work before submitting.');
      return;
    }
    if (submit && !submissionTitle.trim()) {
      setError('Please provide a submission title.');
      return;
    }
    setBusy(true);
    try {
      if (existingSubmission && editable) {
        await onUpdateMeta(existingSubmission.submissionId, {
          title: submissionTitle.trim() || undefined,
          summary: summary.trim() || undefined,
          githubUrl: repoUrl.trim() || undefined,
          links: links.length ? links : [],
        });
        for (const f of pendingFiles) {
          await onUploadFile(existingSubmission.submissionId, f);
        }
        setPendingFiles([]);
        if (submit) {
          await onSubmitSubmission(existingSubmission.submissionId);
        }
        setNotice(submit ? 'Submission advanced to review.' : 'Changes saved to your submission.');
      } else if (!existingSubmission) {
        await doCreate(submit);
        setNotice(submit ? 'Proposal submitted for jury evaluation!' : 'Draft saved to My Submissions.');
      } else {
        setError('This submission is not editable (only DRAFT or RETURNED can be edited).');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <nav className="flex items-center gap-1.5 text-[#74777f] text-[11px] uppercase tracking-wider font-semibold">
          <button onClick={onBack} className="flex items-center gap-1 hover:text-[#00152f] transition-colors" type="button">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Catalog</span>
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="font-mono text-[#00152f] font-bold">{shortId(problem.problemId)}</span>
        </nav>

        <div className="flex items-center gap-2">
          {existingSubmission && (
            <button
              onClick={() => onViewSubmission(existingSubmission)}
              className="px-3 py-1.5 rounded-lg bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00152f] text-[12px] font-semibold flex items-center gap-1 transition-colors border border-[#dce9ff]"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span>View Dossier</span>
            </button>
          )}
          <button
            onClick={scrollToForm}
            className="px-3.5 py-1.5 rounded-lg bg-[#00152f] hover:bg-[#0f2a4a] text-white text-[12px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">edit_document</span>
            <span>{editable ? 'Edit Submission' : 'Start a Submission'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-[#cce5ff] border border-[#99cbff] text-[#002c47] flex items-center justify-between text-[13px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-[#002c47]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] flex items-center justify-between text-[13px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[#93000a]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {existingSubmission && !editable && (
        <div className="mb-4 p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#0b1c30]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#00152f] shrink-0">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <div>
              <h3 className="font-bold text-[13px] uppercase tracking-wide">{existingSubmission.status}</h3>
              <p className="text-[12px] text-[#43474e] leading-snug mt-0.5">
                You already have a submission for this problem in {existingSubmission.status}. Open the dossier
                to track its review status.
              </p>
            </div>
          </div>
          <button onClick={() => onViewSubmission(existingSubmission)} className="px-3.5 py-1.5 rounded bg-[#00152f] text-white font-semibold text-[12px] hover:bg-[#0f2a4a] transition-colors shrink-0" type="button">
            Open Submission
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: problem specification */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="rounded-xl bg-[#00152f] text-white p-6 relative overflow-hidden shadow-sm">
            <div className="relative z-10 flex flex-col">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/20 text-white font-bold tracking-wide">{shortId(problem.problemId)}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#ffc641] text-[#00152f] font-bold">{BUCKET_LABEL[problem.sourceBucket ?? ''] || problem.sourceBucket}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-[#dce9ff]">{problem.accessRule}</span>
              </div>
              <h1 className="font-headline text-[22px] sm:text-[24px] font-bold tracking-tight text-white leading-snug mb-2">{problem.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/15 text-[11px] text-[#dce9ff]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#ffc641]">policy</span>
                  <span>{problem.urgency || '—'} · {problem.severity || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>Published {new Date(problem.publishedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">attachment</span>
                  <span>{problem.evidenceCount} evidence items</span>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
            <h2 className="font-headline text-[16px] font-bold text-[#0b1c30]">Problem Statement</h2>
            <p className="text-[13px] text-[#43474e] leading-relaxed whitespace-pre-line">{problem.description}</p>
          </section>

          {problem.expectedOutcome && (
            <section className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <h2 className="font-headline text-[16px] font-bold text-[#0b1c30]">Expected Outcome</h2>
              <p className="text-[13px] text-[#43474e] leading-relaxed">{problem.expectedOutcome}</p>
            </section>
          )}

          <section className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
            <h2 className="font-headline text-[16px] font-bold text-[#0b1c30]">Domains</h2>
            <div className="flex flex-wrap gap-1.5">
              {problem.domains.map((d) => (
                <span key={d} className="px-2.5 py-1 rounded bg-[#eff4ff] text-[#00152f] text-[12px] font-medium border border-[#dce9ff]">{d}</span>
              ))}
            </div>
          </section>

          {problem.accessRule === 'SELECTED_UNIVERSITIES' && problem.accessUniversities && problem.accessUniversities.length > 0 && (
            <section className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <h2 className="font-headline text-[16px] font-bold text-[#0b1c30]">Selected Institutions</h2>
              <div className="flex flex-wrap gap-1.5">
                {problem.accessUniversities.map((u) => (
                  <span key={u} className="px-2.5 py-1 rounded bg-[#cce5ff] text-[#001d31] text-[12px] font-medium border border-[#99cbff]">{u}</span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: proposal drawer */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <span className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Administrative Governance</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#795900] bg-[#ffdfa0]/60 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-[#795900]"></span>Published
              </span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#74777f]">Problem ID:</span>
                <span className="font-mono text-[#00152f] font-semibold">{shortId(problem.problemId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74777f]">Access Rule:</span>
                <span className="font-semibold text-[#0b1c30]">{problem.accessRule}</span>
              </div>
              <div className="pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] text-[#74777f] uppercase font-semibold">Submitting as:</span>
                <p className="text-[11px] text-[#43474e] mt-0.5 leading-snug">
                  {participant?.fullName || 'You'} · {participant?.participantType || '—'}
                  {participant?.institutionName ? ` · ${participant.institutionName}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div ref={formRef} className="bg-white rounded-xl p-5 shadow-sm border border-[#e2e8f0] flex flex-col gap-4 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div>
                <h3 className="font-headline text-[16px] font-bold text-[#0b1c30]">
                  {editable ? 'Edit Submission' : 'Proposal Submission'}
                </h3>
                <span className="text-[11px] text-[#74777f]">{editable ? `Status: ${existingSubmission!.status} · Round ${existingSubmission!.reviewRound}` : 'Create a new proposal'}</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#eff4ff] text-[#00152f] font-bold">SIH-2026</span>
            </div>

            {!existingSubmission && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Submission Modality</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#eff4ff] rounded-lg border border-[#dce9ff]">
                  <button onClick={() => setIsSolo(false)} className={`py-1 rounded text-[12px] font-semibold transition-all ${!isSolo ? 'bg-white shadow-xs text-[#00152f]' : 'text-[#74777f]'}`} type="button">Collegiate Team</button>
                  <button onClick={() => setIsSolo(true)} className={`py-1 rounded text-[12px] font-semibold transition-all ${isSolo ? 'bg-white shadow-xs text-[#00152f]' : 'text-[#74777f]'}`} type="button">Individual / Solo</button>
                </div>
              </div>
            )}

            {!existingSubmission && !isSolo && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Team Name</label>
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[13px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" type="text" placeholder="e.g. Team Garuda" />
                <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider mt-1">Teammate Participant IDs (optional)</label>
                <input value={memberIds} onChange={(e) => setMemberIds(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg font-mono text-[12px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" type="text" placeholder="comma-separated participant UUIDs" />
                <p className="text-[10px] text-[#74777f] leading-snug">Each teammate must already be a registered portal participant and able to see this problem.</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Submission Title</label>
              <input value={submissionTitle} onChange={(e) => setSubmissionTitle(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[13px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" type="text" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Executive Abstract</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="w-full px-3 py-2 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[12px] leading-relaxed focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Public Repository / GitHub</label>
              <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg font-mono text-[12px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" type="text" placeholder="https://github.com/org/repo" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Demo / Media Link (optional)</label>
              <input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} className="w-full px-3 py-1.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg font-mono text-[12px] text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00152f]" type="text" placeholder="https://your-demo.sih.gov.in" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">Technical Dossier Files (PDF, ZIP, CSV, JSON — up to 50MB each)</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addPendingFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className="p-3 border-2 border-dashed border-[#dce9ff] hover:border-[#00152f] rounded-lg bg-[#f8f9ff] text-center cursor-pointer transition-colors"
              >
                <input ref={fileInputRef} type="file" onChange={(e) => addPendingFiles(e.target.files)} className="hidden" accept=".pdf,.zip,.csv,.json" multiple />
                <span className="material-symbols-outlined text-[24px] text-[#74777f]">cloud_upload</span>
                <p className="text-[12px] font-semibold text-[#0b1c30] mt-1">Drag & drop files here, or click to browse</p>
              </div>

              {pendingFiles.map((f, idx) => (
                <div key={idx} className="mt-1.5 p-2 rounded bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <span className="material-symbols-outlined text-[15px] text-[#00152f]">description</span>
                    <span className="font-mono truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[#74777f]">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <button onClick={() => removePendingFile(idx)} className="text-[#ba1a1a] hover:opacity-80" type="button">
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {editable && existingSubmission!.files.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-[#74777f] uppercase">Attached</span>
                  {existingSubmission!.files.map((file) => (
                    <div key={file.fileId} className="p-2 rounded bg-[#f8f9ff] border border-[#e2e8f0] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <span className="material-symbols-outlined text-[15px] text-[#00152f]">description</span>
                        <span className="font-mono truncate">{file.originalName}</span>
                      </div>
                      <button onClick={() => onDeleteFile(existingSubmission!.submissionId, file.fileId)} className="text-[#ba1a1a] hover:opacity-80" type="button">
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-[#f1f5f9]">
              <input id="terms-check" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 rounded text-[#00152f] focus:ring-[#00152f]" />
              <label htmlFor="terms-check" className="text-[11px] text-[#43474e] leading-snug cursor-pointer">
                We certify that this submission represents original intellectual work and complies with SIH 2026 IP Guidelines.
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleSave(false)}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00152f] font-semibold text-[12px] transition-colors border border-[#dce9ff] disabled:opacity-60"
                type="button"
              >
                {editable ? 'Save Changes' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-[#00152f] hover:bg-[#0f2a4a] text-white font-semibold text-[12px] transition-colors shadow-xs flex items-center justify-center gap-1 disabled:opacity-60"
                type="button"
              >
                {busy ? <span>Working…</span> : <><span>{editable && existingSubmission!.status === 'RETURNED' ? 'Resubmit' : 'Submit Proposal'}</span><span className="material-symbols-outlined text-[15px]">send</span></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};