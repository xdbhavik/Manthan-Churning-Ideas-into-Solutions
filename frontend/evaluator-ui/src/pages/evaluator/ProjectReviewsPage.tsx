import React, { useEffect, useState, useCallback } from 'react';
import { getMyProjectReviews, submitProjectReviewDecision, downloadFile } from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { ProjectReviewResponse, ProjectReviewStatus } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ProjectReviewsPage() {
  const [reviews, setReviews] = useState<ProjectReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);

  const [activeReview, setActiveReview] = useState<ProjectReviewResponse | null>(null);
  const [decision, setDecision] = useState<'ACCEPTED' | 'RETURNED'>('ACCEPTED');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setReviews(await getMyProjectReviews());
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSubmitDecision = async () => {
    if (!activeReview) return;
    setActionLoading(true); setActionError('');
    try {
      await submitProjectReviewDecision(activeReview.reviewId, { decision, decisionComment: comment });
      setActiveReview(null);
      void load();
    } catch (e) { setActionError(getErrorMessage(e)); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Project Reviews</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Review and provide decisions on project submissions</p>
      </div>

      {loading && <div className="py-12 flex justify-center"><LoadingSpinner label="Loading reviews…" /></div>}
      {error && !loading && <ErrorPanel status={error.status} message={error.msg} onRetry={load} />}
      {!loading && !error && reviews.length === 0 && <EmptyState icon="rate_review" title="No project reviews" description="You don't have any project reviews assigned." />}

      {!loading && !error && reviews.length > 0 && (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r.reviewId} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[16px] text-[#0A2540]">{r.submissionTitle}</span>
                    <StatusBadge status={r.reviewStatus} />
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-[#64748B] font-mono-code">
                    <span>ID: {r.reviewId}</span>
                    <span>Problem: {r.problemId}</span>
                    <span>Round: {r.submissionRound}</span>
                  </div>
                </div>
                <div className="text-right text-[12px] text-[#64748B]">
                  Created: {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>

              {r.submissionSummary && (
                <div className="text-[13px] text-[#475569] mb-4 p-3 bg-[#F8FAFC] rounded-lg whitespace-pre-wrap">
                  {r.submissionSummary}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 border-t border-[#E2E8F0] pt-4">
                {r.githubUrl && (
                  <a href={r.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0A2540] hover:underline">
                    <span className="material-symbols-outlined text-[18px]">code</span>
                    GitHub Repo
                  </a>
                )}
                {r.submittedFiles.map(f => (
                  <button key={f.fileId} type="button" onClick={() => downloadFile(f.fileId, f.fileName)} className="flex items-center gap-1.5 text-[13px] text-[#1E40AF] hover:underline bg-[#EFF6FF] px-2 py-1 rounded border border-[#BFDBFE]">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    {f.fileName}
                  </button>
                ))}
                <div className="ml-auto">
                  {r.reviewStatus === 'ASSIGNED' ? (
                    <button
                      type="button"
                      onClick={() => { setActiveReview(r); setDecision('ACCEPTED'); setComment(''); }}
                      className="px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors"
                    >
                      Make Decision
                    </button>
                  ) : (
                    <div className="text-[12px] font-semibold text-[#64748B]">Decision made</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!activeReview}
        title="Submit Review Decision"
        confirmLabel="Submit Decision"
        onConfirm={handleSubmitDecision}
        onCancel={() => { setActiveReview(null); setActionError(''); }}
        loading={actionLoading}
      >
        {activeReview && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="decision" checked={decision === 'ACCEPTED'} onChange={() => setDecision('ACCEPTED')} className="w-4 h-4 text-[#0A2540]" />
                <span className="text-[14px] font-medium text-[#0A2540]">ACCEPT</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="decision" checked={decision === 'RETURNED'} onChange={() => setDecision('RETURNED')} className="w-4 h-4 text-[#BE123C]" />
                <span className="text-[14px] font-medium text-[#0A2540]">RETURN (Reject)</span>
              </label>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0A2540] mb-1">Comment (Required for RETURN)</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-lg p-2 text-[13px] resize-none focus:outline-none focus:border-[#0A2540]"
                placeholder="Reasoning..."
              />
            </div>
            {actionError && <div className="text-[#BE123C] text-[13px]">{actionError}</div>}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
