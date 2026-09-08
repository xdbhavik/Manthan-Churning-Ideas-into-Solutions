import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssignment, submitScorecard } from '../../services/evaluatorService';
import { getProblem } from '../../services/problemService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { AssignmentResponse, EvaluationCriteria, CriterionScoreInput, ProblemResponse } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface DetailedAssignment extends AssignmentResponse {
  criteria?: EvaluationCriteria[]; // Injected by backend in this specific endpoint
}

export default function ScoringPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<DetailedAssignment | null>(null);
  const [problem, setProblem] = useState<ProblemResponse | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);

  const [scores, setScores] = useState<Record<string, { score: number | ''; comment: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true); setError(null);
    try {
      const a = await getAssignment(assignmentId) as DetailedAssignment;
      setAssignment(a);

      // Pre-fill existing scores
      const initScores: typeof scores = {};
      (a.criteria ?? []).forEach(c => {
        initScores[c.key] = {
          score: c.existingScore ?? '',
          comment: c.existingComment ?? ''
        };
      });
      setScores(initScores);

      // Load problem details if possible
      try {
        setProblem(await getProblem(a.problemId));
        setProblemError(null);
      } catch (e) {
        setProblemError('Problem details unavailable. You may continue scoring based on external knowledge base.');
      }
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, [assignmentId]);

  useEffect(() => { void load(); }, [load]);

  const criteriaList = useMemo(() => {
    return (assignment?.criteria ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }, [assignment]);

  // Validation
  let isValid = true;
  
  if (assignment) {
    if (assignment.overdue) {
      isValid = false;
      
    } else if (assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED') {
      isValid = false;
      
    } else {
      const missing = criteriaList.find(c => scores[c.key]?.score === '' || (scores[c.key]?.score as number) < 0 || (scores[c.key]?.score as number) > c.maxScore);
      if (missing) {
        isValid = false;
        
      } else if (!overallFeedback.trim()) {
        isValid = false;
        
      }
    }
  }

  const handleSubmit = async () => {
    if (!assignment || !isValid) return;
    setSubmitting(true); setSubmitError('');
    try {
      const inputs: CriterionScoreInput[] = Object.entries(scores).map(([k, v]) => ({
        criterionKey: k,
        score: v.score as number,
        comment: v.comment.trim() || undefined
      }));
      await submitScorecard(assignment.assignmentId, {
        scores: inputs,
        overallFeedback: overallFeedback.trim() || undefined,
        recommendation: recommendation.trim() || undefined
      });
      setSubmitConfirm(false);
      navigate('/evaluator/assignments', { replace: true });
    } catch (e) {
      setSubmitError(getErrorMessage(e));
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading scorecard…" /></div>;
  if (error || !assignment) return <div className="p-6"><ErrorPanel status={error?.status} message={error?.msg ?? 'Not found'} onBack={() => navigate(-1)} /></div>;

  const totalPossible = criteriaList.reduce((sum, c) => sum + c.maxScore, 0);
  const currentTotal = criteriaList.reduce((sum, c) => sum + (Number(scores[c.key]?.score) || 0), 0);
  const isReadonly = assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED' || assignment.overdue;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left panel: Context & AI Analysis (Read-Only) */}
      <div className="w-1/2 flex flex-col border-r border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center gap-2 bg-[#F8FAFC]">
          <span className="material-symbols-outlined text-[#0A2540]">assignment</span>
          <h2 className="font-semibold text-[14px] text-[#0A2540]">Evaluation Context</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {problemError && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[13px] text-[#92400E]">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              {problemError}
            </div>
          )}
          {problem && (
            <div className="mb-6 space-y-4">
              <div>
                <h3 className="text-[18px] font-bold text-[#0A2540]">{problem.title}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="font-mono-code text-[11px] text-[#64748B]">{problem.problemId}</span>
                  <StatusBadge status={problem.status} />
                </div>
              </div>
              <div className="text-[14px] text-[#475569] leading-relaxed whitespace-pre-wrap">{problem.description}</div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2E8F0]">
                <div>
                  <div className="text-[11px] font-semibold text-[#64748B] uppercase mb-1">Expected Outcome</div>
                  <div className="text-[13px] text-[#0A2540]">{problem.expectedOutcome || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#64748B] uppercase mb-1">Affected Population</div>
                  <div className="text-[13px] text-[#0A2540]">{problem.affectedPopulation?.toLocaleString() || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Panel - Strictly Read-Only */}
          <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0A2540] text-[18px]">smart_toy</span>
              <span className="font-semibold text-[13px] text-[#0A2540]">AI Preliminary Analysis</span>
              <span className="ml-auto text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#E2E8F0] px-1.5 py-0.5 rounded">Reference Only</span>
            </div>
            <div className="p-4 bg-white text-[13px] text-[#475569] space-y-3">
              <p>AI Analysis results will be displayed here once integrated. Evaluators must use their own judgement; this panel is purely supplementary.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-[#F1F5F9]">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Complexity</div>
                  <div className="font-medium">Moderate</div>
                </div>
                <div className="p-2 rounded bg-[#F1F5F9]">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Tech Relevance</div>
                  <div className="font-medium">High</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Scorecard */}
      <div className="w-1/2 flex flex-col bg-[#f8f9ff]">
        <div className="px-5 py-3 border-b border-[#E2E8F0] bg-white flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">rule</span>
            <h2 className="font-semibold text-[14px] text-[#0A2540]">Scorecard</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] text-[#64748B]">Total Score</div>
              <div className="text-[18px] font-bold text-[#0A2540] leading-none">{currentTotal} <span className="text-[12px] text-[#94A3B8] font-normal">/ {totalPossible}</span></div>
            </div>
            <button
              type="button"
              disabled={!isValid || isReadonly}
              onClick={() => setSubmitConfirm(true)}
              className="px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
            >
              Submit Scorecard
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {assignment.overdue && (
            <div className="flex items-center gap-2 p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-[13px] text-[#9F1239] font-medium">
              <span className="material-symbols-outlined text-[18px]">block</span>
              This assignment is overdue. Scorecard submission is locked.
            </div>
          )}

          {criteriaList.map((c) => (
            <div key={c.key} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[14px] text-[#0A2540]">{c.label}</span>
                    <span className="text-[11px] font-mono-code bg-[#F1F5F9] border border-[#E2E8F0] px-1 rounded text-[#475569]">{c.key}</span>
                  </div>
                  <p className="text-[12px] text-[#64748B]">{c.description}</p>
                </div>
                <div className="w-24 shrink-0">
                  <label className="block text-[11px] font-semibold text-[#64748B] text-right mb-1">Score (0-{c.maxScore})</label>
                  <input
                    type="number"
                    min="0" max={c.maxScore}
                    value={scores[c.key]?.score ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setScores(s => ({ ...s, [c.key]: { ...s[c.key], score: val } }));
                    }}
                    disabled={isReadonly}
                    className="w-full text-right text-[16px] font-bold text-[#0A2540] border border-[#CBD5E1] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] disabled:bg-[#F1F5F9]"
                  />
                </div>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Justification (optional)"
                  value={scores[c.key]?.comment ?? ''}
                  onChange={(e) => setScores(s => ({ ...s, [c.key]: { ...s[c.key], comment: e.target.value } }))}
                  disabled={isReadonly}
                  className="w-full text-[13px] border border-[#E2E8F0] rounded px-3 py-1.5 focus:outline-none focus:border-[#0A2540] disabled:bg-[#F1F5F9] placeholder:text-[#94A3B8]"
                />
              </div>
            </div>
          ))}

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
            <h3 className="font-semibold text-[14px] text-[#0A2540] mb-3">Overall Assessment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#0A2540] mb-1">Overall Feedback <span className="text-[#BE123C]">*</span></label>
                <textarea
                  rows={4}
                  value={overallFeedback}
                  onChange={e => setOverallFeedback(e.target.value)}
                  disabled={isReadonly}
                  className="w-full border border-[#CBD5E1] rounded-lg p-3 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] disabled:bg-[#F1F5F9]"
                  placeholder="Provide comprehensive feedback summarizing the evaluation..."
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0A2540] mb-1">Recommendation (Optional)</label>
                <input
                  type="text"
                  value={recommendation}
                  onChange={e => setRecommendation(e.target.value)}
                  disabled={isReadonly}
                  className="w-full border border-[#CBD5E1] rounded-lg p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] disabled:bg-[#F1F5F9]"
                  placeholder="E.g., Proceed to Phase 3, Needs more evidence..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={submitConfirm}
        title="Submit Scorecard"
        confirmLabel="Submit Final Scores"
        variant="primary"
        onConfirm={handleSubmit}
        onCancel={() => { setSubmitConfirm(false); setSubmitError(''); }}
        loading={submitting}
      >
        <div className="text-[13px] text-[#475569] space-y-2">
          <p>You are about to submit the final scorecard for this assignment. This action <strong>cannot be undone</strong>.</p>
          <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-semibold text-[#0A2540]">
            <span>Total Final Score:</span>
            <span>{currentTotal} / {totalPossible}</span>
          </div>
          {submitError && <div className="text-[#BE123C] font-medium mt-2">{submitError}</div>}
        </div>
      </ConfirmDialog>
    </div>
  );
}
