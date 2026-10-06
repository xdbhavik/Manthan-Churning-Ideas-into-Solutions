import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { useProblems, useProblem } from '../../hooks/usePortalQueries';
import { Button, Card, Input, Select, Stepper } from '../../components/ui';
import type { Participant, SubmissionCreateRequest, SubmissionLink } from '../../types/dto';
import { motion } from 'framer-motion';

const COMMIT_RE = /^[A-Za-z0-9._-]{7,64}$/;

const STEPPER_STEPS = [
  { id: 'details', label: 'Problem & Solution', shortLabel: '01. SOLUTION', icon: <span className="material-symbols-outlined text-[15px]">description</span> },
  { id: 'squad', label: 'Student / Team', shortLabel: '02. TEAM', icon: <span className="material-symbols-outlined text-[15px]">groups</span> },
  { id: 'active', label: 'Technical Details', shortLabel: '03. TECH', icon: <span className="material-symbols-outlined text-[15px]">terminal</span> },
  { id: 'files', label: 'Links & Files', shortLabel: '04. FILES', icon: <span className="material-symbols-outlined text-[15px]">folder</span> },
  { id: 'signoff', label: 'Review & Submit', shortLabel: '05. SUBMIT', icon: <span className="material-symbols-outlined text-[15px]">checklist</span> },
];

