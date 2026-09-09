import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectReview, submitProjectReviewDecision, downloadFile } from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { ProjectReviewResponse } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ProjectReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ProjectReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);

  const [decision, setDecision] = useState<'ACCEPTED' | 'RETURNED'>('ACCEPTED');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true); setError(null);
    try {
      setReview(await getProjectReview(reviewId));
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, [reviewId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmitDecision = async () => {
    if (!review || !reviewId) return;
    setActionLoading(true); setActionError('');
    try {
      await submitProjectReviewDecision(reviewId, { decision, decisionComment: comment });
      await load();
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading project review…" /></div>;
  if (error) return <div className="p-6 max-w-4xl mx-auto"><ErrorPanel status={error.status} message={error.msg} onRetry={load} /></div>;
  if (!review) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/evaluator/project-reviews')} className="flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0A2540] font-semibold transition-colors">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Project Reviews
      </button>

      <div>
        <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight mb-2">Project Review Detail</h1>
        <div className="flex items-center gap-3 text-[13px] text-[#64748B] font-mono-code mb-4 border-b border-[#E2E8F0] pb-4">
          <span>Review ID: {review.reviewId}</span>
          <span>Problem: {review.problemId}</span>
          <span>Submission: {review.submissionId}</span>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#0A2540]">{review.submissionTitle}</h2>
            <div className="text-[13px] text-[#64748B] mt-1">Round {review.submissionRound}</div>
          </div>
          <StatusBadge status={review.reviewStatus} />
        </div>

        {review.submissionSummary && (
          <div className="bg-[#F8FAFC] rounded-lg p-4 text-[14px] text-[#475569] whitespace-pre-wrap">
            {review.submissionSummary}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <span className="font-semibold text-[#0A2540]">Created:</span> <span className="text-[#64748B]">{new Date(review.createdAt).toLocaleString()}</span>
          </div>
          {review.decisionAt && (
            <div>
              <span className="font-semibold text-[#0A2540]">Decided:</span> <span className="text-[#64748B]">{new Date(review.decisionAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap gap-4">
          {review.githubUrl && (
            <a href={review.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1E40AF] hover:underline bg-[#EFF6FF] px-3 py-1.5 rounded-lg border border-[#BFDBFE]">
              <span className="material-symbols-outlined text-[20px]">code</span>
              Open GitHub Repository
            </a>
          )}
          {(review.submittedFiles || []).map(f => (
            <button key={f.fileId} onClick={() => downloadFile(f.fileId, f.fileName)} className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0A2540] hover:bg-[#F1F5F9] bg-white px-3 py-1.5 rounded-lg border border-[#CBD5E1] transition-colors">
              <span className="material-symbols-outlined text-[20px]">download</span>
              {f.fileName}
            </button>
          ))}
        </div>
      </div>

      {review.reviewStatus === 'ASSIGNED' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-[16px] font-bold text-[#0A2540]">Make Decision</h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="decision" checked={decision === 'ACCEPTED'} onChange={() => setDecision('ACCEPTED')} className="w-4 h-4 text-[#0A2540]" />
              <span className="text-[14px] font-medium text-[#0A2540]">Accept Project</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="decision" checked={decision === 'RETURNED'} onChange={() => setDecision('RETURNED')} className="w-4 h-4 text-[#BE123C]" />
              <span className="text-[14px] font-medium text-[#0A2540]">Return (Request Changes)</span>
            </label>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1">Comment {decision === 'RETURNED' && <span className="text-[#BE123C]">* (Strongly Recommended)</span>}</label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              className="w-full border border-[#CBD5E1] rounded-lg p-3 text-[14px] resize-none focus:outline-none focus:border-[#0A2540]"
              placeholder="Provide reasoning for your decision..."
            />
            <div className="text-right text-[12px] text-[#64748B] mt-1">{comment.length}/2000</div>
          </div>
          {actionError && <div className="text-[#BE123C] text-[13px] font-medium p-2 bg-[#FFF1F2] rounded border border-[#FECDD3]">{actionError}</div>}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmitDecision}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A2540] text-white text-[14px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
            >
              {actionLoading ? <LoadingSpinner label="Submitting..." size="sm" /> : null}
              {decision === 'ACCEPTED' ? 'Accept Project' : 'Return Project'}
            </button>
          </div>
        </div>
      )}

      {review.reviewStatus !== 'ASSIGNED' && review.existingDecisionComment && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-2">
          <h3 className="text-[16px] font-bold text-[#0A2540]">Decision Comment</h3>
          <p className="text-[14px] text-[#475569] whitespace-pre-wrap">{review.existingDecisionComment}</p>
        </div>
      )}
    </div>
  );
}
