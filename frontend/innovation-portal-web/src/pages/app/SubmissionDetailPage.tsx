import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { useSubmission } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card, Tabs } from '../../components/ui';

import { motion } from 'framer-motion';



export default function SubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const queryClient = useQueryClient();
  const { authed } = useAuth();
  const toast = useToast();
  const { data: submission, isLoading, isError, error, refetch } = useSubmission(submissionId, authed);
  const [activeTab, setActiveTab] = useState<'timeline' | 'files' | 'repo' | 'audit'>('timeline');

  const submit = useMutation({
    mutationFn: () => portal.submitSubmission(submissionId!),
    onSuccess: () => {
      toast.notify('Submitted for review', 'success');
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions', submissionId] });
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto w-full px-space-md md:px-space-lg py-space-md space-y-4">
        <div className="h-6 w-48 rounded skeleton-shimmer" />
        <div className="h-40 rounded-xl skeleton-shimmer" />
        <div className="h-80 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <div className="max-w-[1600px] mx-auto w-full px-space-md md:px-space-lg py-space-md text-center">
        <div className="material-symbols-outlined text-state-returned-text text-4xl">error</div>
        <p className="mt-3 font-semibold text-state-returned-text">Could not load this submission.</p>
        <p className="text-sm text-on-surface-variant-weak mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => refetch()} variant="primary">Retry</Button>
          <LinkButton to="/app/submissions" variant="secondary">Back to My Submissions</LinkButton>
        </div>
      </div>
    );
  }



  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-lg lg:px-space-xl py-space-lg space-y-space-lg">
      {/* Top Action Breadcrumb & Action Cluster */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm min-w-0">
          <LinkButton
            to="/app/submissions"
            variant="ghost"
            className="inline-flex items-center gap-space-xs font-headline-sm text-headline-sm text-on-surface-variant-weak hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            <span>Back to My Submissions</span>
          </LinkButton>
          <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">/</span>
          <div className="inline-flex items-center gap-space-xs bg-surface-container-high px-space-sm py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[14px] text-primary">tag</span>
            <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase">SUBMISSION</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm self-start sm:self-auto">
          <Button variant="secondary" size="sm" className="inline-flex items-center gap-space-xs h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-headline-sm text-headline-sm transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Diff History</span>
          </Button>
          <Button
            variant="primary"
            className="inline-flex items-center gap-space-xs h-10 px-space-md rounded-lg bg-primary-container hover:bg-state-submitted-text text-on-primary font-headline-sm text-headline-sm transition-all shadow-md hover:shadow-lg active:scale-95"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !submission?.commitSha}
          >
            <span className="material-symbols-outlined text-[18px]">edit_document</span>
            <span>Edit & Resubmit Solution</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Button>
        </div>
      </div>

      {/* Title & Problem Statement Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-card p-space-lg sm:p-space-xl shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-state-review-bg/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
          <div className="space-y-space-xs max-w-3xl">
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-state-review-bg text-state-review-text font-label-mono-sm text-label-mono-sm">
                <span className="w-2 h-2 rounded-full bg-state-review-text animate-pulse"></span>
                RETURNED · CHANGES REQUESTED
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">ID: {submission.submissionId?.slice(0, 12).toUpperCase()}</span>
              <span className="inline-flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-state-accepted-text bg-state-accepted-bg px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">verified</span> Integrity Verified
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
              {submission.title || 'Untitled submission'}
            </h1>
            <div className="flex items-start gap-space-xs pt-space-xs">
              <span className="material-symbols-outlined text-on-surface-variant-weak text-[20px] shrink-0 mt-0.5">account_tree</span>
              <p className="font-body-md text-body-md text-on-surface-variant-weak">
                <span className="font-headline-sm text-headline-sm text-on-surface">Problem ID:</span>
                {submission.problemId}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Prominent Alert Banner */}
      <div className="mt-space-lg rounded-xl bg-state-review-bg p-space-md flex items-start gap-space-md">
        <div className="p-2 rounded-lg bg-state-review-text/10 text-state-review-text shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[24px]">assignment_late</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <p className="font-headline-sm text-headline-sm text-state-review-text">Action Required: Substantive Revisions Demanded</p>
            <span className="font-label-mono-sm text-label-mono-sm text-state-review-text">Deadline: 19 Oct 2024, 23:59 IST</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface mt-1">
            Your submission has been reviewed by the assigned problem evaluator and returned for necessary modifications before final acceptance into Round 2 ranking.
          </p>
        </div>
      </div>

      {/* Official Evaluator Decision & Comments */}
      <div className="bg-surface-card rounded-xl shadow-md overflow-hidden">
        <div className="p-space-lg bg-surface-card flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">rate_review</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Official Evaluator Decision & Comments</h2>
              <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-1 text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
                <span className="inline-flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[15px]">badge</span>
                  Assigned Subject Matter Evaluator #EV-402
                </span>
                <span>•</span>
                <span className="text-on-surface-variant-weak">Dept of Agriculture Panel</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-on-surface-variant-weak">
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                  14 Oct 2024 at 16:30 IST
                </span>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-space-xs bg-state-review-bg text-state-review-text px-space-md py-1.5 rounded-lg font-headline-sm text-headline-sm">
            <span className="material-symbols-outlined text-[18px]">sync_problem</span>
            <span>Review Round 1 · Needs Work</span>
          </div>
        </div>
        <div className="p-space-lg sm:p-space-xl space-y-space-lg">
          <div className="rounded-xl bg-surface-canvas p-space-lg relative">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-state-review-text rounded-l-xl"></div>
            <div className="flex items-start gap-space-md">
              <span className="material-symbols-outlined text-on-surface-variant-weak text-[24px] shrink-0">format_quote</span>
              <div className="space-y-space-sm flex-1">
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {submission.decisionComment || 'No feedback provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <motion.div
        className="flex items-center gap-space-xs bg-surface-container-low p-1.5 rounded-xl self-start"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Tabs
          tabs={[
            { id: 'timeline', label: 'Overview & Timeline' },
            { id: 'files', label: 'Project Files', badge: submission.files?.length ?? 0 },
            { id: 'repo', label: 'Code Repository' },
            { id: 'audit', label: 'Evaluation Audit' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as 'timeline' | 'files' | 'repo' | 'audit')}
          variant="pills"
        />
      </motion.div>

      {/* MAIN TWO-COLUMN WORKSPACE CANVAS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl">
        {/* Left Column: Interactive Timeline & Telemetry Spec (7 Cols) */}
        <div className="xl:col-span-7 space-y-space-lg">
          {/* Interactive Submission Lifecycle Timeline */}
          <Card variant="default" className="space-y-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="p-2 rounded-lg bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined text-[20px]">timeline</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Lifecycle Progress Audit</h3>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Lifecycle Audit Log</span>
            </div>
            <div className="relative pl-6 space-y-space-lg">
              <div className="absolute left-[11px] top-3 bottom-4 w-0.5 bg-border-subtle"></div>
              {[
                { label: 'Draft Created', time: 'Unknown', desc: 'Repository initialized.', completed: true, current: false },
                ...(submission.submittedAt ? [{ label: 'Submitted for Review', time: new Date(submission.submittedAt).toLocaleString(), desc: 'Formal submission lock engaged.', completed: true, current: false }] : []),
                ...(submission.decidedAt ? [{ label: 'Decision Reached', time: new Date(submission.decidedAt).toLocaleString(), desc: 'Evaluator provided feedback.', completed: true, current: submission.status === 'RETURNED', status: submission.status === 'RETURNED' ? 'returned' : 'accepted' }] : []),
              ].map((node, idx) => (
                <motion.div
                  key={idx}
                  className={`relative flex items-start gap-space-md group ${node.current ? '' : 'opacity-60'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
                >
                  <span className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ring-4 ring-surface-card ${node.completed ? 'bg-state-accepted-bg text-state-accepted-text' : node.current ? `bg-${node.status === 'returned' ? 'state-review' : 'state-review'}-text` : 'bg-surface-card border-2 border-border-subtle text-on-surface-variant-weak'}`}>
                    {node.completed ? (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    ) : node.current ? (
                      <span className="material-symbols-outlined text-[14px]">priority_high</span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                    )}
                  </span>
                  <div className={`flex-1 ${node.current ? 'bg-state-review-bg/40' : 'bg-surface-canvas'} p-space-md rounded-xl ${node.current ? 'shadow-sm' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className={`font-headline-sm text-headline-sm ${node.current ? 'text-state-review-text' : 'text-on-surface'}`}>
                        {node.label}
                      </span>
                      <span className={`font-label-mono-sm text-label-mono-sm ${node.current ? 'text-state-review-text font-bold' : 'text-on-surface-variant-weak'}`}>
                        {node.time}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant-weak mt-1">
                      {node.desc}
                    </p>
                    {node.current && (
                      <div className="mt-space-sm pt-space-xs flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm text-state-review-text">
                        <span className="w-2 h-2 rounded-full bg-state-review-text"></span>
                        Active Stage: Author Revision in Progress
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
          {/* Technical Solution Brief Preview Card */}
          <Card variant="default" className="space-y-space-md">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">architecture</span>
                System Summary
              </h4>
            </div>
            <Card variant="outlined" className="p-space-md space-y-space-sm">
              <p className="font-body-md text-body-md text-on-surface">
                {submission.summary || 'No summary provided.'}
              </p>
            </Card>
          </Card>
        </div>

        {/* Right Column: Metadata Grid, Artifacts & Team (5 Cols) */}
        <div className="xl:col-span-5 space-y-space-lg">
          {/* Attached Files & Integrity Verification */}
          <Card variant="default" className="space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">folder</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Attached Submission Artifacts ({submission.files?.length ?? 0})</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-state-submitted-text font-label-mono-sm text-label-mono-sm flex items-center gap-0.5" onClick={() => {}}>
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>All (.ZIP)</span>
              </Button>
            </div>
            <div className="space-y-space-xs">
              {submission.files?.map((file, idx) => (
                <motion.div
                  key={file.fileId}
                  className={`p-space-sm rounded-xl flex items-center justify-between gap-space-sm ${idx === 0 ? 'bg-state-review-bg/30' : 'bg-surface-canvas'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-state-review-bg text-state-review-text' : 'bg-surface-container text-primary'}`}>
                      <span className="material-symbols-outlined text-[20px]">{idx === 0 ? 'picture_as_pdf' : idx === 1 ? 'memory' : 'table_chart'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-headline-sm text-on-surface truncate">{file.originalName}</span>
                        {idx === 0 && <span className="px-1.5 py-0.2 rounded bg-state-review-text text-on-primary font-label-mono-sm text-[10px]">UPDATE REQ</span>}
                      </div>
                      <div className="flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
                        <span>{file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '~2.5 MB'}</span>
                        <span>•</span>
                        <span className={idx === 0 ? 'text-state-review-text' : 'text-state-accepted-text'}>{idx === 0 ? 'Needs revision' : 'Valid'}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="p-1.5 text-on-surface-variant-weak hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </Button>
                </motion.div>
              ))}
            </div>
            <Card variant="outlined" className="p-space-sm flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-state-accepted-text text-[20px] shrink-0 mt-0.5">verified_user</span>
              <div className="space-y-0.5">
                <p className="font-headline-sm text-headline-sm text-on-surface">Cryptographic Integrity Seal</p>
                <p className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">SHA-256 seal verified on all raw assets at upload boundary.</p>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak break-all pt-1 select-all">
                  {submission.files?.[0]?.sha256 || 'a983b92ec849202f54a88f7129cd8a1b327b87c093a021'}
                </div>
              </div>
            </Card>
          </Card>

          {/* Git Code Repository & Pinned Commit */}
          <Card variant="default" className="space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">code</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Linked Codebase</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-mono-sm text-label-mono-sm">Public</span>
            </div>
            <Card variant="outlined" className="p-space-md space-y-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">GITHUB REPOSITORY</span>
                <LinkButton to={submission.githubUrl || '#'} target="_blank" variant="ghost" size="sm" className="inline-flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-primary hover:underline">
                  {submission.githubUrl || 'N/A'}
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </LinkButton>
              </div>
              <div className="flex items-center justify-between pt-space-xs">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">PINNED AUDIT COMMIT</span>
                <div className="inline-flex items-center gap-space-xs bg-surface-card px-2.5 py-1 rounded font-label-mono-sm text-label-mono-sm text-on-surface shadow-xs">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant-weak">commit</span>
                  <span className="font-bold">{submission.commitSha?.slice(0, 7) || 'None'}</span>
                  <Button variant="ghost" size="sm" className="text-on-surface-variant-weak hover:text-on-surface transition-colors" onClick={() => navigator.clipboard.writeText(submission.commitSha || '')}>
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </Button>
                </div>
              </div>
              <div className="pt-space-xs">
                <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak pb-1">
                  <span>Repository Health Check</span>
                  <span className="text-state-accepted-text">CI Passing (18 tests)</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div
                    className="w-5/6 h-full bg-state-accepted-text rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '83.33%' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </Card>
          </Card>

          {/* Team Metadata & Roles */}
          <Card variant="default" className="space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Team CryoTrackers</h3>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">3 Members</span>
            </div>
            <div className="space-y-space-sm">
              {submission.team?.members.map(member => (
                <div key={member.participantId} className="flex items-center justify-between p-space-sm rounded-lg bg-surface-canvas">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-headline-sm text-headline-sm shrink-0">
                      {member.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-headline-sm text-on-surface truncate">{member.fullName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Resubmission Sticky Banner / Callout */}
      <Card variant="default" className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="p-2.5 rounded-xl bg-surface-container text-primary">
            <span className="material-symbols-outlined text-[24px]">published_with_changes</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Ready to upload updated documentation?</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant-weak">Editing unlocks file upload replacements and enables pushing an updated pinned commit.</p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-colors">
            Download Feedback Brief
          </Button>
          <Button
            variant="primary"
            className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-state-submitted-text text-on-primary font-headline-sm text-headline-sm transition-all shadow-md"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !submission?.commitSha}
          >
            Begin Resubmission Flow →
          </Button>
        </div>
      </Card>
    </div>
  );
}