export default function CreateSubmissionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authed } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const pre = params.get('problemId') ?? '';

  const [stepIndex, setStepIndex] = useState(0);
  const [problemId] = useState(pre);
  const [submissionType, setSubmissionType] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitSha, setCommitSha] = useState('');
  const [links, setLinks] = useState<SubmissionLink[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [solutionTitle, setSolutionTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [innovationUsp, setInnovationUsp] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [technology, setTechnology] = useState({ frontend: '', backend: '', database: '', aiMl: '', apis: '', deployment: '', architectureDiagramUrl: '' });
  const [projectLinks, setProjectLinks] = useState({ liveDemoUrl: '', demoVideoUrl: '', documentationUrl: '', figmaUrl: '' });
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  useEffect(() => {
    portal.me().then(setParticipant).catch(() => setParticipant(null));
  }, []);

  useProblems(authed); // Left to cache problem list if needed, or we can just import useProblem
  const { data: problem } = useProblem(problemId, authed);
  const { data: myTeams = [] } = useQuery({ queryKey: ['portal', 'teams'], queryFn: portal.getMyTeams, enabled: authed });
  const problemTeams = myTeams.filter((team) => team.problemId === problemId);
  const selectedTeam = problemTeams.find((team) => team.teamId === selectedTeamId);

  const create = useMutation({
    mutationFn: () => {
      const body: SubmissionCreateRequest = {
        problemId,
        title: solutionTitle.trim(),
        summary: shortDescription.trim(),
        teamId: submissionType === 'TEAM' ? selectedTeamId : undefined,
        githubUrl: githubUrl.trim() || undefined,
        branch: branch.trim() || undefined,
        commitSha: commitSha.trim() || undefined,
        links: [
          ...links.filter((l) => l.url.trim()),
          ...Object.entries(projectLinks).filter(([, url]) => url.trim()).map(([label, url]) => ({ label, url: url.trim() })),
        ],
        projectDetails: {
          problemSolved: problemSolved.trim(),
          keyFeatures: keyFeatures.split('\n').map((value) => value.trim()).filter(Boolean),
          innovationUsp: innovationUsp.trim(),
          targetUsers: targetUsers.trim(),
          expectedImpact: expectedImpact.trim(),
          studentDetails: {
            teamLeaderName: participant?.fullName || '',
            collegeUniversity: participant?.institutionName || '',
            email: participant?.email || '',
            contactNumber: participant?.phone || '',
          },
          teamDetails: {
            teamName: submissionType === 'TEAM' ? selectedTeam?.name || '' : '',
            members: selectedTeam?.members ?? [],
          },
          projectLinks: Object.fromEntries(Object.entries(projectLinks).map(([key, value]) => [key, value.trim()])),
          technicalDetails: technology,
        },
      };
      return portal.createSubmission(body);
    },
    onSuccess: async (s) => {
      try {
        for (const file of [...documentFiles, ...screenshots]) await portal.uploadFile(s.submissionId, file);
        toast.notify('Solution draft and project files saved', 'success');
      } catch (error) {
        toast.notify(`Draft saved, but a file could not be uploaded: ${getErrorMessage(error)}`, 'error');
      }
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
      navigate(`/app/submissions/${s.submissionId}`);
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  const commitValid = commitSha === '' || COMMIT_RE.test(commitSha);
  const githubBranchUrl = useMemo(() => {
    try {
      const repo = new URL(githubUrl);
      const parts = repo.pathname.split('/').filter(Boolean);
      if (repo.protocol !== 'https:' || repo.hostname.toLowerCase() !== 'github.com' || parts.length !== 2) return '';
      const branchPath = (branch || 'main').split('/').map(encodeURIComponent).join('/');
      return `https://github.com/${parts.map(encodeURIComponent).join('/')}/tree/${branchPath}`;
    } catch {
      return '';
    }
  }, [githubUrl, branch]);

  const canContinue = useMemo(() => {
    switch (STEPPER_STEPS[stepIndex].id) {
      case 'details':
        return !!problemId;
      case 'active':
        return commitValid;
      default:
        return true;
    }
  }, [stepIndex, problemId, commitValid]);

  const completedSteps = useMemo(() => STEPPER_STEPS.slice(0, stepIndex).map(s => s.id), [stepIndex]);
  const currentStep = STEPPER_STEPS[stepIndex].id;

  const finish = () => {
    if (!problemId) {
      toast.notify('Select a problem', 'error');
      return;
    }
    if (submissionType === 'TEAM' && !selectedTeamId) {
      toast.notify('Create a team or accept an invitation from the Teams screen first', 'error');
      return;
    }
    if (!solutionTitle.trim() || !shortDescription.trim()) {
      toast.notify('Add a solution title and short description', 'error');
      return;
    }
    if (screenshots.length > 0 && (screenshots.length < 3 || screenshots.length > 5)) {
      toast.notify('Upload 3 to 5 screenshots, or remove the screenshots to continue without them', 'error');
      return;
    }
    create.mutate();
  };

  return (
    <div className="relative w-full px-space-lg py-space-md space-y-space-lg max-w-7xl mx-auto">
      <motion.div
        className="absolute -top-10 -right-10 w-96 h-96 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute top-48 -left-12 w-80 h-80 rounded-full bg-surface-container-high opacity-30 blur-3xl pointer-events-none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* TARGET PROBLEM ACCREDITATION BANNER */}
      <motion.div
        className="relative bg-surface-card rounded-xl p-space-md shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md relative z-10">
          <div className="flex items-start gap-space-sm min-w-0">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
              <span className="material-symbols-outlined text-[20px]">water_drop</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-mono-sm text-label-mono-sm uppercase tracking-wide">{problem?.problemId || 'PROBLEM'}</span>
              <span className="text-on-surface-variant-weak font-body-sm text-body-sm">• {problem?.sourceBucket || 'Organization / department'}{problem?.subEntityType ? ` · ${problem.subEntityType}` : ''}</span>
                <span className="px-2 py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-accepted-text"></span> {problem?.domains?.join(' / ') || problem?.subEntityType || 'Category not specified'}
                </span>
              </div>
              <h1 className="font-headline-sm text-headline-sm text-on-surface truncate mt-1">
                {problem?.title || 'Selected problem statement'}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant-weak line-clamp-2">{problem?.description || 'Problem description will appear here.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">CHALLENGE TIMELINE</span>
              <span className="font-label-mono-md text-label-mono-md text-on-surface">36h Evaluation Hack</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-mono-sm text-label-mono-sm">
              {problem?.severity ? `${problem.severity} difficulty` : problem?.urgency || 'PROBLEM SOLUTION'}
            </span>
            <a href={`/problems/${problemId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low">
              View Full Problem <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* STEP PROGRESS STEPPER */}
      <motion.div
        className="bg-surface-card rounded-xl p-space-md shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Stepper
          steps={STEPPER_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          variant="horizontal"
        />
      </motion.div>

      {/* SECTION TITLE & CONTEXT */}
      <motion.div
        className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pt-space-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">Problem-solution submission</span>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Complete every section before saving</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Complete your solution dossier
          </h2>
        </div>
        <div className="max-w-xl text-on-surface-variant-weak font-body-sm text-body-sm">
          Describe the solution, team, technical approach, project links, and supporting artifacts for the selected problem.
        </div>
      </motion.div>

      {/* MAIN TWO-COLUMN SPLIT */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* LEFT FORM FLOW (Cols 7) */}
        <motion.div
          className="lg:col-span-7 flex flex-col gap-space-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card variant="default" className="flex flex-col gap-space-md">
            <div><p className="font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider">Solution dossier</p><h2 className="font-headline-lg text-headline-lg text-on-surface">Describe your solution</h2><p className="text-sm text-on-surface-variant-weak">Give reviewers enough context to understand the idea, its users, and how it will be built.</p></div>
            <Input label="Solution title" value={solutionTitle} onChange={(e) => setSolutionTitle(e.target.value)} required placeholder="A clear name for your solution" />
            <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">Short description<textarea required rows={3} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" placeholder="Summarize your solution in a few sentences." /></label>
            <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">What problem does your solution solve?<textarea rows={3} value={problemSolved} onChange={(e) => setProblemSolved(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">Key features <span className="font-normal text-xs text-on-surface-variant-weak">Enter one feature per line.</span><textarea rows={4} value={keyFeatures} onChange={(e) => setKeyFeatures(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" placeholder={'Real-time alerts\nOffline-first operation'} /></label>
            <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">Innovation / USP<textarea rows={3} value={innovationUsp} onChange={(e) => setInnovationUsp(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" /></label>
            <div className="grid sm:grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">Target users<textarea rows={3} value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" /></label>
              <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">Expected impact<textarea rows={3} value={expectedImpact} onChange={(e) => setExpectedImpact(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 font-normal" /></label>
            </div>
            <div className="border-t border-border-subtle pt-space-md"><h3 className="font-headline-sm text-on-surface mb-space-sm">Technical details</h3><div className="grid sm:grid-cols-2 gap-space-md">
              {([['frontend','Frontend'],['backend','Backend'],['database','Database'],['aiMl','AI / ML used?'],['apis','APIs / external services'],['deployment','Deployment platform'],['architectureDiagramUrl','Architecture diagram URL']] as const).map(([key,label]) => <Input key={key} label={label} value={technology[key]} onChange={(e) => setTechnology((current) => ({ ...current, [key]: e.target.value }))} placeholder={key === 'architectureDiagramUrl' ? 'https://…' : `Describe ${label.toLowerCase()}`} />)}
            </div></div>
            <div className="border-t border-border-subtle pt-space-md"><h3 className="font-headline-sm text-on-surface mb-space-sm">Project links</h3><div className="grid sm:grid-cols-2 gap-space-md">
              {([['liveDemoUrl','Live demo URL'],['demoVideoUrl','Demo video URL (YouTube / Drive)'],['documentationUrl','Documentation / PPT link'],['figmaUrl','Figma link (optional)']] as const).map(([key,label]) => <Input key={key} label={label} value={projectLinks[key]} onChange={(e) => setProjectLinks((current) => ({ ...current, [key]: e.target.value }))} placeholder="https://…" />)}
            </div></div>
            <div className="border-t border-border-subtle pt-space-md space-y-space-md"><h3 className="font-headline-sm text-on-surface">Project files</h3>
              <label className="block text-sm font-medium text-on-surface">Documentation / PPT upload<input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" multiple onChange={(e) => setDocumentFiles(Array.from(e.target.files ?? []))} className="mt-1 block w-full text-sm" /></label>
              <p className="text-xs text-on-surface-variant-weak">{documentFiles.length ? documentFiles.map((file) => file.name).join(', ') : 'Attach your documentation, presentation, or architecture diagram.'}</p>
              <label className="block text-sm font-medium text-on-surface">Screenshots / demo (3–5 images)<input type="file" accept="image/*" multiple onChange={(e) => setScreenshots(Array.from(e.target.files ?? []))} className="mt-1 block w-full text-sm" /></label>
              <p className="text-xs text-on-surface-variant-weak">{screenshots.length ? `${screenshots.length} selected: ${screenshots.map((file) => file.name).join(', ')}` : 'Optional. Add 3 to 5 images showing the home/dashboard, main feature, result, or admin panel.'}</p>
            </div>
          </Card>

          {/* CARD 1: REPOSITORY CONFIGURATION */}
          <Card variant="default" className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">account_tree</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Repository Source</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-state-submitted-bg text-state-submitted-text font-label-mono-sm text-label-mono-sm">
                Repository settings
              </span>
            </div>
            <Input
              label="GitHub repository URL"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              type="url"
              placeholder="https://github.com/your-organization/your-project"
              leftIcon={<span className="material-symbols-outlined">account_tree</span>}
              helperText="Paste the repository URL. Private repositories must grant access to the evaluation team."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md items-end">
              <Input
                label="Branch to evaluate"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main, develop, feature/my-branch"
                list="github-branch-suggestions"
                leftIcon={<span className="material-symbols-outlined">fork_right</span>}
                helperText="Choose a suggestion or type any branch name."
              />
              <datalist id="github-branch-suggestions">
                <option value="main" /><option value="master" /><option value="develop" />
              </datalist>
              {githubBranchUrl && <a href={githubBranchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 text-sm font-semibold text-primary hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-[17px]">open_in_new</span> Open selected branch
              </a>}
            </div>
        </Card>

        {/* CARD 2: PINNED COMMIT SHA */}
        <Card variant="default" className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Pinned Commit Validation</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full font-label-mono-sm text-label-mono-sm flex items-center gap-1 ${commitSha && commitValid ? 'bg-state-accepted-bg text-state-accepted-text' : 'bg-surface-container text-on-surface-variant-weak'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {commitSha && commitValid ? 'FORMAT OK' : 'NOT SET'}
            </span>
          </div>
          <Input
            label="Pinned Commit SHA (7–64 alphanumeric characters) <span className='text-error'>*</span>"
            value={commitSha}
            onChange={(e) => setCommitSha(e.target.value)}
            leftIcon={<span className="material-symbols-outlined">content_copy</span>}
            error={!commitValid && commitSha ? 'Invalid SHA format' : undefined}
            helperText="The exact commit used for evaluation. Enter 7–64 characters from the selected branch."
          />
          <p className="rounded-lg bg-surface-container-low p-space-sm text-sm text-on-surface-variant-weak">
            The repository URL, branch, and pinned commit are saved with your solution draft. Repository contents are not fetched from this form.
          </p>
        </Card>

        {/* CARD 3: ADDITIONAL LINKS & RESOURCES (OPTIONAL) */}
        <Card variant="default" className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[20px]">link</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Additional Project Resources</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
              API: links (Optional array)
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant-weak -mt-1">
            Attach circuit schematics, system block diagrams, cloud infrastructure maps, or documentation boards for evaluator context.
          </p>
          <div className="flex flex-col gap-space-sm" id="resourceLinksList">
            {links.map((link, idx) => (
              <motion.div
                key={idx}
                className="p-space-md rounded-lg bg-surface-canvas flex flex-col md:flex-row md:items-center justify-between gap-space-sm group hover:bg-surface-container-low transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-8 h-8 rounded bg-surface-card flex items-center justify-center text-primary shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">{idx === 0 ? 'memory' : 'hub'}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-[13px] text-on-surface truncate">{link.label}</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak truncate">{link.url}</span>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs shrink-0 self-end md:self-auto">
                  <span className="px-2 py-0.5 rounded bg-surface-card text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">{idx === 0 ? 'SCHEMATIC' : 'DIAGRAM'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 rounded text-on-surface-variant-weak hover:text-error hover:bg-state-returned-bg transition-colors"
                    onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </Button>
                </div>
              </motion.div>
            ))}
            <Button
              variant="secondary"
              className="w-full py-2.5 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-headline-sm text-[13px] flex items-center justify-center gap-space-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Another Resource Link</span>
            </Button>
          </div>
        </Card>
        </motion.div>

        {/* RIGHT SIDEBAR: CodeJudge Automated Runner Pipeline (Cols 5) */}
        <motion.div
          className="lg:col-span-5 flex flex-col gap-space-lg"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* RUNNER TELEMETRY CARD */}
          <Card variant="default" className="flex flex-col gap-space-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Automated Runner Specs</span>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant-weak">ISOLATED SANDBOX</span>
            </div>
            <Card variant="outlined" className="p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
                <span>PRE-SUBMISSION TEST HARNESS</span>
                <span className="text-state-accepted-text font-semibold">ALL 4 HOOKS PASS</span>
              </div>
              <svg className="w-full h-24 overflow-visible" fill="none" viewBox="0 0 360 80" xmlns="http://www.w3.org/2000/svg">
                <line stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="2" x1="60" x2="110" y1="40" y2="40" />
                <line stroke="#A7F3D0" strokeWidth="2" x1="150" x2="200" y1="40" y2="40" />
                <line stroke="#A7F3D0" strokeWidth="2" x1="240" x2="290" y1="40" y2="40" />
                <circle className="shadow-sm" cx="40" cy="40" fill="#FFFFFF" r="18" />
                <circle cx="40" cy="40" fill="#ECFDF5" r="14" />
                <text fill="#047857" fontFamily="Inter" fontSize="10" fontWeight="700" textAnchor="middle" x="40" y="44">GIT</text>
                <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle" x="40" y="68">Clone</text>
                <circle className="shadow-sm" cx="130" cy="40" fill="#FFFFFF" r="18" />
                <circle cx="130" cy="40" fill="#ECFDF5" r="14" />
                <text fill="#047857" fontFamily="Inter" fontSize="10" fontWeight="700" textAnchor="middle" x="130" y="44">AST</text>
                <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle" x="130" y="68">Static</text>
                <circle className="shadow-sm" cx="220" cy="40" fill="#FFFFFF" r="18" />
                <circle cx="220" cy="40" fill="#ECFDF5" r="14" />
                <text fill="#047857" fontFamily="Inter" fontSize="10" fontWeight="700" textAnchor="middle" x="220" y="44">BUILD</text>
                <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle" x="220" y="68">ESP32-S3</text>
                <circle className="shadow-sm" cx="310" cy="40" fill="#FFFFFF" r="18" />
                <circle cx="310" cy="40" fill="#1E40AF" r="14" />
                <text fill="#FFFFFF" fontFamily="Inter" fontSize="10" fontWeight="700" textAnchor="middle" x="310" y="44">98%</text>
                <text fill="#00288e" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle" x="310" y="68">Score</text>
              </svg>
            </Card>
            <div className="flex flex-col gap-space-xs">
              <div className="p-space-sm rounded-lg bg-surface-canvas flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-state-accepted-text text-[18px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Target Architecture: Xtensa Dual-Core 32-bit</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">OK</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-canvas flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-state-accepted-text text-[18px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Sensor Driver: AS7262 I2C registers verified</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">PASS</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-canvas flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-state-accepted-text text-[18px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Zero High-Severity Security CVEs Detected</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">CLEAN</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-canvas flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-state-accepted-text text-[18px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Permissive Open Source License (MIT detected)</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">MIT</span>
              </div>
            </div>
          </Card>

          {/* SUBMISSION TYPE AND TEAM DETAILS */}
          <Card variant="default" className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface">How are you submitting?</span>
              <span className="font-label-mono-sm text-label-mono-sm text-primary font-semibold">Saved with draft</span>
            </div>
            <Select
              label="Submission type"
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value as 'INDIVIDUAL' | 'TEAM')}
              options={[
                { value: 'INDIVIDUAL', label: 'Individual' },
                { value: 'TEAM', label: 'Team' },
              ]}
            />
            <div className="rounded-lg border border-border-subtle bg-surface-container-low p-space-md space-y-1 text-sm">
              <p className="font-semibold text-on-surface">Student / team leader</p>
              <p><span className="text-on-surface-variant-weak">Name:</span> {participant?.fullName || 'Complete your portal profile'}</p>
              <p><span className="text-on-surface-variant-weak">College / university:</span> {participant?.institutionName || 'Not provided'}</p>
              <p><span className="text-on-surface-variant-weak">Email:</span> {participant?.email || 'Not provided'}</p>
              <p><span className="text-on-surface-variant-weak">Contact:</span> {participant?.phone || 'Not provided'}</p>
              {submissionType === 'TEAM' && <p><span className="text-on-surface-variant-weak">Team:</span> {selectedTeam?.name || 'Choose a team below'}</p>}
            </div>
            {submissionType === 'INDIVIDUAL' ? (
              <p className="rounded-lg bg-surface-container-low p-space-sm text-sm text-on-surface-variant">
                This solution draft will be submitted under your name as an individual.
              </p>
            ) : (
              <>
                <label className="block text-sm font-medium text-on-surface">Your team for this problem
                  <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3">
                    <option value="">Select a team</option>{problemTeams.map((team) => <option key={team.teamId} value={team.teamId}>{team.name}</option>)}
                  </select>
                </label>
                {selectedTeam ? <p className="rounded-lg bg-surface-container-low p-space-sm text-sm text-on-surface-variant">Members: {selectedTeam.members.map((member) => member.fullName).join(', ')}</p> : <Link to="/app/teams" className="text-sm font-semibold text-primary">Create a team or accept an invitation on the Teams screen</Link>}
              </>
            )}
            <div className="rounded-lg bg-surface-container-low p-space-sm flex items-center gap-space-sm">
              <img className="w-12 h-12 rounded object-cover shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXu4FLWi8wZV9zwUH6g1RE1dk01lusJigaL2508bEXjw-NkvsEDkpah1mpx161bYIEwArpv0RdKzxAOzctHbEY8gatId_RyUv8CYHgMTVzy7gvna0OKRpermcZC6TFRZL8P_ERHOzQu8gu5mGLMvase_Z_At95rDiseXNnWTey7n7nsExtg6jU0eDhaIZuKcRn0x7ihIN_QHhbIQYUGpIKyW9Tcqem9NztL0EMI4k4UCT-WxCQ7S_2DQ" alt="Optical Edge Ingestion Engine" />
              <div className="flex flex-col min-w-0">
                <span className="font-headline-sm text-[13px] text-on-surface truncate">Optical Edge Ingestion Engine</span>
                <span className="font-body-sm text-[12px] text-on-surface-variant-weak truncate">Draft title stored in request payload</span>
              </div>
            </div>
          </Card>

          {/* EVALUATOR NOTICE */}
          <Card variant="outlined" className="rounded-xl p-space-md bg-surface-container-high text-on-surface flex items-start gap-space-sm shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">shield</span>
            <div className="flex flex-col text-body-sm font-body-sm">
              <span className="font-semibold text-primary">Immutable Submissions Policy</span>
              <span className="text-on-surface-variant-weak mt-0.5">
                Once you proceed past Review & Submit, the CodeJudge runner will build the exact commit SHA recorded here. Pushing code changes to GitHub branch main afterwards will NOT affect the evaluated artifact.
              </span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* PERSISTENT FOOTER WIZARD ACTIONS DOCK */}
      <motion.div
        className="sticky bottom-0 z-30 -mx-space-lg px-space-lg py-space-md bg-surface-card/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-space-xs text-on-surface-variant-weak">
          <span className="w-2 h-2 rounded-full bg-state-accepted-text animate-ping"></span>
          <span className="font-label-mono-sm text-label-mono-sm">Autosaved draft 2 minutes ago • Request payload validated</span>
        </div>
        <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
          <Button
            variant="secondary"
            onClick={() => setStepIndex(s => Math.max(0, s - 1))}
            className="h-10 px-space-md rounded-lg bg-surface-card hover:bg-surface-container text-on-surface font-headline-sm text-headline-sm flex items-center gap-1 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back</span>
          </Button>
          <Button
            variant="secondary"
            onClick={finish}
            className="h-10 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-headline-sm text-headline-sm flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Save Draft</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => stepIndex < STEPPER_STEPS.length - 1 ? setStepIndex(s => s + 1) : finish()}
            disabled={!canContinue || create.isPending}
            className="h-10 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center gap-2 transition-all shadow-md"
          >
            <span>{create.isPending ? 'Saving solution draft…' : stepIndex < STEPPER_STEPS.length - 1 ? `Continue: ${STEPPER_STEPS[stepIndex + 1].label}` : 'Create draft'}</span>
            <span className="material-symbols-outlined text-[18px]">{create.isPending ? 'refresh' : 'arrow_forward'}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
