import { useParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { SignInPrompt } from '../../components/feedback/SignInPrompt';
import { useProblem } from '../../hooks/usePortalQueries';
import { formatLocation } from '../../lib/formatters';
import {
  ACCESS_RULE_LABEL,
  SEVERITY_LABEL,
  SOURCE_BUCKET_LABEL,
  URGENCY_LABEL,
  formatDate,
} from '../../models/labels';
import { Button, LinkButton } from '../../components/ui';

export default function ProblemDetailPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const { authed } = useAuth();
  const toast = useToast();
  const { data: problem, isLoading, isError, error, refetch } = useProblem(problemId, authed);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.notify('Problem link copied to clipboard', 'success');
    } catch {
      toast.notify('Could not copy link', 'error');
    }
  };

  const getUrgencyVariant = (urgency: string | undefined) => {
    switch (urgency) {
      case 'IMMEDIATE': return { bg: 'bg-state-returned-bg', text: 'text-state-returned-text', border: 'border-state-returned-border', pulse: true };
      case 'SHORT_TERM': return { bg: 'bg-state-review-bg', text: 'text-state-review-text', border: 'border-state-review-border', pulse: false };
      default: return { bg: 'bg-state-draft-bg', text: 'text-state-draft-text', border: 'border-state-draft-border', pulse: false };
    }
  };

  const getSeverityVariant = (severity: string | undefined) => {
    switch (severity) {
      case 'CRITICAL': return { bg: 'bg-state-returned-bg', text: 'text-state-returned-text', icon: 'error' };
      case 'HIGH': return { bg: 'bg-state-review-bg', text: 'text-state-review-text', icon: 'priority_high' };
      default: return { bg: 'bg-surface-container-high', text: 'text-on-surface', icon: 'remove' };
    }
  };

  if (!authed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SignInPrompt title="Sign in to view this problem" message="Problem details are available to verified participants." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        <div className="h-6 w-40 rounded skeleton-shimmer" />
        <div className="h-40 rounded-xl skeleton-shimmer" />
        <div className="h-64 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  if (isError || !problem) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="material-symbols-outlined text-state-returned-text text-4xl">error</div>
        <p className="mt-3 font-semibold text-state-returned-text">Could not load this problem.</p>
        <p className="text-sm text-on-surface-variant mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => refetch()} variant="primary">
            Retry
          </Button>
          <LinkButton to="/problems" variant="secondary">
            Back to explorer
          </LinkButton>
        </div>
      </div>
    );
  }

  const urgencyVariant = getUrgencyVariant(problem.urgency ?? undefined);
  const severityVariant = getSeverityVariant(problem.severity ?? undefined);

  return (
    <div className="max-w-7xl mx-auto w-full px-space-md md:px-space-lg py-space-md">
      {/* TOP BREADCRUMB & METADATA BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
        <div className="flex items-center gap-space-sm flex-wrap">
          <LinkButton
            to="/problems"
            variant="ghost"
            className="inline-flex items-center gap-space-xs font-headline-sm text-headline-sm text-primary hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Problems</span>
          </LinkButton>
          <span className="text-on-surface-variant-weak">•</span>
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded font-label-mono-sm text-label-mono-sm text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant-weak">tag</span>
            <span>PROBLEM STATEMENT</span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs bg-state-accepted-bg text-state-accepted-text px-space-sm py-space-xs rounded-full border-0">
          <span className="w-1.5 h-1.5 rounded-full bg-state-accepted-text animate-pulse"></span>
          <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-wider font-semibold">Published & Open for Submissions</span>
        </div>
      </div>

      {/* MAIN HERO / HEADER CONTAINER */}
      <div className="relative bg-surface-card rounded-xl p-space-lg md:p-space-xl shadow-sm mb-space-lg overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-gradient-to-br from-primary/10 via-secondary-container/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-space-md">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-space-sm">
            {problem.sourceBucket && (
              <div className="flex items-center gap-space-xs bg-surface-container text-primary px-space-sm py-space-xs rounded font-label-mono-sm text-label-mono-sm uppercase tracking-wide">
                <span className="material-symbols-outlined text-[14px]">account_balance</span>
                <span>{SOURCE_BUCKET_LABEL[problem.sourceBucket as keyof typeof SOURCE_BUCKET_LABEL]}</span>
                <span className="text-on-surface-variant-weak">/</span>
                <span>Central Government</span>
              </div>
            )}
            {problem.urgency && (
              <div className={`inline-flex items-center gap-space-xs ${urgencyVariant.bg} ${urgencyVariant.text} px-space-sm py-space-xs rounded-full font-label-mono-sm text-label-mono-sm uppercase font-semibold ${urgencyVariant.pulse ? 'animate-pulse-ring' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(--color-${urgencyVariant.text.replace('-text', '')})` }}></span>
                <span>{URGENCY_LABEL[problem.urgency as keyof typeof URGENCY_LABEL]}</span>
              </div>
            )}
            {problem.severity && (
              <div className="inline-flex items-center gap-space-xs bg-state-returned-bg text-state-returned-text px-space-sm py-space-xs rounded-full font-label-mono-sm text-label-mono-sm uppercase font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-state-returned-text"></span>
                <span>Severity: {SEVERITY_LABEL[problem.severity as keyof typeof SEVERITY_LABEL]}</span>
              </div>
            )}
            {problem.accessRule && (
              <div className="flex items-center gap-space-xs bg-surface-container-high text-primary px-space-sm py-space-xs rounded font-label-mono-sm text-label-mono-sm uppercase">
                <span className="material-symbols-outlined text-[14px]">school</span>
                <span>{ACCESS_RULE_LABEL[problem.accessRule as keyof typeof ACCESS_RULE_LABEL]}</span>
              </div>
            )}
          </div>
          {/* Problem Title */}
          <h1 className="font-display-lg text-display-lg text-on-surface max-w-4xl tracking-tight">
            {problem.title}
          </h1>
          {/* Timestamp & Governance Meta */}
          <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-body-sm text-body-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant-weak">calendar_today</span>
              <span>Published on {formatDate(problem.publishedAt)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-state-accepted-text">verified</span>
              <span className="text-on-surface font-medium">Evaluation Cycle Completed</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span>{formatLocation(problem.location)}</span>
            </div>
          </div>
          {/* Action Bar with Notice */}
          <div className="pt-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm">
              <LinkButton
                to={`/app/submissions/new?problemId=${problem.problemId}`}
                variant="secondary"
                className="inline-flex items-center justify-center gap-space-xs px-space-lg h-11 rounded-lg bg-primary-container text-on-primary font-headline-sm text-headline-sm hover:bg-primary shadow-sm transition-all"
              >
                <span>Start Solution Draft</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </LinkButton>
              <Button
                variant="ghost"
                className="inline-flex items-center gap-space-xs px-space-md h-11 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md transition-colors"
                onClick={share}
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant-weak">share</span>
                <span>Share</span>
              </Button>
              <Button
                variant="ghost"
                className="inline-flex items-center gap-space-xs px-space-md h-11 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant-weak">download</span>
                <span>Download Brief (PDF)</span>
              </Button>
            </div>
            {/* Active Submission Constraint Badge */}
            <div className="flex items-start sm:items-center gap-space-xs bg-state-submitted-bg text-state-submitted-text px-space-md py-space-sm rounded-lg max-w-md">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 sm:mt-0">info</span>
              <span className="font-body-sm text-body-sm leading-snug">
                <strong className="font-semibold">Active Limit:</strong> You can hold exactly 1 active submission (Draft, Submitted, or Under Review) for this problem statement.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start pb-space-xl">
        {/* LEFT COLUMN (65% width / 8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* SECTION 1: PROBLEM DESCRIPTION */}
          <section className="bg-surface-card rounded-xl p-space-lg md:p-space-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">water_drop</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">1. Problem Statement & Bottlenecks</h2>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Section 01/03</span>
            </div>
            <div className="prose max-w-none text-on-surface-variant font-body-lg text-body-lg space-y-space-md">
              <p>
                {problem.description || 'No detailed description published.'}
              </p>
              {/* Technical Schematic Visual Banner */}
              <div className="mt-space-sm bg-surface-canvas rounded-xl p-space-md">
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Field Telemetry Architecture Target</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-state-submitted-text">SPEC // ARCH-2026</span>
                </div>
                <div className="w-full bg-surface-card rounded-lg p-space-md overflow-x-auto">
                  <svg className="w-full min-w-[500px] h-28 text-on-surface" fill="none" viewBox="0 0 600 110" xmlns="http://www.w3.org/2000/svg">
                    <rect fill="currentColor" fillOpacity="0.04" height="70" rx="8" width="120" x="10" y="20" />
                    <text fill="#00288E" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" textAnchor="middle" x="70" y="48">UV-VIS SENSOR</text>
                    <text fill="#64748B" fontFamily="Inter" fontSize="10" textAnchor="middle" x="70" y="66">Flow Chamber</text>
                    <path d="M135 55 H175" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="2" />
                    <polygon fill="#94A3B8" points="175,55 168,51 168,59" />
                    <rect fill="currentColor" fillOpacity="0.04" height="70" rx="8" width="130" x="180" y="20" />
                    <text fill="#00288E" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" textAnchor="middle" x="245" y="48">MCU EDGE DSP</text>
                    <text fill="#64748B" fontFamily="Inter" fontSize="10" textAnchor="middle" x="245" y="66">Spectral Inference</text>
                    <path d="M315 55 H355" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="2" />
                    <polygon fill="#94A3B8" points="355,55 348,51 348,59" />
                    <rect fill="currentColor" fillOpacity="0.04" height="70" rx="8" width="120" x="360" y="20" />
                    <text fill="#00288E" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" textAnchor="middle" x="420" y="48">LoRaWAN/NB-IoT</text>
                    <text fill="#64748B" fontFamily="Inter" fontSize="10" textAnchor="middle" x="420" y="66">868 MHz / 4G Uplink</text>
                    <path d="M485 55 H515" stroke="#10B981" strokeWidth="2" />
                    <polygon fill="#10B981" points="515,55 508,51 508,59" />
                    <circle cx="550" cy="55" fill="#ECFDF5" r="24" />
                    <text fill="#047857" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" textAnchor="middle" x="550" y="59">SIH HUB</text>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: EXPECTED OUTCOMES */}
          <section className="bg-surface-card rounded-xl p-space-lg md:p-space-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">checklist</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">2. Concrete Functional Expectations</h2>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Section 02/03</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Submissions will be programmatically and empirically benchmarked on the following engineering parameters. Theoretical designs without functional hardware verification cannot qualify for grand finale stages.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
              {/* Requirement Card 1 */}
              <div className="bg-surface-canvas p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase font-semibold">Bill of Materials (BOM)</span>
                  <span className="px-space-xs py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm">&#8203;₹4,500</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Affordable Unit Cost Target</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Complete hardware component cost (spectroscopic emitter/detector array, edge processor, power regulation, IP67 housing) cannot exceed ₹4,500 (~$55 USD) at 1,000-unit assembly scale.
                  </p>
                </div>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Metric: Audited BOM spreadsheet verification</div>
              </div>
              {/* Requirement Card 2 */}
              <div className="bg-surface-canvas p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase font-semibold">Chemical Accuracy</span>
                  <span className="px-space-xs py-0.5 rounded bg-state-submitted-bg text-state-submitted-text font-label-mono-sm text-label-mono-sm">PPM Precision</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Nitrate & Fluoride Limits</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Demonstrated limit of detection (LOD) for Nitrate ions (NO3⁻) below 10 mg/L and Fluoride below 1.5 mg/L in turbidity conditions ranging from 5 to 50 NTU without physical chemical pre-filtration.
                  </p>
                </div>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Metric: Lab blind standard comparison test</div>
              </div>
              {/* Requirement Card 3 */}
              <div className="bg-surface-canvas p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase font-semibold">Telemetry & Low-Power</span>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">LoRaWAN / NB-IoT</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Off-Grid Transmission</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Autonomous payload delivery over unlicensed LoRaWAN bands (IN865) or NB-IoT networks with sleep power current consumption strictly under 25µA between reading cycles.
                  </p>
                </div>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Metric: Current shunt power-draw profiling</div>
              </div>
              {/* Requirement Card 4 */}
              <div className="bg-surface-canvas p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase font-semibold">Open Engineering</span>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface font-label-mono-sm text-label-mono-sm">Reproducible</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Firmware & CAD Openness</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Submission must link a public or evaluator-accessible Git repository containing PlatformIO / CMake firmware build instructions, schematic CAD (KiCad), and STEP 3D enclosure files.
                  </p>
                </div>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Metric: Evaluator automated build script pass</div>
              </div>
            </div>
          </section>

          {/* SECTION 3: ACCESS RULES & ELIGIBILITY */}
          <section className="bg-surface-card rounded-xl p-space-lg md:p-space-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">rule</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">3. Access Rules & Team Eligibility</h2>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Section 03/03</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="bg-surface-canvas p-space-md rounded-lg flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface-variant-weak">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span className="font-label-mono-sm text-label-mono-sm uppercase">Permitted Kind</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {problem.accessRule === 'OPEN_TO_ALL' ? 'Open to All' : problem.accessRule === 'UNIVERSITY_ONLY' ? 'University Only' : 'Selected Universities'}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Affiliated active university students, research fellows, or collegiate polytechnics.</p>
              </div>
              <div className="bg-surface-canvas p-space-md rounded-lg flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface-variant-weak">
                  <span className="material-symbols-outlined text-[16px]">pin</span>
                  <span className="font-label-mono-sm text-label-mono-sm uppercase">Team Limit</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface">1 to 6 Members</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Includes 1 Team Lead. Multi-disciplinary cross-departmental teams recommended.</p>
              </div>
              <div className="bg-surface-canvas p-space-md rounded-lg flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface-variant-weak">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                  <span className="font-label-mono-sm text-label-mono-sm uppercase">Artifact Pipeline</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface">3 Key Deliverables</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">PDF Brief, YouTube / Loom Video (max 3 mins), Git repository with pinned commit SHA.</p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (35% width / 4 cols) */}
        <aside className="lg:col-span-4 flex flex-col gap-space-lg">
          {/* STICKY QUICK ACTION CARD */}
          <div className="sticky top-20 z-20 flex flex-col gap-space-lg">
            {/* SUBMIT CALLOUT CARD */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-md flex flex-col gap-space-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary-container"></div>
              <div className="flex items-center justify-between">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Submission Workspace</span>
                <span className="px-space-xs py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm font-semibold">Active</span>
              </div>
              <div className="flex flex-col gap-space-xs">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">Ready to solve this problem?</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Assemble your cohort and initialize your working telemetry and hardware design packet.
                </p>
              </div>
              <div className="bg-surface-canvas p-space-sm rounded-lg flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant-weak">lock</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Only 1 active submission allowed per participant</span>
              </div>
              <LinkButton
                to={`/app/submissions/new?problemId=${problem.problemId}`}
                className="w-full flex items-center justify-center gap-space-xs h-11 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-sm"
              >
                <span>Start Solution Draft</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </LinkButton>
              <div className="flex items-center justify-between pt-space-xs text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
                <span>PROBLEM</span>
                <span>DEADLINE: 30 NOV 2024</span>
              </div>
            </div>

            {/* PROBLEM INTELLIGENCE CARD */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Problem Intelligence</h3>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant-weak">hub</span>
              </div>
              <div className="flex flex-col gap-space-sm divide-y divide-border-subtle">
                <div className="flex flex-col py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Source Entity</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium">{problem.sourceBucket ? SOURCE_BUCKET_LABEL[problem.sourceBucket as keyof typeof SOURCE_BUCKET_LABEL] : 'Unknown'}</span>
                </div>
                <div className="flex flex-col py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Source Bucket</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium">{problem.sourceBucket ? SOURCE_BUCKET_LABEL[problem.sourceBucket as keyof typeof SOURCE_BUCKET_LABEL] : 'Unknown'}</span>
                </div>
                <div className="flex flex-col py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Sub-Entity Type</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium">Central Department</span>
                </div>
                <div className="flex items-center justify-between py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Urgency Tier</span>
                  <span className={`font-label-mono-sm text-label-mono-sm font-semibold px-space-xs py-0.5 rounded ${urgencyVariant.bg} ${urgencyVariant.text} ${urgencyVariant.border} ${urgencyVariant.pulse ? 'animate-pulse-ring' : ''}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(--color-${urgencyVariant.text.replace('-text', '')})` }}></span>
                    {URGENCY_LABEL[problem.urgency as keyof typeof URGENCY_LABEL] || 'Normal'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Severity Level</span>
                  <span className={`font-label-mono-sm text-label-mono-sm font-semibold px-space-xs py-0.5 rounded ${severityVariant.bg} ${severityVariant.text}`}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: `var(--color-${severityVariant.text.replace('-text', '')})` }}>{severityVariant.icon}</span>
                    {SEVERITY_LABEL[problem.severity as keyof typeof SEVERITY_LABEL] || 'Medium'}
                  </span>
                </div>
                <div className="flex flex-col py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Target Inflow Zone</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium">{formatLocation(problem.location)}</span>
                </div>
                <div className="flex items-center justify-between py-space-xs">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Evidence Files</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-primary font-medium">{problem.evidenceCount} Verified Documents</span>
                </div>
              </div>
              {/* DOMAINS & TECH TAGS */}
              <div className="pt-space-sm">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase block mb-space-xs">Domains & Technology Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {(problem.domains ?? []).map((d) => (
                    <span key={d} className="bg-surface-container text-primary font-label-mono-sm text-label-mono-sm px-space-xs py-0.5 rounded">
                      {d}
                    </span>
                  ))}
                  {(problem.domains ?? []).length === 0 && (
                    <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">None listed</span>
                  )}
                </div>
              </div>
            </div>

            {/* ATTACHED BACKGROUND DOCUMENTS */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Official Reference Briefs</h3>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">{problem.evidenceCount} FILES</span>
              </div>
              <div className="flex flex-col gap-space-sm">
                {Array.from({ length: problem.evidenceCount }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-space-sm bg-surface-canvas hover:bg-surface-container transition-colors rounded-lg group">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">picture_as_pdf</span>
                      <div className="min-w-0 flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Reference_Document_{i + 1}.pdf</span>
                        <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">~2.5 MB • Technical Spec</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 p-space-xs text-on-surface-variant-weak hover:text-primary transition-colors"
                      onClick={() => {}}
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </Button>
</div>
            ))}
          </div>
        </div>
      </div>
      </aside>
      </div>
    </div>
  );
}