import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMe, useMySubmissions, useProblems } from '../../hooks/usePortalQueries';
import { LinkButton, Card } from '../../components/ui';
import { shortId } from '../../models/labels';
import type { Submission } from '../../types/dto';

const statusClass: Record<string, string> = {
  DRAFT: 'bg-state-review-bg text-state-review-text',
  SUBMITTED: 'bg-state-submitted-bg text-state-submitted-text',
  UNDER_REVIEW: 'bg-state-submitted-bg text-state-submitted-text',
  RETURNED: 'bg-state-returned-bg text-state-returned-text',
  ACCEPTED: 'bg-state-accepted-bg text-state-accepted-text',
};

export default function DashboardPage() {
  const { authed, user } = useAuth();
  const meQuery = useMe(authed);
  const subsQuery = useMySubmissions(authed);
  const problemsQuery = useProblems(authed);

  const participant = meQuery.data;
  const submissions = subsQuery.data ?? [];
  const problems = problemsQuery.data ?? [];
  const drafts = submissions
    .filter((submission) => submission.status === 'DRAFT')
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());
  const underReview = submissions.filter((submission) => submission.status === 'UNDER_REVIEW' || submission.status === 'SUBMITTED');
  const accepted = submissions.filter((submission) => submission.status === 'ACCEPTED');
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, 5);
  const latestDraft = drafts[0];
  const displayName = participant?.fullName || user?.phone || 'Participant';
  const loading = meQuery.isLoading || subsQuery.isLoading || problemsQuery.isLoading;

  const metrics = [
    ['Available problems', problems.length],
    ['Drafts', drafts.length],
    ['Under review', underReview.length],
    ['Accepted solutions', accepted.length],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Welcome, {displayName}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">View your submissions and find published problems.</p>
        </div>
        <LinkButton to="/app/problems" variant="primary">Explore problems</LinkButton>
      </section>

      <section aria-label="Portal summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} variant="default" className="p-5">
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-2 text-3xl font-bold text-on-surface">{loading ? '—' : value}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-on-surface">Continue a draft</h2>
          <Link to="/app/submissions" className="text-sm font-semibold text-primary hover:underline">View all submissions</Link>
        </div>
        {latestDraft ? (
          <Card variant="default" className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs text-on-surface-variant">Draft · {shortId(latestDraft.submissionId)}</p>
              <h3 className="mt-1 font-semibold text-on-surface">{latestDraft.title || 'Untitled submission'}</h3>
            </div>
            <LinkButton to={`/app/submissions/${latestDraft.submissionId}`} variant="primary">Open draft</LinkButton>
          </Card>
        ) : (
          <Card variant="default" className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="text-sm text-on-surface-variant">You don’t have a draft yet.</p>
            <LinkButton to="/app/problems" variant="secondary">Choose a problem</LinkButton>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-on-surface">Recent submissions</h2>
          <Link to="/app/submissions" className="text-sm font-semibold text-primary hover:underline">View all</Link>
        </div>
        <Card variant="default" className="overflow-hidden">
          {loading ? <p className="p-5 text-sm text-on-surface-variant">Loading submissions…</p> : recent.length === 0 ? (
            <p className="p-5 text-sm text-on-surface-variant">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recent.map((submission: Submission) => (
                <li key={submission.submissionId} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <Link to={`/app/submissions/${submission.submissionId}`} className="font-semibold text-on-surface hover:text-primary">
                      {submission.title || 'Untitled submission'}
                    </Link>
                    <p className="mt-1 text-xs text-on-surface-variant">ID: {shortId(submission.submissionId)} · Round {submission.reviewRound}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[submission.status] ?? 'bg-surface-container text-on-surface'}`}>
                    {submission.status.replaceAll('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
