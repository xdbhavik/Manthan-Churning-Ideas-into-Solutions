import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorPanel from '../../components/ui/ErrorPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import { getMyAssignments, getMyProjectReviews } from '../../services/evaluatorService';
import type { AssignmentResponse, ProjectReviewListItem } from '../../types';

function dateLabel(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

function StatCard({ label, count, icon, tone }: { label: string; count: number; icon: string; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-hairline bg-surface-crisp p-space-base">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <div><p className="text-sm text-text-secondary">{label}</p><p className="mt-0.5 text-2xl font-bold text-text-primary">{count}</p></div>
    </div>
  );
}

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [projectReviews, setProjectReviews] = useState<ProjectReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentData, projectReviewData] = await Promise.all([getMyAssignments(), getMyProjectReviews()]);
      setAssignments(assignmentData || []);
      setProjectReviews(projectReviewData || []);
    } catch (cause) {
      setError({ message: getErrorMessage(cause), status: getErrorStatus(cause) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = assignments.filter((item) => item.status === 'ASSIGNED');
  const inProgress = assignments.filter((item) => item.status === 'IN_PROGRESS' || item.status === 'ACCEPTED');
  const submitted = assignments.filter((item) => item.status === 'SUBMITTED' || item.status === 'REVIEWED');
  const awaitingProjectDecision = projectReviews.filter((item) => item.status === 'ASSIGNED');

  const nextDeadline = useMemo(() => assignments
    .filter((item) => ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'].includes(item.status))
    .map((item) => ({ item, deadline: item.deadlineAt || item.deadline }))
    .filter((entry): entry is { item: AssignmentResponse; deadline: string } => Boolean(entry.deadline) && !Number.isNaN(new Date(entry.deadline || 0).getTime()))
    .sort((a, b) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime())[0], [assignments]);

  const recentActivity = useMemo(() => {
    const activity = [
      ...assignments.flatMap((item) => {
        const entries = [{
          key: `${item.assignmentId}-assigned`,
          label: item.submittedAt ? 'Scorecard submitted' : 'Assignment received',
          title: item.problemTitle || 'Assigned problem',
          date: item.submittedAt || item.assignedAt,
          href: `/evaluator/assignments/${item.assignmentId}`,
          status: item.status,
        }];
        return entries;
      }),
      ...projectReviews.map((review) => ({
        key: review.projectReviewId,
        label: review.status === 'ASSIGNED' ? 'Project review assigned' : 'Project review updated',
        title: review.submissionTitle || review.problemTitle || 'Project review',
        date: review.decidedAt || review.createdAt,
        href: `/evaluator/project-reviews/${review.projectReviewId}`,
        status: review.status,
      })),
    ];
    return activity.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 6);
  }, [assignments, projectReviews]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg px-space-lg py-space-base">
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border-hairline pb-space-base">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-ashoka-blue">My Work</h1>
          <p className="mt-1 text-body-sm text-text-secondary">Live summary of your assigned evaluations and project reviews.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded bg-ashoka-blue px-space-md py-2 font-semibold text-on-primary disabled:opacity-60">
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>Refresh
        </button>
      </header>

      {error && <ErrorPanel status={error.status} message={error.message} onRetry={() => void load()} />}
      {loading && <div className="flex justify-center py-12"><LoadingSpinner label="Loading your work…" /></div>}
      {!loading && !error && <>
        <section className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Work summary">
          <StatCard label="Pending assignments" count={pending.length} icon="assignment" tone="bg-status-action-bg text-status-action-text" />
          <StatCard label="In progress" count={inProgress.length} icon="pending_actions" tone="bg-status-review-bg text-status-review-text" />
          <StatCard label="Submitted scorecards" count={submitted.length} icon="task_alt" tone="bg-status-approved-bg text-status-approved-text" />
          <StatCard label="Project reviews to decide" count={awaitingProjectDecision.length} icon="rate_review" tone="bg-surface-muted text-ashoka-blue" />
        </section>

        <section className="rounded-xl border border-border-hairline bg-surface-crisp p-space-base">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-sm text-text-primary">Next deadline</h2>
              {nextDeadline ? <p className="mt-1 text-sm text-text-secondary">{nextDeadline.item.problemTitle || 'Assigned problem'} · {dateLabel(nextDeadline.deadline)}</p> : <p className="mt-1 text-sm text-text-secondary">No upcoming deadline is available for your active assignments.</p>}
            </div>
            <Link to="/evaluator/assignments" className="text-sm font-semibold text-ashoka-blue hover:underline">Open assignments</Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border-hairline bg-surface-crisp">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline p-space-base">
            <div><h2 className="font-headline-sm text-text-primary">Recent activity</h2><p className="mt-1 text-sm text-text-secondary">Latest assignment and project-review updates.</p></div>
            <Link to="/evaluator/project-reviews" className="text-sm font-semibold text-ashoka-blue hover:underline">View project reviews</Link>
          </div>
          {recentActivity.length ? <ul className="divide-y divide-border-hairline">
            {recentActivity.map((item) => <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 p-space-base">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{item.label}</p><Link to={item.href} className="mt-1 block truncate font-semibold text-ashoka-blue hover:underline">{item.title}</Link><time className="mt-1 block text-xs text-text-secondary">{dateLabel(item.date)}</time></div>
              <StatusBadge status={item.status} />
            </li>)}
          </ul> : <p className="p-space-lg text-center text-sm text-text-secondary">No evaluator activity is available yet.</p>}
        </section>
      </>}
    </main>
  );
}
