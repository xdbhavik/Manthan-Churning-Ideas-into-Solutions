import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { useProblems, useProblem } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card, Input, Select, Stepper } from '../../components/ui';
import type { SubmissionCreateRequest, SubmissionLink } from '../../types/dto';
import { motion } from 'framer-motion';

const COMMIT_RE = /^[A-Za-z0-9._-]{7,64}$/;

const STEPPER_STEPS = [
  { id: 'details', label: 'Basic Information', shortLabel: '01. DETAILS', icon: <span className="material-symbols-outlined text-[15px]">description</span> },
  { id: 'squad', label: 'Team Builder', shortLabel: '02. SQUAD', icon: <span className="material-symbols-outlined text-[15px]">groups</span> },
  { id: 'active', label: 'Code Repository', shortLabel: '03. ACTIVE', icon: <span className="material-symbols-outlined text-[15px]">terminal</span> },
  { id: 'files', label: 'Project Artifacts', shortLabel: '04. FILES', icon: <span className="material-symbols-outlined text-[15px]">folder</span> },
  { id: 'signoff', label: 'Review & Submit', shortLabel: '05. SIGN-OFF', icon: <span className="material-symbols-outlined text-[15px]">checklist</span> },
];

export default function CreateSubmissionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authed } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const pre = params.get('problemId') ?? '';

  const [stepIndex, setStepIndex] = useState(2); // Start at step 3 (Repository)
  const [problemId] = useState(pre);
  const [githubUrl, setGithubUrl] = useState('https://github.com/team-edith/edgespectra-firmware');
  const [branch, setBranch] = useState('main');
  const [commitSha, setCommitSha] = useState('a4f8b2c90e1f3d456789abcdef0123456789abcd');
  const [links, setLinks] = useState<SubmissionLink[]>([
    { label: 'Hardware Schematics (EasyEDA/KiCad)', url: 'https://oshwlab.com/edith/edgespectra-v1' },
    { label: 'System Architecture Miro Board', url: 'https://miro.com/app/board/edith-spec' },
  ]);

  useProblems(authed); // Left to cache problem list if needed, or we can just import useProblem
  const { data: problem } = useProblem(problemId, authed);

  const create = useMutation({
    mutationFn: () => {
      const body: SubmissionCreateRequest = {
        problemId,
        githubUrl: githubUrl.trim() || undefined,
        branch: branch.trim() || undefined,
        commitSha: commitSha.trim() || undefined,
        links: links.filter((l) => l.url.trim()),
      };
      return portal.createSubmission(body);
    },
    onSuccess: (s) => {
      toast.notify('Draft created', 'success');
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
      navigate(`/app/submissions/${s.submissionId}`);
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  const commitValid = commitSha === '' || COMMIT_RE.test(commitSha);

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
                <span className="text-on-surface-variant-weak font-body-sm text-body-sm">• Ministry of Jal Shakti</span>
                <span className="px-2 py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-accepted-text"></span> HARDWARE / EMBEDDED
                </span>
              </div>
              <h1 className="font-headline-sm text-headline-sm text-on-surface truncate mt-1">
                Automated Micro-Pollutant Detection in Rural Water Inflows via Edge Spectroscopy
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">CHALLENGE TIMELINE</span>
              <span className="font-label-mono-md text-label-mono-md text-on-surface">36h Evaluation Hack</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-mono-sm text-label-mono-sm">
              STAGE 2 CODING
            </span>
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
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">Code Repository</span>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">v2.4 Runner Pipeline</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Connect Code Repository
          </h2>
        </div>
        <div className="max-w-xl text-on-surface-variant-weak font-body-sm text-body-sm">
          The evaluation engine runs automated static and functional checks against your code repository. Your solution is evaluated strictly against the <strong className="text-on-surface">pinned commit SHA</strong>, not a moving branch HEAD.
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
                API Parameter: githubUrl
              </span>
            </div>
            <Input
              label="GitHub Repository URL"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/team-edith/edgespectra-firmware"
              helperText="Repository must be public or the evaluation bot invited"
            />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-end">
            <div className="md:col-span-7">
              <Select
                label="Target Branch"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                options={[
                  { value: 'main', label: 'main (protected)' },
                  { value: 'develop', label: 'develop' },
                  { value: 'feature/as7262-driver', label: 'feature/as7262-driver' },
                  { value: 'release/v0.8.2', label: 'release/v0.8.2' },
                ]}
              />
            </div>
            <div className="md:col-span-5">
              <Button variant="secondary" className="w-full h-10 px-space-md rounded-lg bg-surface-container-low text-primary font-headline-sm text-[13px] hover:bg-surface-container flex items-center justify-center gap-space-xs transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Inspect & Fetch</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-space-xs text-state-accepted-text bg-state-accepted-bg px-space-md py-2 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span className="font-body-sm text-body-sm">Repository ping successful (Public Read Access confirmed via GitHub REST API v3)</span>
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
            <span className="px-2 py-0.5 rounded-full bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-state-accepted-text"></span> VERIFIED
            </span>
          </div>
          <Input
            label="Pinned Commit SHA (7–64 alphanumeric characters)"
            required
            value={commitSha}
            onChange={(e) => setCommitSha(e.target.value)}
            error={!commitValid && commitSha ? 'Invalid SHA format' : undefined}
          />
          <Card variant="outlined" className="p-space-md flex flex-col gap-space-sm">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-start gap-space-sm">
                <img className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiLkMcdrUAJpQ4PJTAPI89ushLccUZiyDLkZbeETzN0LgmjDCZON3IuGFpflbBrkVzYE0Trmn2IIOW6XsfEm6zoQrUHB4wm5erF8LQ6cVntu67Y9fJ8IjRNa966I-5RmSNsZQP3Ihf7hCJ1tFl6ERDKOB5FMdtiSRTO-q6wjcZp7NqDqf54EWuPZgRUIsMDXitNuhUmxbilE19AmpyuIY2PSBBYNfdlQ4a32MSpZXV3r6tfn11bQAXFQ" alt="Yogesh Ghule" />
                <div className="flex flex-col">
                  <span className="font-headline-sm text-[14px] text-on-surface leading-snug">
                    feat(spectral): integrate AS7262 optical sensor driver and calibration routine
                  </span>
                  <div className="flex items-center gap-space-xs mt-1 text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
                    <span className="text-on-surface font-medium">yogesh-ghule</span>
                    <span>committed 2 hours ago</span>
                    <span>•</span>
                    <span className="text-primary font-mono">tree: c77e90</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-secondary shrink-0 font-label-mono-sm text-label-mono-sm flex items-center gap-1" onClick={() => {}}>
                View on GitHub <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </Button>
            </div>
            <div className="flex items-center gap-space-md pt-2 font-label-mono-sm text-label-mono-sm">
              <span className="flex items-center gap-1 text-state-accepted-text">
                <span className="material-symbols-outlined text-[14px]">add_circle</span> +432 lines
              </span>
              <span className="flex items-center gap-1 text-state-returned-text">
                <span className="material-symbols-outlined text-[14px]">remove_circle</span> -48 lines
              </span>
              <span className="flex items-center gap-1 text-on-surface-variant-weak">
                <span className="material-symbols-outlined text-[14px]">description</span> 7 files changed
              </span>
              <span className="ml-auto px-2 py-0.5 rounded bg-surface-card text-on-surface">GPG SIGNED</span>
            </div>
          </Card>
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
                  <div className="flex flex-col gap-space-xs w-full">
                    <Input
                      placeholder="Resource Title (e.g. System Architecture)"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[idx].label = e.target.value;
                        setLinks(newLinks);
                      }}
                    />
                    <Input
                      placeholder="Resource URL (e.g. https://...)"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[idx].url = e.target.value;
                        setLinks(newLinks);
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-space-xs shrink-0 self-end md:self-auto">
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
              onClick={() => setLinks([...links, { label: '', url: '' }])}
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

          {/* TEAM CONTEXT CARD */}
          <Card variant="default" className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface">Submission Identity</span>
              <span className="font-label-mono-sm text-label-mono-sm text-primary font-semibold">TEAM EDITH #26043</span>
            </div>
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">LEAD INNOVATOR</span>
                <span className="font-headline-sm text-[13px] text-on-surface truncate mt-0.5">Yogesh Ghule</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant-weak">yg.innovate@sih.gov</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">CONTRIBUTORS</span>
                <span className="font-headline-sm text-[13px] text-on-surface truncate mt-0.5">4 Confirmed</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant-weak">memberUserIds [OK]</span>
              </div>
            </div>
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
            <span>Back to Team</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {}}
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
            <span>{create.isPending ? 'Validating Repository...' : stepIndex < STEPPER_STEPS.length - 1 ? 'Continue to Project Files' : 'Create draft'}</span>
            <span className="material-symbols-outlined text-[18px]">{create.isPending ? 'refresh' : 'arrow_forward'}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}