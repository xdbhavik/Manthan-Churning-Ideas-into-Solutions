import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getProblem, patchStatus } from '../services/problemService';
import { verifySource, getSourceAccount } from '../services/sourceService';
import type { VerificationMethod, VerificationResult } from '../services/sourceService';
import { startEvaluation } from '../services/evaluationService';
import { getErrorMessage } from '../lib/api';
import type { ProblemStatus } from '../types';

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-[11px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`font-body-md text-body-md text-text-primary break-words ${mono ? 'font-mono-code text-body-sm bg-surface-muted px-1.5 py-0.5 rounded inline-block w-fit' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function ProblemsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProblemId = searchParams.get('id') || '';

  const [inputProblemId, setInputProblemId] = useState(queryProblemId);
  const [activeProblemId, setActiveProblemId] = useState(queryProblemId);

  const queryClient = useQueryClient();

  // Fetch Problem
  const {
    data: problem,
    isLoading: problemLoading,
    error: problemError,
    refetch: refetchProblem,
  } = useQuery({
    queryKey: ['problem', activeProblemId],
    queryFn: () => getProblem(activeProblemId),
    enabled: Boolean(activeProblemId),
  });

  // Fetch Associated Source Account if problem exists
  const { data: sourceAccount, isLoading: sourceLoading } = useQuery({
    queryKey: ['sourceAccount', problem?.sourceAccountId],
    queryFn: () => getSourceAccount(problem!.sourceAccountId!),
    enabled: Boolean(problem?.sourceAccountId),
  });

  // Action States
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ProblemStatus | null>(null);

  // Source Verification Modal / Form State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<VerificationMethod>('AUTHORIZATION_DOC');
  const [verifyResult, setVerifyResult] = useState<VerificationResult>('PASS');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyEvidenceUrl, setVerifyEvidenceUrl] = useState('');

  // Patch Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (nextStatus: ProblemStatus) => {
      if (!problem) return;
      return patchStatus(problem.problemId, nextStatus, problem.version);
    },
    onSuccess: () => {
      setActionError(null);
      setConfirmStatus(null);
      setActionSuccess('Problem status updated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['problem', activeProblemId] });
    },
    onError: (err: any) => {
      setActionSuccess(null);
      if (err.response?.status === 409) {
        setConflictModalOpen(true);
      } else {
        setActionError(err.response?.data?.message || err.message || 'Failed to update problem status');
      }
    },
  });

  // Source Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!problem?.sourceAccountId) return;
      return verifySource(
        problem.sourceAccountId,
        verifyMethod,
        verifyResult,
        verifyNotes,
        verifyEvidenceUrl
      );
    },
    onSuccess: () => {
      setShowVerifyModal(false);
      setVerifyNotes('');
      setVerifyEvidenceUrl('');
      setActionSuccess('Source identity verification recorded.');
      setTimeout(() => setActionSuccess(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['sourceAccount', problem?.sourceAccountId] });
    },
    onError: (err: any) => {
      setActionSuccess(null);
      setActionError(err.response?.data?.message || err.message || 'Failed to record verification');
    },
  });

  // Start Evaluation Mutation
  const startEvalMutation = useMutation({
    mutationFn: async () => {
      if (!problem) return;
      return startEvaluation(problem.problemId);
    },
    onSuccess: (data) => {
      if (data?.cycleId) {
        navigate(`/evaluation?cycleId=${data.cycleId}`);
      } else {
        navigate('/evaluation');
      }
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to start evaluation');
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (inputProblemId.trim()) {
      setActiveProblemId(inputProblemId.trim());
      setSearchParams({ id: inputProblemId.trim() });
      setActionError(null);
      setActionSuccess(null);
    }
  }

  function handleConflictRefresh() {
    setConflictModalOpen(false);
    refetchProblem();
  }

  const nextStatusOptions: { label: string; status: ProblemStatus; variant: 'primary' | 'danger' | 'secondary' }[] = [];

  if (problem) {
    switch (problem.status) {
      case 'SUBMITTED':
        nextStatusOptions.push({ label: 'Mark as Verifying', status: 'SOURCE_VERIFYING', variant: 'primary' });
        nextStatusOptions.push({ label: 'Reject Submission', status: 'REJECTED', variant: 'danger' });
        break;
      case 'SOURCE_VERIFYING':
        nextStatusOptions.push({ label: 'Approve Source Verification', status: 'SOURCE_VERIFIED', variant: 'primary' });
        nextStatusOptions.push({ label: 'Reject Submission', status: 'REJECTED', variant: 'danger' });
        break;
      case 'SOURCE_VERIFIED':
        nextStatusOptions.push({ label: 'Register Official Problem', status: 'REGISTERED', variant: 'primary' });
        nextStatusOptions.push({ label: 'Reject Submission', status: 'REJECTED', variant: 'danger' });
        break;
      case 'REGISTERED':
        nextStatusOptions.push({ label: 'Archive Record', status: 'ARCHIVED', variant: 'secondary' });
        break;
      default:
        break;
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      <Header
        title="Verification & Case Management"
        subtitle="Perform institutional verification on submitted problems and manage lifecycle progression."
      />

      <main className="flex-1 overflow-y-auto p-space-2xl">
        <div className="max-w-5xl mx-auto flex flex-col gap-space-xl">
          
          {/* Centralized Search Console */}
          <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm p-space-xl flex flex-col gap-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-text-primary">
                Case Lookup Engine
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                Enter a Problem UUID to inspect its verification pipeline.
              </p>
            </div>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
              <div className="flex-1 w-full relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
                  search
                </span>
                <input
                  id="problem-id-search-input"
                  type="text"
                  value={inputProblemId}
                  onChange={(e) => setInputProblemId(e.target.value)}
                  placeholder="Enter Problem UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
                  className="w-full h-10 pl-10 pr-space-md rounded border border-border-strong bg-surface-crisp font-mono-code text-body-md text-text-primary placeholder:text-outline-variant focus:outline-none focus:border-ashoka-blue"
                />
              </div>
              <button
                id="problem-search-btn"
                type="submit"
                disabled={problemLoading || !inputProblemId.trim()}
                className="w-full sm:w-auto h-10 px-space-xl rounded bg-surface-muted border border-border-strong text-text-primary hover:bg-surface-container transition-colors cursor-pointer font-medium disabled:opacity-50 flex items-center justify-center gap-space-sm"
              >
                {problemLoading ? (
                  <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                )}
                Lookup Case
              </button>
            </form>
          </div>

          {/* Feedback Alerts */}
          {problemError && <ErrorAlert message={getErrorMessage(problemError)} />}
          {actionError && <ErrorAlert message={actionError} onDismiss={() => setActionError(null)} />}
          {actionSuccess && (
            <div className="flex items-center gap-space-sm p-space-md bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
              <span className="font-body-sm text-body-sm font-medium">{actionSuccess}</span>
            </div>
          )}

          {/* Empty State */}
          {!activeProblemId && !problemLoading && !problem && (
            <div className="mt-space-2xl flex flex-col items-center justify-center text-text-muted">
              <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-space-md border border-border-hairline">
                <span className="material-symbols-outlined text-[32px]">folder_open</span>
              </div>
              <p className="font-label-lg text-label-lg text-text-primary">
                Awaiting Case Assignment
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1 text-center max-w-sm">
                Queue indexing is currently restricted. Query a specific problem by UUID to review its documentation and verification status.
              </p>
            </div>
          )}

          {/* Loaded Workspace */}
          {problem && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-space-xl">
              
              {/* Problem Metadata Card */}
              <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 p-space-xl border-b md:border-b-0 md:border-r border-border-hairline">
                  <div className="flex items-center justify-between mb-space-lg">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-ashoka-blue text-[20px]">description</span>
                      <h3 className="font-headline-sm text-headline-sm text-text-primary">Problem Statement</h3>
                    </div>
                    <StatusBadge status={problem.status} />
                  </div>
                  
                  <h4 className="font-label-lg text-label-lg text-text-primary mb-space-xs">{problem.title}</h4>
                  <p className="font-body-md text-body-md text-text-secondary whitespace-pre-wrap bg-surface-subtle p-space-md rounded border border-border-hairline">
                    {problem.description}
                  </p>

                  <div className="mt-space-lg grid grid-cols-2 gap-space-md">
                    <Field label="Problem UUID" value={problem.problemId} mono />
                    <Field label="Submitted By" value={problem.submittedByUserId} mono />
                    <Field label="Submission Date" value={new Date(problem.submittedAt).toLocaleString('en-IN')} />
                    <Field label="Data Version" value={`v${problem.version}`} mono />
                  </div>
                </div>

                {/* Source Verification Side-Panel */}
                <div className="w-full md:w-80 bg-surface-subtle p-space-xl flex flex-col">
                  <div className="flex items-center gap-space-sm mb-space-lg">
                    <span className="material-symbols-outlined text-text-secondary text-[20px]">corporate_fare</span>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary">Source Identity</h3>
                  </div>

                  <Field label="Source Account ID" value={problem.sourceAccountId} mono />
                  
                  {sourceLoading ? (
                    <LoadingSpinner message="Fetching source..." />
                  ) : sourceAccount ? (
                    <div className="flex flex-col gap-space-md">
                      <Field label="Identity Status" value={<StatusBadge status={sourceAccount.verificationStatus} />} />
                      {sourceAccount.verificationStatus === 'UNVERIFIED' && problem.status === 'SOURCE_VERIFYING' && (
                        <button
                          onClick={() => setShowVerifyModal(true)}
                          className="mt-space-sm w-full h-9 rounded bg-ashoka-blue text-white hover:bg-institutional-navy transition-colors font-medium flex items-center justify-center gap-space-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                          Execute Verification
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-body-sm text-text-muted">Source account not found.</p>
                  )}
                </div>
              </div>

              {/* Action Desk */}
              <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
                <div className="px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50 flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-text-secondary text-[20px]">gavel</span>
                    <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
                      Lifecycle Control Desk
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/audit?problemId=${problem.problemId}`)}
                    className="flex items-center gap-space-xs text-[12px] font-label-md text-text-muted hover:text-ashoka-blue transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    View Audit Ledger
                  </button>
                </div>
                
                <div className="p-space-xl flex flex-col md:flex-row gap-space-lg">
                  {/* Status Progression */}
                  <div className="flex-1">
                    <h4 className="font-label-md text-label-md text-text-primary mb-space-sm">Status Progression</h4>
                    {nextStatusOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-space-sm">
                        {nextStatusOptions.map((opt) => (
                          <button
                            key={opt.status}
                            onClick={() => setConfirmStatus(opt.status)}
                            disabled={statusMutation.isPending}
                            className={`h-10 px-space-lg rounded font-medium transition-colors shadow-sm disabled:opacity-50 ${
                              opt.variant === 'primary' 
                                ? 'bg-gov-emerald text-white hover:bg-emerald-700' 
                                : opt.variant === 'danger'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-surface-muted border border-border-strong text-text-primary hover:bg-surface-container'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-space-md rounded border border-border-hairline bg-surface-muted flex items-center gap-space-sm text-text-muted font-body-sm">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        This case is in a terminal state ({problem.status}) and cannot be progressed.
                      </div>
                    )}
                  </div>

                  {/* AI Evaluation */}
                  <div className="flex-1 md:border-l border-border-hairline md:pl-space-lg">
                    <h4 className="font-label-md text-label-md text-text-primary mb-space-sm">AI Analytics Pipeline</h4>
                    <p className="font-body-sm text-body-sm text-text-secondary mb-space-md">
                      Route this registered case to the Phase 2 autonomous evaluation matrix for technical triage.
                    </p>
                    <button
                      onClick={() => startEvalMutation.mutate()}
                      disabled={problem.status !== 'REGISTERED' || startEvalMutation.isPending}
                      className="h-10 px-space-lg rounded bg-institutional-navy text-white hover:bg-opacity-90 transition-colors font-medium flex items-center justify-center gap-space-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto"
                      title={problem.status !== 'REGISTERED' ? "Problem must be in REGISTERED status" : "Start Evaluation"}
                    >
                      {startEvalMutation.isPending ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                      )}
                      Initialize AI Evaluation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Conflict Modal */}
      <ConfirmModal
        isOpen={conflictModalOpen}
        title="Version Conflict Detected"
        description="This problem record has been modified by another administrator since you loaded it. You must refresh to fetch the latest state before executing any decisions."
        confirmLabel="Refresh Record"
        danger={false}
        onConfirm={handleConflictRefresh}
        onCancel={() => setConflictModalOpen(false)}
      />

      {/* Progression Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmStatus)}
        title="Confirm Status Transition"
        description={`You are moving this case to ${confirmStatus}. This action is logged permanently to the immutable audit ledger.`}
        confirmLabel="Execute Transition"
        danger={confirmStatus === 'REJECTED' || confirmStatus === 'ARCHIVED'}
        onConfirm={() => {
          if (confirmStatus) statusMutation.mutate(confirmStatus);
        }}
        onCancel={() => setConfirmStatus(null)}
      />

      {/* Verification Dialog */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-crisp rounded-lg shadow-xl border border-border-hairline w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-text-primary">Source Verification</h2>
              <button onClick={() => setShowVerifyModal(false)} className="text-text-muted hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyMutation.mutate();
              }}
              className="p-space-xl flex flex-col gap-space-md"
            >
              <div className="flex flex-col gap-space-2xs">
                <label className="font-label-sm text-label-sm text-text-primary">Methodology</label>
                <select
                  value={verifyMethod}
                  onChange={(e) => setVerifyMethod(e.target.value as VerificationMethod)}
                  className="h-10 px-space-sm rounded border border-border-strong bg-surface-crisp font-body-sm text-text-primary"
                >
                  <option value="AUTHORIZATION_DOC">Authorization Document Review</option>
                  <option value="OFFICIAL_EMAIL">Official Email Verification</option>
                  <option value="OTP">OTP Challenge</option>
                  <option value="REGISTRATION_API">Registration API Cross-Check</option>
                  <option value="INSTITUTIONAL_EMAIL">Institutional Email Domain</option>
                  <option value="MANUAL_REVIEW">Manual Human Review</option>
                </select>
              </div>

              <div className="flex flex-col gap-space-2xs">
                <label className="font-label-sm text-label-sm text-text-primary">Evidence Artifact URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={verifyEvidenceUrl}
                  onChange={(e) => setVerifyEvidenceUrl(e.target.value)}
                  className="h-10 px-space-sm rounded border border-border-strong bg-surface-crisp font-body-sm text-text-primary"
                />
              </div>

              <div className="flex flex-col gap-space-2xs">
                <label className="font-label-sm text-label-sm text-text-primary">Findings / Notes</label>
                <textarea
                  required
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Document the verification findings..."
                  className="px-space-sm py-space-xs rounded border border-border-strong bg-surface-crisp font-body-sm text-text-primary h-24 resize-none"
                />
              </div>

              <div className="flex flex-col gap-space-2xs">
                <label className="font-label-sm text-label-sm text-text-primary">Verdict</label>
                <div className="flex gap-space-md mt-1">
                  <label className="flex items-center gap-space-xs text-body-sm">
                    <input type="radio" checked={verifyResult === 'PASS'} onChange={() => setVerifyResult('PASS')} className="accent-gov-emerald" />
                    PASS Validation
                  </label>
                  <label className="flex items-center gap-space-xs text-body-sm">
                    <input type="radio" checked={verifyResult === 'FAIL'} onChange={() => setVerifyResult('FAIL')} className="accent-red-600" />
                    FAIL Validation
                  </label>
                  <label className="flex items-center gap-space-xs text-body-sm">
                    <input type="radio" checked={verifyResult === 'NEEDS_REVIEW'} onChange={() => setVerifyResult('NEEDS_REVIEW')} className="accent-amber-500" />
                    NEEDS REVIEW
                  </label>
                </div>
              </div>

              <div className="mt-space-md flex gap-space-sm">
                <button type="button" onClick={() => setShowVerifyModal(false)} className="flex-1 h-10 rounded border border-border-strong hover:bg-surface-muted transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={verifyMutation.isPending} className="flex-1 h-10 rounded bg-ashoka-blue text-white hover:bg-institutional-navy transition-colors font-medium disabled:opacity-50">
                  Record Verdict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
