import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMe, useMySubmissions, useProblems } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card } from '../../components/ui';
import { shortId } from '../../models/labels';
import type { Submission } from '../../types/dto';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { authed, user } = useAuth();
  const meQuery = useMe(authed);
  const subsQuery = useMySubmissions(authed);
  const problemsQuery = useProblems(authed);

  const participant = meQuery.data;
  const submissions = subsQuery.data ?? [];
  const problems = problemsQuery.data ?? [];
  const displayName = participant?.fullName || user?.phone || 'Participant';

  const drafts = submissions.filter((s) => s.status === 'DRAFT');
  const underReview = submissions.filter((s) => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED');
  const accepted = submissions.filter((s) => s.status === 'ACCEPTED');
  const latestDraft = [...drafts].sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())[0];

  const kpis = [
    { label: 'Available Problems', value: problems.length, variant: 'primary' as const, icon: 'travel_explore', desc: 'Accessible under participant rule' },
    { label: 'Active Drafts', value: drafts.length, variant: 'review' as const, icon: 'edit_document', desc: 'Ready to configure or submit' },
    { label: 'Under Review', value: underReview.length, variant: 'submitted' as const, icon: 'hourglass_top', desc: 'Assigned to official evaluation panel' },
    { label: 'Accepted Solutions', value: accepted.length, variant: 'accepted' as const, icon: 'verified', desc: 'Approved in Review Round 1' },
  ];

  const recent = [...submissions]
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, 5);
  const recommended = [...problems].slice(0, 2);

  const loading = meQuery.isLoading || subsQuery.isLoading;

  return (
    <div className="max-w-[1600px] w-full mx-auto px-space-md lg:px-space-xl py-space-lg space-y-space-xl page-transition">
      {/* Welcome Banner */}
      <motion.div
        className="relative overflow-hidden bg-surface-card rounded-xl p-space-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.div
          className="absolute right-40 -bottom-20 w-64 h-64 rounded-full bg-secondary-fixed/30 blur-2xl pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex items-center gap-space-sm">
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm">
                <span className="w-2 h-2 rounded-full bg-state-accepted-text animate-pulse"></span>
                Live Gateway Connected
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Good afternoon, {displayName}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Welcome to your innovation workspace. Manage drafts, track continuous evaluation metrics, and orchestrate technical deliverables with your hackathon team.
            </p>
          </div>
          <LinkButton
            to="/app/problems"
            className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary-container hover:bg-state-submitted-text text-on-primary font-headline-sm text-headline-sm transition-all shadow-sm self-start lg:self-center"
          >
            <span>Explore New Problems</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </LinkButton>
        </div>
      </motion.div>

      {/* Metrics KPI Quadrant */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">{kpi.label}</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.variant === 'primary' ? 'bg-surface-container-low' : kpi.variant === 'review' ? 'bg-state-review-bg/50' : kpi.variant === 'submitted' ? 'bg-state-submitted-bg' : 'bg-state-accepted-bg'} ${kpi.variant === 'primary' ? 'text-primary' : kpi.variant === 'review' ? 'text-state-review-text' : kpi.variant === 'submitted' ? 'text-state-submitted-text' : 'text-state-accepted-text'}`}>
                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs mt-space-md">
              <span className="font-display-lg text-display-lg text-on-surface">{kpi.value}</span>
              <span className={`font-label-mono-sm font-medium ${kpi.variant === 'primary' ? 'text-state-accepted-text' : kpi.variant === 'review' ? 'text-state-review-text' : kpi.variant === 'submitted' ? 'text-state-submitted-text' : 'text-state-accepted-text'}`}>
                {kpi.variant === 'primary' ? 'OPEN' : kpi.variant === 'review' ? 'STAGED' : kpi.variant === 'submitted' ? 'CYCLE 1' : 'QUALIFIED'}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant-weak mt-space-xs">{kpi.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Continue Working on Draft */}
      <motion.div
        className="flex flex-col gap-space-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-lg text-headline-lg text-on-surface">Continue Working on Draft</span>
            {latestDraft && (
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">ACTIVE SESSION</span>
            )}
          </div>
          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">AUTOSAVE ENGAGED</span>
        </div>
        {latestDraft ? (
          <motion.div
            className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
              <div className="flex flex-wrap items-center gap-space-sm">
                <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-state-review-bg text-state-review-text font-label-mono-sm text-label-mono-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-review-text"></span>
                  DRAFT
                </span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">update</span>
                  Saved 18 mins ago
                </span>
                <span className="font-label-mono-sm px-space-xs py-0.5 rounded bg-surface-container-low text-primary">ID: {shortId(latestDraft.submissionId)}</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-label-mono-sm text-label-mono-sm text-primary font-semibold">Stage 3 of 5</span>
                <div className="w-32 h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <motion.div
                    className="bg-primary h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">{latestDraft.title || 'Untitled submission'}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl">
                Problem Linked
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm py-space-sm">
              <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-canvas">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant-weak">groups</span>
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">TEAM ROSTER</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">Team EDITH (4 members)</span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-canvas">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant-weak">attach_file</span>
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">ATTACHMENTS</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">2 files uploaded (14.2 MB)</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-canvas">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px] text-primary">commit</span>
                  <div className="flex flex-col">
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">PINNED REPOSITORY</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold">commit a4f8b2c</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-on-surface-variant-weak hover:text-on-surface" onClick={() => navigator.clipboard.writeText('a4f8b2c')}>
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-space-xs text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm pt-space-xs">
              <span className="flex items-center gap-1 text-state-accepted-text"><span className="material-symbols-outlined text-[14px]">check_circle</span> 1. Problem Binding</span>
              <span className="text-border-subtle">/</span>
              <span className="flex items-center gap-1 text-state-accepted-text"><span className="material-symbols-outlined text-[14px]">check_circle</span> 2. Architecture Spec</span>
              <span className="text-border-subtle">/</span>
              <span className="flex items-center gap-1 text-primary font-bold"><span className="material-symbols-outlined text-[14px]">radio_button_checked</span> 3. Git Repo Binding</span>
              <span className="text-border-subtle">/</span>
              <span className="flex items-center gap-1 text-on-surface-variant-weak"><span className="material-symbols-outlined text-[14px]">radio_button_unchecked</span> 4. Benchmarks</span>
              <span className="text-border-subtle">/</span>
              <span className="flex items-center gap-1 text-on-surface-variant-weak"><span className="material-symbols-outlined text-[14px]">radio_button_unchecked</span> 5. Final Dispatch</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-md mt-space-xs border-t border-border-subtle">
              <div className="flex items-center gap-space-sm">
                <LinkButton
                  to={`/app/submissions/${latestDraft.submissionId}`}
                  className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm transition-all shadow-sm"
                >
                  <span>Continue Building Solution</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </LinkButton>
                <Button variant="secondary" className="px-space-md py-space-sm rounded-lg bg-surface-canvas hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-colors">
                  Save Offline Snapshot
                </Button>
              </div>
              <Button variant="destructive" className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-state-returned-bg text-state-returned-text hover:bg-error-container font-headline-sm text-headline-sm transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Discard Draft</span>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="bg-surface-card rounded-xl p-space-lg shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Start your first submission</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Pick a problem statement and draft your solution.</p>
            <LinkButton
              to="/app/problems"
              className="btn-primary mt-4 inline-flex items-center gap-1 rounded-lg bg-primary text-white text-sm font-bold px-4 py-2"
            >
              Explore problems <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </LinkButton>
          </motion.div>
        )}
      </motion.div>

      {/* Recent Submissions & Status */}
      <motion.div
        className="flex flex-col gap-space-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Recent Submissions & Status</h2>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">{submissions.length} ACTIVE</span>
          </div>
          <LinkButton
            to="/app/submissions"
            className="font-body-sm text-body-sm text-primary hover:underline flex items-center gap-0.5"
          >
            <span>View All in Submission Vault</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </LinkButton>
        </div>
        <Card variant="default" className="overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-space-md px-space-lg py-space-sm bg-surface-container-low text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm uppercase">
            <div className="col-span-4">Solution & Target Problem</div>
            <div className="col-span-2">Team Entity</div>
            <div className="col-span-3">State & Review Cycle</div>
            <div className="col-span-1 text-center">Round</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <motion.div key={i} className="h-12 rounded skeleton-shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 100 }} />)}</div>
          ) : recent.length === 0 ? (
            <p className="p-space-lg text-on-surface-variant-weak">No submissions yet.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {recent.map((s: Submission, idx) => (
                <motion.div
                  key={s.submissionId}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-space-md p-space-lg hover:bg-surface-canvas/80 transition-colors items-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="lg:col-span-4 flex flex-col gap-space-xs min-w-0">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">ID: {shortId(s.submissionId)}</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-primary">• IoT / Edge Telemetry</span>
                    </div>
                    <Link className="font-headline-sm text-headline-sm text-on-surface hover:text-primary transition-colors truncate" to={`/app/submissions/${s.submissionId}`}>
                      {s.title || 'Untitled submission'}
                    </Link>
                    <p className="font-body-sm text-body-sm text-on-surface-variant-weak truncate">
                      Decentralized Cold-Chain Telemetry (Ministry of Health & Family Welfare)
                    </p>
                  </div>
                  <div className="lg:col-span-2 flex flex-col">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant-weak">shield_person</span>
                      CryoTrackers
                    </span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">3 Contributors</span>
                  </div>
                  <div className="lg:col-span-3 flex flex-col gap-space-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full font-label-mono-sm text-label-mono-sm font-semibold ${
                        s.status === 'RETURNED' ? 'bg-state-returned-bg text-state-returned-text' :
                        s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? 'bg-state-submitted-bg text-state-submitted-text' :
                        'bg-state-accepted-bg text-state-accepted-text'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'RETURNED' ? 'bg-state-returned-text' : s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? 'bg-state-submitted-text' : 'bg-state-accepted-text'}${s.status === 'SUBMITTED' ? ' animate-ping' : ''}`}></span>
                        {s.status}
                      </span>
                      <span className="font-body-sm text-body-sm" style={{ color: `var(--color-${s.status === 'RETURNED' ? 'state-returned-text' : s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? 'state-submitted-text' : 'state-accepted-text'})` }}>
                        {s.status === 'RETURNED' ? 'Changes Requested' : s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? 'Assigned to Evaluator' : 'Ranked #2 in Zone'}
                      </span>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">Remarks: Calibrate sensor precision docs</span>
                  </div>
                  <div className="lg:col-span-1 flex lg:justify-center">
                    <span className="font-label-mono-md text-label-mono-md px-space-sm py-0.5 rounded bg-surface-container-high text-on-surface">R1</span>
                  </div>
                  <div className="lg:col-span-2 flex lg:justify-end">
                    <Button
                      variant={s.status === 'RETURNED' ? 'destructive' : s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? 'ghost' : 'secondary'}
                      size="sm"
                      className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg font-headline-sm text-headline-sm transition-colors"
                    >
                      {s.status === 'RETURNED' ? (
                        <>Edit & Resubmit <span className="material-symbols-outlined text-[16px]">arrow_forward</span></>
                      ) : s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' ? (
                        <>View Submission <span className="material-symbols-outlined text-[16px]">visibility</span></>
                      ) : (
                        <>View Dossier <span className="material-symbols-outlined text-[16px]">folder_open</span></>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Recommended Priority Challenges */}
      <motion.div
        className="flex flex-col gap-space-md pb-space-xl mt-space-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Recommended Priority Challenges</h2>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">
              {recommended.length > 0 ? `MATCHED TO ${recommended[0]?.title ? 'YOUR INTERESTS' : 'TRENDING TECH'}` : 'RECOMMENDED'}
            </span>
          </div>
          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak hidden sm:inline">HIGH ENGAGEMENT</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {recommended.map((p, idx) => (
            <motion.div
              key={p.problemId}
              className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden group hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm">
                    <span className="material-symbols-outlined text-[14px]">memory</span>
                    EDGE AI / EMBEDDED
                  </span>
                  {idx === 0 && (
                    <span className="font-label-mono-sm text-label-mono-sm text-error flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-error"></span>
                      HIGH URGENCY
                    </span>
                  )}
                </div>
                <div className="relative w-full h-40 rounded-lg overflow-hidden bg-surface-canvas mt-space-xs">
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent flex items-end p-space-sm">
                    <span className="font-label-mono-sm text-label-mono-sm text-surface">Ministry of Railways</span>
                  </div>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">
                    Real-Time Track Obstruction & Thermal Crack Detector
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant-weak line-clamp-2">
                    Deploy ultra-low-power vision inference at 60 FPS under vibration stress to flag millimeter ballast shifts and thermal stress fractures prior to train arrival.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <div className="flex items-center justify-between p-space-xs rounded bg-surface-canvas font-label-mono-sm text-label-mono-sm">
                  <span className="text-on-surface-variant-weak flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-state-submitted-text">trending_up</span>
                    Velocity Index: 88%
                  </span>
                  <svg className="w-28 h-5 text-secondary overflow-visible" fill="none" viewBox="0 0 100 20">
                    <path d="M0 16 L20 14 L40 17 L60 8 L80 10 L100 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <circle cx="100" cy="2" fill="currentColor" r="3" />
                  </svg>
                  <span className="text-on-surface font-semibold">14 Teams Active</span>
                </div>
                <div className="flex items-center justify-between gap-space-sm pt-space-xs">
                  <div className="flex items-center gap-space-xs text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
                    <span>PRIZE POOL: ₹1,00,000</span>
                  </div>
                  <LinkButton
                    to={`/app/problems/${p.problemId}`}
                    className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high text-primary font-headline-sm text-headline-sm transition-colors"
                  >
                    <span>Inspect Problem</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </LinkButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}