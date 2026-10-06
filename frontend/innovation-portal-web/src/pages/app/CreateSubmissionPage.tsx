import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { useMySubmissions, useProblems, useProblem } from '../../hooks/usePortalQueries';
import { Button, Card, Input } from '../../components/ui';
import type { SubmissionCreateRequest, SubmissionLink } from '../../types/dto';

const STEPS = ['Problem & team', 'Solution', 'Technology & GitHub', 'Links & files', 'Review'];
const COMMIT_RE = /^[A-Za-z0-9._-]{7,64}$/;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

type TechFields = {
  frontend: string; backend: string; database: string; aiMl: string;
  apis: string; deployment: string; architectureDiagramUrl: string;
};

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function validHttpUrl(value: string) {
  if (!value.trim()) return true;
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; }
  catch { return false; }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function CreateSubmissionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authed } = useAuth();
  const { submissionId: routeSubmissionId } = useParams<{ submissionId: string }>();
  const [params] = useSearchParams();
  const hydratedId = useRef('');
  const [step, setStep] = useState(0);
  const [problemId, setProblemId] = useState(params.get('problemId') ?? '');
  const [kind, setKind] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  const [teamId, setTeamId] = useState('');
  const [solutionTitle, setSolutionTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [features, setFeatures] = useState('');
  const [innovation, setInnovation] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [impact, setImpact] = useState('');
  const [tech, setTech] = useState<TechFields>({ frontend: '', backend: '', database: '', aiMl: '', apis: '', deployment: '', architectureDiagramUrl: '' });
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitSha, setCommitSha] = useState('');
  const [projectLinks, setProjectLinks] = useState({ liveDemoUrl: '', demoVideoUrl: '', documentationUrl: '', figmaUrl: '' });
  const [extraLinks, setExtraLinks] = useState<SubmissionLink[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [draftId, setDraftId] = useState(routeSubmissionId ?? '');
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const [uploadError, setUploadError] = useState('');
  const [uploadingName, setUploadingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: problems = [], isLoading: problemsLoading } = useProblems(authed);
  const { data: problem } = useProblem(problemId, authed);
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['portal', 'teams'], queryFn: portal.getMyTeams, enabled: authed,
  });
  const { data: profile } = useQuery({
    queryKey: ['portal', 'me'], queryFn: portal.me, enabled: authed,
  });
  const { data: mySubmissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useMySubmissions(authed);
  const editingSubmission = routeSubmissionId ? mySubmissions.find(item => item.submissionId === routeSubmissionId) : undefined;
  const selectedTeam = teams.find(team => team.teamId === teamId);
  const activeTeam = selectedTeam ?? (editingSubmission?.team?.teamId === teamId ? editingSubmission.team : undefined);

  useEffect(() => {
    const submission = editingSubmission;
    if (!submission || hydratedId.current === submission.submissionId) return;
    hydratedId.current = submission.submissionId;
    const details = asRecord(submission.projectDetails);
    const savedLinks = asRecord(details.projectLinks);
    const savedTech = asRecord(details.technicalDetails);
    setProblemId(submission.problemId);
    setKind(submission.teamId ? 'TEAM' : 'INDIVIDUAL');
    setTeamId(submission.teamId ?? '');
    setSolutionTitle(submission.title ?? '');
    setSummary(submission.summary ?? '');
    setProblemSolved(String(details.problemSolved ?? ''));
    setFeatures(Array.isArray(details.keyFeatures) ? details.keyFeatures.map(String).join('\n') : String(details.keyFeatures ?? ''));
    setInnovation(String(details.innovationUsp ?? ''));
    setTargetUsers(String(details.targetUsers ?? ''));
    setImpact(String(details.expectedImpact ?? ''));
    setGithubUrl(submission.githubUrl ?? '');
    setBranch(submission.branch ?? 'main');
    setCommitSha(submission.commitSha ?? '');
    setTech(current => ({ ...current, ...Object.fromEntries(Object.keys(current).map(key => [key, String(savedTech[key] ?? '')])) }));
    setProjectLinks(current => ({ ...current, ...Object.fromEntries(Object.keys(current).map(key => {
      const saved = savedLinks[key] ?? submission.links.find(link => link.label === key)?.url;
      return [key, String(saved ?? '')];
    })) }));
    const standardKeys = new Set(['liveDemoUrl', 'demoVideoUrl', 'documentationUrl', 'figmaUrl']);
    setExtraLinks(submission.links.filter(link => !standardKeys.has(link.label)));
  }, [editingSubmission]);

  const completeProjectLinks = useMemo(() => [
    ...Object.entries(projectLinks).filter(([, url]) => url.trim()).map(([label, url]) => ({ label, url: url.trim() })),
    ...extraLinks.filter(link => link.label.trim() && link.url.trim()).map(link => ({ label: link.label.trim(), url: link.url.trim() })),
  ], [projectLinks, extraLinks]);

  const projectDetails = useMemo(() => ({
    problemSolved: problemSolved.trim(),
    keyFeatures: features.split('\n').map(item => item.trim()).filter(Boolean),
    innovationUsp: innovation.trim(),
    targetUsers: targetUsers.trim(),
    expectedImpact: impact.trim(),
    studentDetails: {
      teamLeaderName: profile?.fullName ?? '',
      collegeUniversity: profile?.institutionName ?? '',
      email: profile?.email ?? '',
      contactNumber: profile?.phone ?? '',
    },
    teamDetails: {
      submissionType: kind,
      teamId: kind === 'TEAM' ? activeTeam?.teamId ?? '' : '',
      teamName: kind === 'TEAM' ? activeTeam?.name ?? '' : '',
      members: kind === 'TEAM' ? activeTeam?.members ?? [] : [],
    },
    projectLinks: Object.fromEntries(Object.entries(projectLinks).map(([key, value]) => [key, value.trim()])),
    technicalDetails: tech,
  }), [problemSolved, features, innovation, targetUsers, impact, profile, kind, activeTeam, projectLinks, tech]);

  const allFiles = [...documents, ...screenshots];
  const fileProblems = allFiles.filter(file => file.size > MAX_FILE_SIZE);
  const savedScreenshotCount = editingSubmission?.files.filter(file => file.contentType?.startsWith('image/')).length ?? 0;
  const totalScreenshotCount = savedScreenshotCount + screenshots.length;
  const invalidScreenshotCount = totalScreenshotCount > 0 && (totalScreenshotCount < 3 || totalScreenshotCount > 5);
  const invalidUrls = [githubUrl, tech.architectureDiagramUrl, ...Object.values(projectLinks), ...extraLinks.map(link => link.url)]
    .some(value => !validHttpUrl(value));

  const body: SubmissionCreateRequest = {
    problemId,
    title: solutionTitle.trim(),
    summary: summary.trim(),
    teamId: kind === 'TEAM' ? teamId : undefined,
    githubUrl: githubUrl.trim() || undefined,
    branch: branch.trim() || undefined,
    commitSha: commitSha.trim() || undefined,
    links: completeProjectLinks,
    projectDetails,
  };

  const validateStep = (current: number) => {
    if (current === 0 && !problemId) return 'Choose a problem statement to continue.';
    if (current === 0 && kind === 'TEAM' && !(editingSubmission?.teamId ? activeTeam : selectedTeam)) return 'Select one of your teams, or create/join a team from My Teams.';
    if (current === 1 && !solutionTitle.trim()) return 'Enter a solution title.';
    if (current === 1 && !summary.trim()) return 'Enter a short solution description.';
    if (current === 2 && commitSha.trim() && !COMMIT_RE.test(commitSha.trim())) return 'Commit SHA must be 7–64 letters, numbers, dots, underscores, or hyphens.';
    if (current === 2 && !validHttpUrl(githubUrl)) return 'Enter a valid GitHub repository URL.';
    if (current === 2 && githubUrl.trim() && !/^https:\/\/github\.com\/[^/?#]+\/[^/?#]+\/?$/.test(githubUrl.trim())) return 'Enter a GitHub repository URL in the form https://github.com/owner/repository.';
    if (current === 2 && githubUrl.length > 500) return 'GitHub repository URL must be 500 characters or fewer.';
    if (current === 2 && branch.length > 120) return 'Branch name must be 120 characters or fewer.';
    if (current === 2 && !validHttpUrl(tech.architectureDiagramUrl)) return 'Enter a valid architecture diagram URL.';
    if (current === 3 && invalidUrls) return 'Check the project links: each link must start with http:// or https://.';
    if (current === 3 && invalidScreenshotCount) return 'Keep 3 to 5 screenshots attached in total, or remove all screenshots to continue without them.';
    if (current === 3 && fileProblems.length) return 'Each uploaded file must be 50 MB or smaller.';
    return '';
  };

  const moveNext = () => {
    const issue = validateStep(step);
    if (issue) { setFormError(issue); return; }
    setFormError('');
    setStep(current => Math.min(STEPS.length - 1, current + 1));
  };

  const saveDraft = async () => {
    const invalidStep = [0, 1, 2, 3].find(index => validateStep(index));
    if (invalidStep !== undefined) {
      const message = validateStep(invalidStep);
      setStep(invalidStep);
      setFormError(message);
      toast.notify(message, 'error');
      return;
    }
    setFormError('');
    setUploadError('');
    setSaving(true);
    try {
      let id = draftId;
      if (id) {
        await portal.updateSubmissionMeta(id, {
          title: body.title, summary: body.summary, githubUrl: githubUrl.trim(),
          commitSha: commitSha.trim(), branch: branch.trim(), links: body.links,
          projectDetails: body.projectDetails,
        });
      } else {
        const created = await portal.createSubmission(body);
        id = created.submissionId;
        setDraftId(id);
      }

      const failed: string[] = [];
      for (const file of allFiles) {
        if (uploaded.has(fileKey(file))) continue;
        setUploadingName(file.name);
        try {
          await portal.uploadFile(id, file);
          setUploaded(previous => new Set(previous).add(fileKey(file)));
        } catch (error) {
          failed.push(`${file.name} (${getErrorMessage(error)})`);
        }
      }
      setUploadingName('');
      await queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
      if (failed.length) {
        setUploadError(`Draft saved. Could not upload: ${failed.join(', ')}. Retry the pending uploads below.`);
        toast.notify('Draft saved, but some files did not upload. Retry the failed files.', 'error');
        return;
      }
      toast.notify('Solution draft and attachments saved.', 'success');
      navigate(`/app/submissions/${id}`);
    } catch (error) {
      toast.notify(getErrorMessage(error), 'error');
    } finally {
      setSaving(false);
      setUploadingName('');
    }
  };

  const fileInput = (files: File[], setter: (files: File[]) => void, next: FileList | null) => {
    const selected = Array.from(next ?? []);
    const known = new Set(files.map(fileKey));
    setter([...files, ...selected.filter(file => !known.has(fileKey(file)))]);
    setFormError('');
  };

  const removeFile = (file: File, files: File[], setter: (files: File[]) => void) => {
    setter(files.filter(item => fileKey(item) !== fileKey(file)));
  };

  const removeSavedFile = async (fileId: string) => {
    if (!routeSubmissionId) return;
    try {
      await portal.deleteFile(routeSubmissionId, fileId);
      await refetchSubmissions();
      toast.notify('Attachment removed from this draft.', 'success');
    } catch (error) {
      toast.notify(getErrorMessage(error), 'error');
    }
  };

  if (routeSubmissionId && submissionsLoading) return <main className="mx-auto max-w-5xl space-y-4 px-4 py-8"><div className="h-10 rounded skeleton-shimmer" /><div className="h-72 rounded-xl skeleton-shimmer" /></main>;
  if (routeSubmissionId && !editingSubmission) return <main className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center"><h1 className="text-xl font-bold text-on-surface">Draft not found</h1><p className="text-sm text-on-surface-variant">This draft is not available in your submissions.</p><Link className="font-semibold text-primary" to="/app/submissions">Return to My Submissions</Link></main>;
  if (editingSubmission && editingSubmission.status !== 'DRAFT' && editingSubmission.status !== 'RETURNED') return <main className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center"><h1 className="text-xl font-bold text-on-surface">This submission is locked</h1><p className="text-sm text-on-surface-variant">Only draft or returned submissions can be edited.</p><Link className="font-semibold text-primary" to={`/app/submissions/${routeSubmissionId}`}>View submission</Link></main>;

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="space-y-2">
      <Link to="/app/problems" className="text-sm font-semibold text-primary">← Problem statements</Link>
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Innovation Portal · Problem solution submission</p>
      <h1 className="text-3xl font-bold text-on-surface">{editingSubmission ? 'Edit solution draft' : 'Submit your solution'}</h1>
      <p className="max-w-3xl text-sm text-on-surface-variant">{editingSubmission ? 'Update your saved solution, links, or attachments. The existing draft will be updated.' : 'Complete each section, save your draft, and review the saved submission and attachments before submitting for evaluation.'}</p>
    </header>

    <nav aria-label="Submission steps" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {STEPS.map((label, index) => <button key={label} type="button" onClick={() => { if (index <= step) { setFormError(''); setStep(index); } }} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${index === step ? 'border-primary bg-primary-container text-primary' : index < step ? 'border-primary/30 text-primary' : 'border-border-subtle text-on-surface-variant'}`}><span className="block opacity-70">STEP 0{index + 1}</span>{label}</button>)}
    </nav>

    {problem && <Card variant="default" className="space-y-2 border-l-4 border-l-primary">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{problem.sourceBucket ?? 'Problem statement'}{problem.subEntityType ? ` · ${problem.subEntityType}` : ''}</p><h2 className="text-lg font-bold text-on-surface">{problem.title}</h2></div><a href={`/problems/${problemId}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">View full problem ↗</a></div>
      <p className="line-clamp-3 text-sm text-on-surface-variant">{problem.description}</p>
    </Card>}

    <Card variant="default" className="space-y-6">
      {step === 0 && <section className="space-y-5">
        <div><h2 className="text-xl font-bold text-on-surface">Problem and submission type</h2><p className="mt-1 text-sm text-on-surface-variant">Choose whether this solution is yours individually or submitted by one of your teams.</p></div>
        <label className="block text-sm font-semibold text-on-surface">Problem statement
          {editingSubmission ? <p className="mt-1 rounded-lg bg-surface-container-low p-3 font-normal">{problem?.title ?? problems.find(item => item.problemId === problemId)?.title ?? 'Loading problem…'} <span className="block text-xs text-on-surface-variant">Problem cannot be changed after a draft is created.</span></p> : <select value={problemId} onChange={event => { setProblemId(event.target.value); setFormError(''); }} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal text-on-surface"><option value="">{problemsLoading ? 'Loading problem statements…' : 'Select a problem statement'}</option>{problems.map(item => <option key={item.problemId} value={item.problemId}>{item.title}</option>)}</select>}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['INDIVIDUAL', 'TEAM'] as const).map(option => <button key={option} type="button" disabled={!!editingSubmission} onClick={() => { setKind(option); setFormError(''); }} className={`rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-75 ${kind === option ? 'border-primary bg-primary-container/40 ring-1 ring-primary' : 'border-border-subtle hover:bg-surface-container-low'}`}><span className="font-bold text-on-surface">{option === 'INDIVIDUAL' ? 'Individual submission' : 'Team submission'}</span><span className="mt-1 block text-sm text-on-surface-variant">{option === 'INDIVIDUAL' ? 'Submit under your participant profile.' : 'Choose one of your accepted-member teams.'}</span></button>)}
        </div>
        {kind === 'TEAM' && <div className="space-y-3 rounded-lg bg-surface-container-low p-4">
          <label className="block text-sm font-semibold text-on-surface">Select your team
            <select value={teamId} disabled={!!editingSubmission} onChange={event => { setTeamId(event.target.value); setFormError(''); }} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal disabled:opacity-75">
              <option value="">{teamsLoading ? 'Loading your teams…' : 'Choose a team'}</option>
              {teams.map(team => <option key={team.teamId} value={team.teamId}>{team.name}</option>)}
            </select>
          </label>
          {activeTeam ? <div><p className="text-sm font-semibold text-on-surface">Team members</p><p className="mt-1 text-sm text-on-surface-variant">{activeTeam.members.map(member => member.fullName).join(', ')}</p></div> : <p className="text-sm text-on-surface-variant">Your accepted-member teams appear here. <Link to="/app/teams" className="font-semibold text-primary">Create a team or accept an invitation</Link></p>}
        </div>}
        <div className="grid gap-2 rounded-lg border border-border-subtle p-4 text-sm sm:grid-cols-2"><p><b>Student:</b> {profile?.fullName ?? 'Profile loading'}</p><p><b>College:</b> {profile?.institutionName ?? 'Not provided'}</p><p><b>Email:</b> {profile?.email ?? 'Not provided'}</p><p><b>Contact:</b> {profile?.phone ?? 'Not provided'}</p></div>
      </section>}

      {step === 1 && <section className="space-y-5">
        <div><h2 className="text-xl font-bold text-on-surface">Solution details</h2><p className="mt-1 text-sm text-on-surface-variant">Explain what you are building and who it helps.</p></div>
        <Input label="Solution title" value={solutionTitle} onChange={event => setSolutionTitle(event.target.value)} required placeholder="A clear name for your solution" />
        <label className="block text-sm font-semibold text-on-surface">Short description <span className="text-error">*</span><textarea rows={4} value={summary} onChange={event => setSummary(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" placeholder="Summarize how your solution works." /></label>
        <label className="block text-sm font-semibold text-on-surface">What problem does your solution solve?<textarea rows={3} value={problemSolved} onChange={event => setProblemSolved(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" /></label>
        <label className="block text-sm font-semibold text-on-surface">Key features <span className="font-normal text-on-surface-variant">(one per line)</span><textarea rows={4} value={features} onChange={event => setFeatures(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" /></label>
        <label className="block text-sm font-semibold text-on-surface">Innovation / USP<textarea rows={3} value={innovation} onChange={event => setInnovation(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-on-surface">Target users<textarea rows={3} value={targetUsers} onChange={event => setTargetUsers(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" /></label><label className="block text-sm font-semibold text-on-surface">Expected impact<textarea rows={3} value={impact} onChange={event => setImpact(event.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 font-normal" /></label></div>
      </section>}

      {step === 2 && <section className="space-y-5">
        <div><h2 className="text-xl font-bold text-on-surface">Technology and GitHub</h2><p className="mt-1 text-sm text-on-surface-variant">GitHub is optional for a draft. A commit SHA is required only when you submit a GitHub-backed solution for evaluation.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{([['frontend','Frontend'],['backend','Backend'],['database','Database'],['aiMl','AI / ML used'],['apis','APIs / external services'],['deployment','Deployment platform']] as const).map(([key, label]) => <Input key={key} label={label} value={tech[key]} onChange={event => setTech(current => ({ ...current, [key]: event.target.value }))} placeholder={`${label} details`} />)}</div>
        <Input label="Architecture diagram URL" value={tech.architectureDiagramUrl} onChange={event => setTech(current => ({ ...current, architectureDiagramUrl: event.target.value }))} placeholder="https://…" />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="GitHub repository URL" value={githubUrl} onChange={event => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><Input label="Branch" value={branch} onChange={event => setBranch(event.target.value)} placeholder="main" /></div>
        <Input label="Commit SHA (optional while drafting)" value={commitSha} onChange={event => setCommitSha(event.target.value)} placeholder="7–64 character commit hash" />
        {githubUrl && branch && <a href={(() => { try { const url = new URL(githubUrl); const parts = url.pathname.split('/').filter(Boolean); return url.hostname === 'github.com' && parts.length === 2 ? `https://github.com/${parts.join('/')}/tree/${branch.split('/').map(encodeURIComponent).join('/')}` : undefined; } catch { return undefined; } })()} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-primary">Open selected branch ↗</a>}
      </section>}

      {step === 3 && <section className="space-y-6">
        <div><h2 className="text-xl font-bold text-on-surface">Links and files</h2><p className="mt-1 text-sm text-on-surface-variant">Add demo links and attach project documents or screenshots. Each file can be up to 50 MB.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{([['liveDemoUrl','Live demo URL'],['demoVideoUrl','Demo video URL (YouTube / Drive)'],['documentationUrl','Documentation / PPT link'],['figmaUrl','Figma link (optional)']] as const).map(([key, label]) => <Input key={key} label={label} value={projectLinks[key]} onChange={event => setProjectLinks(current => ({ ...current, [key]: event.target.value }))} placeholder="https://…" />)}</div>
        <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-on-surface">Additional project links</h3><Button variant="secondary" size="sm" onClick={() => setExtraLinks(current => [...current, { label: '', url: '' }])}>Add link</Button></div>{extraLinks.map((link, index) => <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input label="Label" value={link.label} onChange={event => setExtraLinks(current => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} placeholder="Design document" /><Input label="URL" value={link.url} onChange={event => setExtraLinks(current => current.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} placeholder="https://…" /><Button variant="secondary" onClick={() => setExtraLinks(current => current.filter((_, i) => i !== index))}>Remove</Button></div>)}</div>
        <FilePicker title="Documentation / PPT upload" hint="PDF, PowerPoint, or Word files" accept=".pdf,.ppt,.pptx,.doc,.docx" files={documents} uploaded={uploaded} onChange={fileList => fileInput(documents, setDocuments, fileList)} onRemove={file => removeFile(file, documents, setDocuments)} />
        <FilePicker title="Screenshots / demo images" hint="Optional. If added, choose 3–5 images (dashboard, main feature, output, admin view)." accept="image/*" multiple files={screenshots} uploaded={uploaded} onChange={fileList => fileInput(screenshots, setScreenshots, fileList)} onRemove={file => removeFile(file, screenshots, setScreenshots)} />
        {editingSubmission && <div className="space-y-2 rounded-lg border border-border-subtle p-4"><h3 className="font-semibold text-on-surface">Existing attachments</h3>{editingSubmission.files.length === 0 ? <p className="text-sm text-on-surface-variant">No files attached to this draft yet.</p> : editingSubmission.files.map(file => <div key={file.fileId} className="flex flex-wrap items-center justify-between gap-3 rounded bg-surface-container-low px-3 py-2"><div><p className="break-all text-sm font-medium text-on-surface">{file.originalName}</p><p className="text-xs text-on-surface-variant">{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => portal.downloadFile(file.fileId, file.originalName)}>Download</Button><Button variant="secondary" size="sm" onClick={() => removeSavedFile(file.fileId)}>Remove</Button></div></div>)}</div>}
      </section>}

      {step === 4 && <section className="space-y-5">
        <div><h2 className="text-xl font-bold text-on-surface">Review your draft</h2><p className="mt-1 text-sm text-on-surface-variant">Save creates a draft and uploads the selected files. You can continue editing it from the submission detail screen.</p></div>
        <ReviewRow label="Problem" value={problem?.title ?? problems.find(item => item.problemId === problemId)?.title ?? 'No problem selected'} />
        <ReviewRow label="Submission type" value={kind === 'TEAM' ? `Team · ${activeTeam?.name ?? 'No team selected'}` : 'Individual'} />
        {activeTeam && <ReviewRow label="Team members" value={activeTeam.members.map(member => member.fullName).join(', ')} />}
        <ReviewRow label="Solution" value={solutionTitle || 'No title entered'} />
        <ReviewRow label="GitHub" value={githubUrl ? `${githubUrl} · ${branch || 'main'}${commitSha ? ` · ${commitSha}` : ''}` : 'Not provided'} />
        <ReviewRow label="Project links" value={completeProjectLinks.map(link => `${link.label}: ${link.url}`).join('\n') || 'None added'} />
        <ReviewRow label="Files" value={[...(editingSubmission?.files.map(file => `${file.originalName} (saved)`) ?? []), ...documents.map(file => `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`), ...screenshots.map(file => `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)].join('\n') || 'None attached'} />
        {draftId && <p className="rounded-lg bg-primary-container/40 p-3 text-sm text-on-surface">{editingSubmission ? 'Saving updates will change this draft. Existing attachments stay in place unless you remove them.' : 'Draft created. Retrying will update this draft and upload any files that are still pending; it will not create a duplicate.'}</p>}
      </section>}

      {(formError || uploadError) && <div role="alert" className="rounded-lg border border-error/30 bg-state-returned-bg p-3 text-sm text-state-returned-text">{formError || uploadError}</div>}
      {uploadingName && <p role="status" className="text-sm text-on-surface-variant">Uploading {uploadingName}…</p>}
      <footer className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" disabled={step === 0 || saving} onClick={() => { setFormError(''); setStep(current => Math.max(0, current - 1)); }}>Back</Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {step < STEPS.length - 1 ? <Button variant="primary" onClick={moveNext}>Continue to {STEPS[step + 1]}</Button> : <Button variant="primary" disabled={saving} onClick={saveDraft}>{saving ? (uploadingName ? 'Uploading files…' : 'Saving draft…') : editingSubmission ? 'Save draft changes' : draftId ? 'Retry pending uploads & save' : 'Create solution draft'}</Button>}
        </div>
      </footer>
    </Card>
  </main>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-border-subtle pb-3 sm:grid-cols-[160px_1fr]"><p className="text-sm font-semibold text-on-surface-variant">{label}</p><p className="whitespace-pre-line break-words text-sm text-on-surface">{value}</p></div>;
}

function FilePicker({ title, hint, accept, multiple = true, files, uploaded, onChange, onRemove }: {
  title: string; hint: string; accept: string; multiple?: boolean; files: File[]; uploaded: Set<string>;
  onChange: (files: FileList | null) => void; onRemove: (file: File) => void;
}) {
  return <div className="space-y-2 rounded-lg border border-border-subtle p-4">
    <label className="block text-sm font-semibold text-on-surface">{title}<span className="mt-1 block text-xs font-normal text-on-surface-variant">{hint}</span>
      <input type="file" accept={accept} multiple={multiple} onChange={event => { onChange(event.target.files); event.currentTarget.value = ''; }} className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-container file:px-3 file:py-2 file:font-semibold file:text-primary" />
    </label>
    {files.length > 0 && <ul className="space-y-2">{files.map(file => <li key={fileKey(file)} className="flex items-center justify-between gap-3 rounded bg-surface-container-low px-3 py-2 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-on-surface-variant">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></span>{uploaded.has(fileKey(file)) ? <span className="shrink-0 font-semibold text-green-700">Uploaded</span> : <button type="button" onClick={() => onRemove(file)} className="shrink-0 font-semibold text-error">Remove</button>}</li>)}</ul>}
  </div>;
}
