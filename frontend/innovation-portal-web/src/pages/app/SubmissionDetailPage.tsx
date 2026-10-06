import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { useMySubmissions, useProblem } from '../../hooks/usePortalQueries';
import { Button, Card, LinkButton } from '../../components/ui';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function display(value: unknown): string {
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

export default function SubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { authed } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const { data: submissions = [], isLoading, isError, error, refetch } = useMySubmissions(authed);
  const submission = submissions.find(item => item.submissionId === submissionId);
  const { data: problem } = useProblem(submission?.problemId, authed);
  const details = asRecord(submission?.projectDetails);
  const student = asRecord(details.studentDetails);
  const teamDetails = asRecord(details.teamDetails);
  const technical = asRecord(details.technicalDetails);
  const projectLinks = asRecord(details.projectLinks);
  const rawLinks = [
    ...(submission?.links ?? []),
    ...Object.entries(projectLinks).filter(([, url]) => typeof url === 'string' && url.trim()).map(([label, url]) => ({ label, url: String(url) })),
  ];
  const links = rawLinks.filter((link, index) => rawLinks.findIndex(other => other.url === link.url) === index);
  const isEditable = submission?.status === 'DRAFT' || submission?.status === 'RETURNED';
  const needsCommit = !!submission?.githubUrl && !submission.commitSha;
  const hasArtifact = !!(submission?.title || submission?.summary || submission?.githubUrl || submission?.links.length || submission?.files.length);
  const [submittedRound, setSubmittedRound] = useState<number | null>(null);

  const submit = useMutation({
    mutationFn: () => portal.submitSubmission(submissionId!),
    onSuccess: async result => {
      if (result.status !== 'UNDER_REVIEW') {
        toast.notify('Submission was saved, but evaluation has not started yet.', 'error');
        return;
      }
      setSubmittedRound(result.reviewRound);
      toast.notify('Solution submitted for evaluation.', 'success');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['portal', 'submissions'] }),
      ]);
      await refetch();
    },
    onError: error => toast.notify(getErrorMessage(error), 'error'),
  });

  if (isLoading) return <main className="mx-auto max-w-5xl space-y-4 px-4 py-8"><div className="h-10 rounded skeleton-shimmer" /><div className="h-64 rounded-xl skeleton-shimmer" /></main>;
  if (!submission) return <main className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-xl font-bold text-on-surface">{isError ? 'Could not load your submissions' : 'Submission not found in your submissions'}</h1><p className="mt-2 text-sm text-on-surface-variant">{error instanceof Error ? error.message : 'This submission may have been removed or is not available to your account.'}</p><div className="mt-5 flex justify-center gap-3"><Button onClick={() => refetch()} variant="primary">Retry</Button><LinkButton to="/app/submissions" variant="secondary">My submissions</LinkButton></div></main>;

  const screenshots = submission.files.filter(file => file.contentType?.startsWith('image/'));
  const artifacts = submission.files.filter(file => !file.contentType?.startsWith('image/'));

  return <>
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/app/submissions" className="text-sm font-semibold text-primary">← My submissions</Link><span className="rounded-full bg-surface-container px-3 py-1 text-sm font-semibold text-on-surface">{submission.status.replaceAll('_', ' ')}</span></div>
    <header><p className="text-xs font-bold uppercase tracking-wide text-primary">Solution submission · Round {submission.reviewRound}</p><h1 className="mt-1 text-3xl font-bold text-on-surface">{submission.title || 'Untitled solution'}</h1><p className="mt-2 text-sm text-on-surface-variant">{problem?.title ?? 'Problem statement'} · Created {new Date(submission.submittedAt ?? '').toString() === 'Invalid Date' ? 'as a draft' : new Date(submission.submittedAt!).toLocaleString()}</p></header>

    <Card variant="default" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-on-surface">Solution overview</h2><p className="mt-1 whitespace-pre-line text-sm text-on-surface-variant">{submission.summary || 'No short description provided.'}</p></div><a href={`/problems/${submission.problemId}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">View problem ↗</a></div>
      {details.problemSolved ? <DetailRow label="Problem solved" value={display(details.problemSolved)} /> : null}
      {details.keyFeatures ? <DetailRow label="Key features" value={display(details.keyFeatures)} /> : null}
      {details.innovationUsp ? <DetailRow label="Innovation / USP" value={display(details.innovationUsp)} /> : null}
      {details.targetUsers ? <DetailRow label="Target users" value={display(details.targetUsers)} /> : null}
      {details.expectedImpact ? <DetailRow label="Expected impact" value={display(details.expectedImpact)} /> : null}
    </Card>

    <Card variant="default" className="space-y-4">
      <h2 className="text-lg font-bold text-on-surface">Student and team</h2>
      <div className="grid gap-3 sm:grid-cols-2"><DetailRow label="Student / team lead" value={display(student.teamLeaderName)} /><DetailRow label="College / university" value={display(student.collegeUniversity)} /><DetailRow label="Email" value={display(student.email)} /><DetailRow label="Contact number" value={display(student.contactNumber)} /></div>
      {submission.team && <div className="rounded-lg bg-surface-container-low p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-on-surface">{submission.team.name}</h3><span className="text-sm text-on-surface-variant">Team submission</span></div><ul className="mt-3 flex flex-wrap gap-2">{submission.team.members.map(member => <li key={member.participantId} className="rounded-full bg-surface-card px-3 py-1 text-sm text-on-surface">{member.fullName}</li>)}</ul></div>}
      {!submission.team && <p className="text-sm text-on-surface-variant">Individual submission</p>}
      {!submission.team && teamDetails.submissionType === 'TEAM' && <p className="text-xs text-on-surface-variant">Team membership data is saved with this submission.</p>}
    </Card>

    {submission.status === 'ACCEPTED' && submission.reviewScorecard && <Card variant="default" className="space-y-4 border border-emerald-200">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-on-surface">Evaluator scorecard</h2><p className="mt-1 text-sm text-on-surface-variant">Final score for your accepted solution.</p></div><div className="rounded-xl bg-emerald-50 px-4 py-2 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Total score</p><p className="text-2xl font-bold text-emerald-900">{submission.reviewScorecard.totalScore} <span className="text-base font-medium">/ {submission.reviewScorecard.maxScore}</span></p></div></div>
      <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle">{submission.reviewScorecard.criteria.map(criterion => {
        const result = submission.reviewScorecard!.criteriaScores[criterion.key];
        return <div key={criterion.key} className="flex flex-wrap items-start justify-between gap-3 p-3"><div className="min-w-0"><h3 className="font-semibold text-on-surface">{criterion.label}</h3>{criterion.description && <p className="mt-1 text-sm text-on-surface-variant">{criterion.description}</p>}{result?.comment && <p className="mt-2 whitespace-pre-line text-sm text-on-surface-variant">{result.comment}</p>}</div><span className="shrink-0 rounded-full bg-surface-container-low px-3 py-1 text-sm font-bold text-on-surface">{result?.score ?? '—'} / {criterion.maxScore}</span></div>;
      })}</div>
      {submission.reviewScorecard.overallRemarks && <div className="rounded-lg bg-surface-container-low p-4"><h3 className="text-sm font-bold text-on-surface">Evaluator remarks</h3><p className="mt-1 whitespace-pre-line text-sm text-on-surface-variant">{submission.reviewScorecard.overallRemarks}</p></div>}
      {submission.reviewScorecard.submittedAt && <p className="text-xs text-on-surface-variant">Scorecard submitted {new Date(submission.reviewScorecard.submittedAt).toLocaleString()}</p>}
    </Card>}

    {submission.status === 'ACCEPTED' && submission.mentorAssignment && <Card variant="default" className="space-y-4 border border-sky-200 bg-sky-50/50">
      <div className="flex items-start gap-3"><span className="material-symbols-outlined rounded-xl bg-sky-100 p-2 text-sky-800">school</span><div><h2 className="text-lg font-bold text-on-surface">Your assigned mentor</h2><p className="mt-1 text-sm text-on-surface-variant">The problem statement submitter assigned this mentor to support your accepted solution.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><DetailRow label="Mentor name" value={submission.mentorAssignment.fullName} /><DetailRow label="Email" value={submission.mentorAssignment.email} /><DetailRow label="Organization" value={submission.mentorAssignment.organization || 'Not provided'} /><DetailRow label="Assigned on" value={new Date(submission.mentorAssignment.assignedAt).toLocaleString()} /></div>
      {submission.mentorAssignment.note && <DetailRow label="Message" value={submission.mentorAssignment.note} />}
    </Card>}

    <Card variant="default" className="space-y-4">
      <h2 className="text-lg font-bold text-on-surface">Technology details</h2>
      <div className="grid gap-3 sm:grid-cols-2">{([['frontend','Frontend'],['backend','Backend'],['database','Database'],['aiMl','AI / ML'],['apis','APIs / external services'],['deployment','Deployment platform'],['architectureDiagramUrl','Architecture diagram']] as const).map(([key, label]) => <DetailRow key={key} label={label} value={display(technical[key])} url={key === 'architectureDiagramUrl'} />)}</div>
    </Card>

    <Card variant="default" className="space-y-4">
      <h2 className="text-lg font-bold text-on-surface">Repository and project links</h2>
      {submission.githubUrl ? <div className="rounded-lg bg-surface-container-low p-4"><div className="flex flex-wrap items-center justify-between gap-2"><a className="break-all font-semibold text-primary" href={submission.githubUrl} target="_blank" rel="noreferrer">{submission.githubUrl} ↗</a><span className="rounded bg-surface-card px-2 py-1 font-mono text-xs">Branch: {submission.branch || 'main'}</span></div><p className="mt-2 break-all font-mono text-xs text-on-surface-variant">Commit: {submission.commitSha || 'Not pinned yet'}</p></div> : <p className="text-sm text-on-surface-variant">No GitHub repository attached.</p>}
      {links.length ? <ul className="divide-y divide-border-subtle">{links.map((link, index) => <li key={`${link.url}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-medium text-on-surface">{link.label}</span><a href={link.url} target="_blank" rel="noreferrer" className="max-w-full break-all text-sm font-semibold text-primary">{link.url} ↗</a></li>)}</ul> : <p className="text-sm text-on-surface-variant">No additional project links attached.</p>}
    </Card>

    <Card variant="default" className="space-y-4">
      <div><h2 className="text-lg font-bold text-on-surface">Attached files ({submission.files.length})</h2><p className="mt-1 text-sm text-on-surface-variant">Documentation, presentations, and screenshots uploaded with this draft.</p></div>
      {submission.files.length === 0 ? <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">No files attached.</p> : <ul className="space-y-2">{submission.files.map(file => <li key={file.fileId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3"><div className="min-w-0"><p className="break-all text-sm font-semibold text-on-surface">{file.originalName}</p><p className="text-xs text-on-surface-variant">{file.contentType || 'File'} · {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB · SHA-256 {file.sha256.slice(0, 12)}…</p></div><Button variant="secondary" size="sm" onClick={() => portal.downloadFile(file.fileId, file.originalName)}>Download</Button></li>)}</ul>}
      {screenshots.length > 0 && <p className="text-xs text-on-surface-variant">{screenshots.length} image(s) attached. Download each image to view.</p>}
      {artifacts.length > 0 && <p className="text-xs text-on-surface-variant">{artifacts.length} document / artifact file(s) attached.</p>}
    </Card>

    {submission.decisionComment && <Card variant="default" className="space-y-2"><h2 className="font-bold text-on-surface">Evaluator feedback</h2><p className="whitespace-pre-line text-sm text-on-surface-variant">{submission.decisionComment}</p></Card>}

    {isEditable && <Card variant="default" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-on-surface">Ready to submit for evaluation?</h2><p className="text-sm text-on-surface-variant">You can edit the solution and attachments before sending it for review.</p>{needsCommit && <p className="mt-1 text-sm font-semibold text-state-returned-text">Add a commit SHA in the GitHub section before submitting.</p>}{!hasArtifact && <p className="mt-1 text-sm font-semibold text-state-returned-text">Add a solution title, description, project link, or file first.</p>}</div><div className="flex flex-wrap gap-2"><LinkButton to={`/app/submissions/${submission.submissionId}/edit`} variant="secondary">Edit draft</LinkButton><Button variant="primary" disabled={submit.isPending || needsCommit || !hasArtifact} onClick={() => submit.mutate()}>{submit.isPending ? 'Submitting…' : 'Submit for evaluation'}</Button></div></Card>}
    </main>
    <AnimatePresence>
      {submittedRound !== null && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.section role="dialog" aria-modal="true" aria-labelledby="submit-success-title" className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface-card p-8 text-center shadow-2xl" initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-primary to-sky-300" />
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <motion.svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" initial={{ scale: 0.5, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.12 }} aria-hidden="true">
              <motion.path d="M12 25.5 20 33l16-18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.25 }} />
            </motion.svg>
            {[0, 1, 2, 3, 4, 5].map((spark, index) => <motion.span key={spark} className={`absolute h-2 w-2 rounded-full ${index % 2 ? 'bg-primary' : 'bg-emerald-400'}`} style={{ left: `${8 + index * 16}%`, top: index % 2 ? '5%' : '88%' }} initial={{ opacity: 0, scale: 0, y: 5 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], y: index % 2 ? -15 : 15 }} transition={{ duration: 0.85, delay: 0.18 + index * 0.06 }} />)}
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Submission complete</p>
          <h2 id="submit-success-title" className="mt-2 text-2xl font-bold text-on-surface">Solution submitted successfully</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">Your solution is now <strong className="text-on-surface">under review</strong>. Evaluators can review it in Round {submittedRound}.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="primary" onClick={() => setSubmittedRound(null)}>View submission</Button><LinkButton to="/app/submissions" variant="secondary">My submissions</LinkButton></div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>;
}

function DetailRow({ label, value, url = false }: { label: string; value: string; url?: boolean }) {
  return <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>{url && value !== 'Not provided' ? <a className="mt-1 block break-all text-sm font-semibold text-primary" href={value} target="_blank" rel="noreferrer">{value} ↗</a> : <p className="mt-1 break-words text-sm text-on-surface">{value}</p>}</div>;
}
