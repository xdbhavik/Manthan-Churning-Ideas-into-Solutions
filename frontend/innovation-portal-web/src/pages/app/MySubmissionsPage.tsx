import { useMemo, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMySubmissions } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card, Tabs } from '../../components/ui';
import { shortId } from '../../models/labels';
import type { Submission, SubmissionStatus } from '../../types/dto';

type TabId = 'all' | 'draft' | 'under_review' | 'returned' | 'accepted';
const TABS = [
  { id: 'all', label: 'All', badgeVariant: 'neutral' },
  { id: 'draft', label: 'Draft', badgeVariant: 'draft' },
  { id: 'under_review', label: 'Under review', badgeVariant: 'submitted' },
  { id: 'returned', label: 'Returned', badgeVariant: 'returned' },
  { id: 'accepted', label: 'Accepted', badgeVariant: 'accepted' },
] as const;

const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  DRAFT: 'bg-state-draft-bg text-state-draft-text',
  SUBMITTED: 'bg-state-submitted-bg text-state-submitted-text',
  UNDER_REVIEW: 'bg-state-submitted-bg text-state-submitted-text',
  RETURNED: 'bg-state-returned-bg text-state-returned-text',
  ACCEPTED: 'bg-state-accepted-bg text-state-accepted-text',
};

function SubmissionCard({ submission }: { submission: Submission }) {
  const isEditable = submission.status === 'DRAFT' || submission.status === 'RETURNED';
  return (
    <Card variant="default" className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-on-surface">{submission.title || 'Untitled submission'}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Submission {shortId(submission.submissionId)} · Problem {shortId(submission.problemId)} · Round {submission.reviewRound}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[submission.status]}`}>{submission.status.replaceAll('_', ' ')}</span>
      </div>
      {submission.summary && <p className="whitespace-pre-line text-sm text-on-surface-variant">{submission.summary}</p>}
      <dl className="grid gap-3 rounded-lg bg-surface-container-low p-4 sm:grid-cols-3">
        <div><dt className="text-xs text-on-surface-variant">Submission type</dt><dd className="mt-1 text-sm font-medium text-on-surface">{submission.team ? `Team · ${submission.team.name}` : 'Individual'}</dd></div>
        <div><dt className="text-xs text-on-surface-variant">Files</dt><dd className="mt-1 text-sm font-medium text-on-surface">{submission.files.length} attached</dd></div>
        <div><dt className="text-xs text-on-surface-variant">Submitted</dt><dd className="mt-1 text-sm font-medium text-on-surface">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not submitted yet'}</dd></div>
      </dl>
      {submission.decisionComment && <div className="rounded-lg bg-surface-container-low p-4"><h3 className="text-sm font-semibold text-on-surface">Evaluator feedback</h3><p className="mt-1 whitespace-pre-line text-sm text-on-surface-variant">{submission.decisionComment}</p></div>}
      {submission.status === 'ACCEPTED' && submission.reviewScorecard && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-sm font-semibold text-emerald-950">Evaluator score: {submission.reviewScorecard.totalScore} / {submission.reviewScorecard.maxScore}</p><LinkButton to={`/app/submissions/${submission.submissionId}`} variant="secondary" size="sm">View scorecard</LinkButton></div>}
      {submission.mentorAssignment && <p className="text-sm text-on-surface-variant">Assigned mentor: <span className="font-semibold text-on-surface">{submission.mentorAssignment.fullName}</span></p>}
      <div className="flex flex-wrap justify-end gap-2">
        {isEditable && <LinkButton to={`/app/submissions/${submission.submissionId}/edit`} variant="secondary" size="sm">Edit submission</LinkButton>}
        <LinkButton to={`/app/submissions/${submission.submissionId}`} variant="primary" size="sm">View details</LinkButton>
      </div>
    </Card>
  );
}

export default function MySubmissionsPage() {
  const { authed } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMySubmissions(authed);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const submissions = data ?? [];
  const counts = useMemo(() => ({
    all: submissions.length,
    draft: submissions.filter((submission) => submission.status === 'DRAFT').length,
    under_review: submissions.filter((submission) => submission.status === 'UNDER_REVIEW' || submission.status === 'SUBMITTED').length,
    returned: submissions.filter((submission) => submission.status === 'RETURNED').length,
    accepted: submissions.filter((submission) => submission.status === 'ACCEPTED').length,
  }), [submissions]);
  const filtered = useMemo(() => {
    if (activeTab === 'all') return submissions;
    const statuses: Record<Exclude<TabId, 'all'>, SubmissionStatus[]> = {
      draft: ['DRAFT'],
      under_review: ['UNDER_REVIEW', 'SUBMITTED'],
      returned: ['RETURNED'],
      accepted: ['ACCEPTED'],
    };
    return submissions.filter((submission) => statuses[activeTab].includes(submission.status));
  }, [submissions, activeTab]);

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-on-surface">My submissions</h1><p className="mt-1 text-sm text-on-surface-variant">Track drafts, evaluator decisions, and submitted files.</p></div>
        <LinkButton to="/app/submissions/new" variant="primary">New submission draft</LinkButton>
      </header>

      <section aria-label="Submission totals" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {TABS.map((tab) => <Card key={tab.id} variant="default" className="p-4"><p className="text-xs text-on-surface-variant">{tab.label}</p><p className="mt-1 text-2xl font-bold text-on-surface">{counts[tab.id]}</p></Card>)}
      </section>

      <Tabs tabs={TABS.map((tab) => ({ ...tab, badge: counts[tab.id] }))} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} variant="pills" />

      {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 rounded-xl skeleton-shimmer" />)}</div> : isError ? (
        <Card variant="default" className="p-8 text-center"><p className="font-semibold text-state-returned-text">Could not load submissions.</p><p className="mt-2 text-sm text-on-surface-variant">{error instanceof Error ? error.message : 'Try again later.'}</p><Button onClick={() => refetch()} variant="primary" className="mt-4">Retry</Button></Card>
      ) : filtered.length === 0 ? (
        <Card variant="default" className="p-10 text-center"><h2 className="font-semibold text-on-surface">No submissions in this view</h2><p className="mt-1 text-sm text-on-surface-variant">Create a draft from a published problem to get started.</p></Card>
      ) : <div className="space-y-4">{filtered.map((submission) => <SubmissionCard key={submission.submissionId} submission={submission} />)}</div>}
    </main>
  );
}
