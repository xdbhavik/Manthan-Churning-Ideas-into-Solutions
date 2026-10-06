import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyProjectReviews } from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { ProjectReviewListItem } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ProjectReviewsPage() {
  const [reviews, setReviews] = useState<ProjectReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReviews(await getMyProjectReviews());
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Project Reviews</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Review submitted solutions assigned to your evaluator pool</p>
      </div>

      {loading && <div className="py-12 flex justify-center"><LoadingSpinner label="Loading reviews…" /></div>}
      {error && !loading && <ErrorPanel status={error.status} message={error.msg} onRetry={load} />}
      {!loading && !error && reviews.length === 0 && <EmptyState icon="rate_review" title="No project reviews" description="You don't have any project reviews assigned." />}

      {!loading && !error && reviews.length > 0 && (
        <div className="grid gap-4">
          {reviews.map(review => (
            <article key={review.projectReviewId} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-semibold text-[16px] text-[#0A2540]">{review.submissionTitle || 'Untitled solution'}</h2>
                    <StatusBadge status={review.status} />
                  </div>
                  <p className="text-sm text-[#475569]">Problem: {review.problemTitle}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#64748B] font-mono-code">
                    <span>Review ID: {review.projectReviewId}</span>
                    <span>Problem ID: {review.problemId}</span>
                    <span>Round: {review.round}</span>
                  </div>
                </div>
                <div className="text-right text-[12px] text-[#64748B]">Created: {new Date(review.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-4 flex justify-end border-t border-[#E2E8F0] pt-4">
                <Link to={`/evaluator/project-reviews/${review.projectReviewId}`} className="rounded-lg bg-[#0A2540] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E3A8A]">
                  Open review
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
