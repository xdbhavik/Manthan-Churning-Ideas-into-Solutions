import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorPanel from '../../components/ui/ErrorPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import { downloadFile, getProjectReview, getProjectReviewScorecard, saveProjectReviewScorecard, submitProjectReviewDecision } from '../../services/evaluatorService';
import type { ProjectReviewResponse, ProjectReviewScorecardView } from '../../types';

type DataRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is DataRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const asRecord = (value: unknown): DataRecord => isRecord(value) ? value : {};
const text = (value: unknown): string => {
  if (value == null || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.map(text).join(', ');
  if (isRecord(value)) return Object.entries(value).map(([key, nested]) => `${key}: ${text(nested)}`).join(' · ');
  return String(value);
};

function Field({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0 rounded-lg border border-border-hairline bg-surface-subtle p-space-sm"><dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt><dd className="mt-1 break-words whitespace-pre-wrap text-sm text-text-primary">{text(value)}</dd></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border-hairline bg-surface-crisp p-space-base"><h2 className="mb-space-sm font-headline-sm text-text-primary">{title}</h2>{children}</section>;
}

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
  const [scorecard, setScorecard] = useState<ProjectReviewScorecardView | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(true);
  const [scorecardSaving, setScorecardSaving] = useState(false);
  const [scorecardError, setScorecardError] = useState('');
  const [scorecardMessage, setScorecardMessage] = useState('');

  const load = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    setError(null);
    try { setReview(await getProjectReview(reviewId)); }
    catch (cause) { setError({ msg: getErrorMessage(cause), status: getErrorStatus(cause) }); }
    finally { setLoading(false); }
  }, [reviewId]);

  useEffect(() => { void load(); }, [load]);

  const loadScorecard = useCallback(async () => {
    if (!reviewId) return;
    setScorecardLoading(true);
    setScorecardError('');
    try { setScorecard(await getProjectReviewScorecard(reviewId)); }
    catch (cause) { setScorecardError(getErrorMessage(cause)); }
    finally { setScorecardLoading(false); }
  }, [reviewId]);

  useEffect(() => { void loadScorecard(); }, [loadScorecard]);

  const handleSubmitDecision = async () => {
    if (!review || !reviewId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await submitProjectReviewDecision(reviewId, { decision, decisionComment: comment });
      await load();
    } catch (cause) { setActionError(getErrorMessage(cause)); }
    finally { setActionLoading(false); }
  };

  const saveScorecard = async (submit: boolean) => {
    if (!scorecard || !reviewId) return;
    setScorecardSaving(true);
    setScorecardError('');
    setScorecardMessage('');
    try {
      const saved = await saveProjectReviewScorecard(reviewId, {
        criteriaScores: scorecard.criteriaScores,
        overallRemarks: scorecard.overallRemarks || '',
        submit,
      });
      setScorecard(saved);
      setScorecardMessage(submit ? 'Scorecard submitted.' : 'Draft saved. You can continue later.');
    } catch (cause) { setScorecardError(getErrorMessage(cause)); }
    finally { setScorecardSaving(false); }
  };

  const updateCriterionScore = (key: string, score: number | null) => {
    setScorecard((current) => current ? ({ ...current, criteriaScores: { ...current.criteriaScores, [key]: { ...current.criteriaScores[key], score } } }) : current);
  };
  const updateCriterionComment = (key: string, comment: string) => {
    setScorecard((current) => current ? ({ ...current, criteriaScores: { ...current.criteriaScores, [key]: { ...current.criteriaScores[key], comment } } }) : current);
  };
  const scorecardComplete = Boolean(scorecard?.criteria.length && scorecard.criteria.every((criterion) => scorecard.criteriaScores[criterion.key]?.score != null) && scorecard.overallRemarks?.trim());

  if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading project review…" /></div>;
  if (error) return <div className="p-6 max-w-5xl mx-auto"><ErrorPanel status={error.status} message={error.msg} onRetry={() => void load()} /></div>;
  if (!review) return null;

  const context = asRecord(review.context);
  const problem = asRecord(context.problem);
  const submitter = asRecord(context.submitter);
  const team = asRecord(context.team);
  const solution = asRecord(context.solution);
  const solutionFields = asRecord(solution.details);
  const members = Array.isArray(team.members) ? team.members.filter(isRecord) : [];
  const links = Array.isArray(review.links) ? review.links : [];
  const files = Array.isArray(review.files) ? review.files : [];
  const domains = Array.isArray(problem.domains) ? problem.domains : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-space-md px-space-lg py-space-base">
      <button type="button" onClick={() => navigate('/evaluator/project-reviews')} className="flex w-fit items-center gap-2 text-sm font-semibold text-text-secondary hover:text-ashoka-blue">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>Back to Project Reviews
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border-hairline pb-space-base">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Round {review.round} · Review {review.projectReviewId}</p><h1 className="mt-1 font-headline-lg text-ashoka-blue">{review.submissionTitle || 'Solution review'}</h1><p className="mt-1 text-sm text-text-secondary">Problem: {review.problemTitle}</p></div>
        <StatusBadge status={review.status} />
      </header>

      <Section title="Problem statement">
        <h3 className="font-label-lg font-bold text-text-primary">{text(problem.title || review.problemTitle)}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{text(problem.description)}</p>
        {problem.expectedOutcome != null && <div className="mt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-text-muted">Expected outcome</h4><p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{text(problem.expectedOutcome)}</p></div>}
        <dl className="mt-4 grid grid-cols-1 gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Problem ID" value={review.problemId} /><Field label="Organization / department" value={problem.sourceBucket} /><Field label="Category" value={problem.subEntityType} /><Field label="Urgency" value={problem.urgency} /><Field label="Severity" value={problem.severity} /><Field label="Location" value={problem.location} />
        </dl>
        {domains.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{domains.map((domain) => <span key={String(domain)} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">{String(domain)}</span>)}</div>}
      </Section>

      <Section title="Student and team">
        <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Submitter / team leader" value={submitter.fullName} /><Field label="Email" value={submitter.email} /><Field label="Contact number" value={submitter.phone} /><Field label="College / university" value={submitter.institution} /><Field label="Participant ID" value={submitter.participantId} /><Field label="Submission mode" value={team.name ? 'Team' : 'Individual'} />
        </dl>
        {team.name != null && <div className="mt-4"><h3 className="font-label-md font-bold text-text-primary">{text(team.name)} · Members ({members.length})</h3>
          {members.length > 0 ? <div className="mt-2 grid grid-cols-1 gap-space-sm md:grid-cols-2">{members.map((member, index) => <article key={String(member.participantId || index)} className="rounded-lg border border-border-hairline p-space-sm"><p className="font-semibold text-text-primary">{text(member.fullName)}{member.role ? ` · ${text(member.role)}` : ''}</p><p className="mt-1 text-sm text-text-secondary">{text(member.email)} · {text(member.phone)}</p><p className="mt-1 text-xs text-text-muted">{text(member.institution)}</p></article>)}</div> : <p className="mt-2 text-sm text-text-secondary">No team member details were included with this review.</p>}
        </div>}
      </Section>

      <Section title="Solution details">
        <h3 className="font-label-lg font-bold text-text-primary">{text(solution.title || review.submissionTitle)}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{text(solution.summary || review.summary)}</p>
        <dl className="mt-4 grid grid-cols-1 gap-space-sm sm:grid-cols-2"><Field label="GitHub repository" value={review.githubUrl || solution.githubUrl} /><Field label="Branch" value={solution.branch} /><Field label="Commit SHA" value={solution.commitSha} /></dl>
        {Object.keys(solutionFields).length > 0 && <div className="mt-4"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Submitted technical and innovation details</h4><dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">{Object.entries(solutionFields).map(([key, value]) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())} value={value} />)}</dl></div>}
      </Section>

      <Section title="Project solution scorecard">
        <p className="mb-4 text-sm text-text-secondary">This scorecard evaluates the submitted solution using your configured pool criteria. It is separate from Accept/Return and does not change the problem evaluation cycle.</p>
        {scorecardLoading && <div className="py-4"><LoadingSpinner label="Loading configured criteria and saved draft…" size="sm" /></div>}
        {scorecardError && <p role="alert" className="mb-3 rounded bg-error-container/40 p-3 text-sm text-error">{scorecardError} <button type="button" onClick={() => void loadScorecard()} className="ml-2 underline">Retry</button></p>}
        {scorecard && !scorecardLoading && <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-text-secondary">Scorecard status</span><StatusBadge status={scorecard.status} />{scorecard.status !== 'SUBMITTED' && <span className="text-sm font-semibold text-text-primary">Current total: {scorecard.criteria.reduce((sum, criterion) => sum + (scorecard.criteriaScores[criterion.key]?.score ?? 0), 0)} / {scorecard.maxScore}</span>}</div>
          {scorecard.criteria.length === 0 ? <p className="rounded-lg border border-border-hairline bg-surface-subtle p-3 text-sm text-text-secondary">No scoring criteria are configured for your evaluator pool. Contact an administrator to configure criteria.</p> : <div className="flex flex-col gap-3">
            {scorecard.criteria.map((criterion) => {
              const value = scorecard.criteriaScores[criterion.key];
              const readOnly = scorecard.status === 'SUBMITTED';
              return <article key={criterion.key} className="rounded-lg border border-border-hairline bg-surface-subtle p-space-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-text-primary">{criterion.label}</h3>{criterion.description && <p className="mt-1 text-sm text-text-secondary">{criterion.description}</p>}</div><label className="flex items-center gap-2 text-sm font-semibold text-text-primary">Score <input type="number" min={0} max={criterion.maxScore} step={1} disabled={readOnly} value={value?.score ?? ''} onChange={(event) => updateCriterionScore(criterion.key, event.target.value === '' ? null : Number.parseInt(event.target.value, 10))} className="w-20 rounded border border-border-hairline bg-surface-crisp px-2 py-1 disabled:bg-surface-muted" /><span className="text-text-muted">/ {criterion.maxScore}</span></label></div><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">Criterion remarks<textarea rows={2} maxLength={2000} disabled={readOnly} value={value?.comment || ''} onChange={(event) => updateCriterionComment(criterion.key, event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-border-hairline bg-surface-crisp p-2 text-sm font-normal normal-case text-text-primary disabled:bg-surface-muted" placeholder="Optional score justification" /></label></article>;
            })}
          </div>}
          <label className="mt-4 block text-sm font-semibold text-text-primary">Overall remarks<textarea rows={4} maxLength={5000} disabled={scorecard.status === 'SUBMITTED'} value={scorecard.overallRemarks || ''} onChange={(event) => setScorecard((current) => current ? { ...current, overallRemarks: event.target.value } : current)} className="mt-1 w-full resize-y rounded-lg border border-border-hairline bg-surface-crisp p-3 text-sm font-normal disabled:bg-surface-muted" placeholder="Summarize your assessment of the submitted solution…" /></label>
          {scorecardMessage && <p role="status" className="mt-3 text-sm font-semibold text-status-approved-text">{scorecardMessage}</p>}
          {scorecard.status !== 'SUBMITTED' && <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void saveScorecard(false)} disabled={scorecardSaving || scorecard.criteria.length === 0} className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50">{scorecardSaving ? 'Saving…' : 'Save draft'}</button><button type="button" onClick={() => void saveScorecard(true)} disabled={scorecardSaving || !scorecardComplete} className="rounded-lg bg-ashoka-blue px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">{scorecardSaving ? 'Submitting…' : 'Submit scorecard'}</button></div>}
          {scorecard.status === 'SUBMITTED' && <p className="mt-3 text-sm text-text-secondary">Submitted {scorecard.submittedAt ? new Date(scorecard.submittedAt).toLocaleString() : ''}. This scorecard is read-only.</p>}
        </>}
      </Section>

      <Section title="Project links and files">
        <div className="flex flex-col gap-2">
          {review.githubUrl && <a href={review.githubUrl} target="_blank" rel="noreferrer" className="break-all font-semibold text-ashoka-blue hover:underline">GitHub repository ↗</a>}
          {links.map((link, index) => {
            const url = link.url || link.href || Object.values(link)[0];
            return typeof url === 'string' && /^https?:\/\//i.test(url) ? <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="break-all text-sm text-ashoka-blue hover:underline">{link.label || link.type || url} ↗</a> : <p key={index} className="text-sm text-text-secondary">{Object.entries(link).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>;
          })}
          {!review.githubUrl && links.length === 0 && <p className="text-sm text-text-secondary">No project links attached.</p>}
        </div>
        <div className="mt-4 flex flex-col gap-2">{files.length > 0 ? files.map((file) => <div key={file.fileId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-hairline p-space-sm"><div className="min-w-0"><p className="break-all text-sm font-semibold text-text-primary">{file.fileName}</p><p className="mt-1 text-xs text-text-muted">{file.contentType || 'File'}{file.sizeBytes != null ? ` · ${(file.sizeBytes / 1024).toFixed(1)} KB` : ''}</p></div><button type="button" onClick={() => void downloadFile(file.fileId, file.fileName)} className="flex shrink-0 items-center gap-1 rounded border border-border-hairline px-3 py-1.5 text-sm font-semibold text-ashoka-blue hover:bg-surface-subtle"><span className="material-symbols-outlined text-[18px]">download</span>Download</button></div>) : <p className="text-sm text-text-secondary">No files attached.</p>}</div>
      </Section>

      <section className="grid grid-cols-1 gap-space-sm rounded-xl border border-border-hairline bg-surface-crisp p-space-base sm:grid-cols-2"><Field label="Review created" value={review.createdAt ? new Date(review.createdAt).toLocaleString() : null} /><Field label="Decision recorded" value={review.decidedAt ? new Date(review.decidedAt).toLocaleString() : null} /><Field label="Submission ID" value={review.submissionId} /><Field label="Evaluation cycle ID" value={review.cycleId} /></section>

      {review.status === 'ASSIGNED' && <Section title="Review decision">
        <div className="flex flex-wrap gap-6"><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="decision" checked={decision === 'ACCEPTED'} onChange={() => setDecision('ACCEPTED')} /><span className="text-sm font-medium text-text-primary">Accept project</span></label><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="decision" checked={decision === 'RETURNED'} onChange={() => setDecision('RETURNED')} /><span className="text-sm font-medium text-text-primary">Return with requested changes</span></label></div>
        <label className="mt-4 block text-sm font-semibold text-text-primary">Decision comment{decision === 'RETURNED' ? ' (required)' : ''}<textarea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} className="mt-1 w-full resize-y rounded-lg border border-border-hairline bg-surface-crisp p-3 text-sm" placeholder="Add your decision rationale or requested changes…" /></label>
        {actionError && <p role="alert" className="mt-3 rounded bg-error-container/40 p-3 text-sm text-error">{actionError}</p>}
        <div className="mt-4 flex justify-end"><button type="button" onClick={() => void handleSubmitDecision()} disabled={actionLoading || (decision === 'RETURNED' && !comment.trim())} className="rounded-lg bg-ashoka-blue px-5 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">{actionLoading ? 'Submitting…' : decision === 'ACCEPTED' ? 'Accept project' : 'Return project'}</button></div>
      </Section>}

      {review.status !== 'ASSIGNED' && review.decisionComment && <Section title="Decision comment"><p className="whitespace-pre-wrap text-sm text-text-secondary">{review.decisionComment}</p></Section>}
    </main>
  );
}
