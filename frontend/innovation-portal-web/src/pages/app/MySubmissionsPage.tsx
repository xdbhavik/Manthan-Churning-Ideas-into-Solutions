import { useMemo, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMySubmissions } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card } from '../../components/ui';
import { shortId } from '../../models/labels';
import type { Submission, SubmissionStatus } from '../../types/dto';
import { motion } from 'framer-motion';
import { Tabs } from '../../components/ui';

type TabId = 'all' | 'draft' | 'under_review' | 'returned' | 'accepted';

const TAB_DEFS: { id: TabId; label: string; badgeVariant: 'neutral' | 'draft' | 'submitted' | 'returned' | 'accepted' }[] = [
  { id: 'all', label: 'All', badgeVariant: 'neutral' },
  { id: 'draft', label: 'Draft', badgeVariant: 'draft' },
  { id: 'under_review', label: 'Under Review', badgeVariant: 'submitted' },
  { id: 'returned', label: 'Returned', badgeVariant: 'returned' },
  { id: 'accepted', label: 'Accepted', badgeVariant: 'accepted' },
] as const;

function SubmissionCard({ submission, index }: { submission: Submission; index: number }) {
  const status = submission.status;
  const statusBg = status === 'RETURNED' ? 'bg-state-review-bg' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'bg-state-submitted-bg' : status === 'DRAFT' ? 'bg-state-draft-bg' : 'bg-state-accepted-bg';
  const statusText = status === 'RETURNED' ? 'text-state-review-text' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'text-state-submitted-text' : status === 'DRAFT' ? 'text-state-draft-text' : 'text-state-accepted-text';
  const statusBorder = status === 'RETURNED' ? 'border-state-review-border' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'border-state-submitted-border' : status === 'DRAFT' ? 'border-state-draft-border' : 'border-state-accepted-border';
  const leftBorder = status === 'RETURNED' ? 'bg-state-review-text' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'bg-state-submitted-text' : status === 'DRAFT' ? 'bg-state-draft-text' : 'bg-state-accepted-text';
  const pulseClass = (status === 'UNDER_REVIEW' || status === 'SUBMITTED') ? ' animate-ping' : status === 'RETURNED' ? ' animate-pulse' : '';

  const statusLabel = status === 'RETURNED' ? 'RETURNED (Changes Requested)' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'UNDER REVIEW' : status === 'DRAFT' ? 'DRAFT' : 'ACCEPTED (QUALIFIED)';
  const timeLabel = status === 'RETURNED' ? 'Due: Oct 19, 2024 · 23:59 IST' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'Submitted: Oct 14, 2024 · 11:20 IST' : status === 'DRAFT' ? 'Last modified: 25 mins ago' : 'Decided: Oct 08, 2024';
  const problemLabel = status === 'RETURNED' ? 'Decentralized Cold-Chain Telemetry' : status === 'UNDER_REVIEW' ? 'Dynamic EV Charging Load Balancer' : status === 'DRAFT' ? 'Automated Micro-Pollutant Detection' : 'Automated Pothole and Road Degradation';
  const problemIcon = status === 'RETURNED' ? 'domain' : status === 'UNDER_REVIEW' ? 'bolt' : status === 'DRAFT' ? 'water_drop' : 'commute';

  return (
    <motion.div
      className={`submission-card bg-surface-card rounded-xl p-space-lg shadow-${status === 'RETURNED' ? 'md' : 'sm'} hover:shadow-md transition-all relative overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${leftBorder}`}></div>
      <div className="flex flex-col gap-space-md pl-space-xs">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-mono-sm text-label-mono-sm font-semibold tracking-wide ${statusBg} ${statusText} ${statusBorder}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'RETURNED' ? 'bg-state-review-text' : status === 'UNDER_REVIEW' || status === 'SUBMITTED' ? 'bg-state-submitted-text' : status === 'DRAFT' ? 'bg-state-draft-text' : 'bg-state-accepted-text'}${pulseClass}`}></span>
              {statusLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
              ID: {shortId(submission.submissionId)}
            </span>
            {status === 'RETURNED' && <span className="font-body-sm text-on-surface-variant-weak">Priority Action Required</span>}
            {status === 'DRAFT' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">UNSAVED BATCH</span>}
            {status === 'DRAFT' && <span className="font-body-sm text-on-surface-variant-weak">Step 3 of 5 Completed</span>}
          </div>
          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
            {timeLabel}
          </span>
        </div>
        <div className="space-y-space-xs">
          <h2 className="font-headline-lg text-headline-lg text-on-surface hover:text-primary transition-colors cursor-pointer">
            {submission.title || 'Untitled submission'}
          </h2>
          <div className="flex items-center gap-space-xs text-on-surface-variant-weak font-body-md">
            <span className="material-symbols-outlined text-[18px]">{problemIcon}</span>
            <span className="font-body-md text-body-md">{problemLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md p-space-sm bg-surface-container-low/50 rounded-lg text-body-sm">
          <div>
            <div className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm uppercase">Team</div>
            <div className="font-headline-sm text-headline-sm text-on-surface truncate">{submission.team?.name || 'Individual'}</div>
          </div>
          <div>
            <div className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm uppercase">{status === 'RETURNED' ? 'Review Stage' : status === 'UNDER_REVIEW' ? 'Attached Artifacts' : status === 'DRAFT' ? 'Wizard Progression' : 'Submitter'}</div>
            <div className="font-headline-sm text-headline-sm text-on-surface">{status === 'RETURNED' ? 'Round 1 Evaluation' : status === 'UNDER_REVIEW' ? '3 files (22 MB)' : status === 'DRAFT' ? '60% Completed (3 / 5 Steps)' : 'Yogesh Ghule (Individual)'}</div>
          </div>
          <div>
            <div className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm uppercase">{status === 'RETURNED' ? 'Submitted On' : status === 'UNDER_REVIEW' ? 'Phase Cycle' : status === 'DRAFT' ? 'Next Step' : 'Final Stage'}</div>
            <div className="font-headline-sm text-headline-sm text-on-surface">{status === 'RETURNED' ? 'Oct 12, 2024' : status === 'UNDER_REVIEW' ? 'Round 1 - Technical' : status === 'DRAFT' ? 'Team & Mentor Verification' : 'Round 2 (Final Qualifier)'}</div>
          </div>
          <div>
            <div className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm uppercase">{status === 'RETURNED' ? 'Assigned Assessor' : status === 'UNDER_REVIEW' ? 'Est. Completion' : status === 'DRAFT' ? 'Remaining' : 'National Rank'}</div>
            <div className="font-headline-sm text-headline-sm text-on-surface">{status === 'RETURNED' ? 'Assigned Problem Evaluator' : status === 'UNDER_REVIEW' ? '48 Hours' : status === 'DRAFT' ? 'Architecture Diagram & Git Mirror' : '#4 in Hardware Track'}</div>
          </div>
        </div>
        {status === 'RETURNED' && (
          <div className="p-space-md rounded-xl bg-state-review-bg/40 text-on-surface space-y-space-xs">
            <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm text-state-review-text">
              <span className="material-symbols-outlined text-[20px]">feedback</span>
              <span>Reviewer Feedback & Action Items</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              "Hardware schematic looks promising, but the LoRa payload compression format lacks unit benchmarks. Update the technical documentation and re-upload before final scoring."
            </p>
            <div className="pt-space-xs flex items-center gap-space-md font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">description</span> 2 files require revision
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">history</span> Return cycle: 1 of 2 max
              </span>
            </div>
          </div>
        )}
        {status === 'UNDER_REVIEW' && (
          <div className="p-space-md rounded-xl bg-surface-container-low text-on-surface flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-state-submitted-text mt-0.5">lock_clock</span>
            <div className="space-y-0.5">
              <span className="font-headline-sm text-headline-sm text-on-surface">Locked for Assessment</span>
              <p className="font-body-md text-body-md text-on-surface-variant-weak">
                Submission is currently undergoing evaluation by the problem evaluator. Edits are disabled until a decision is returned.
              </p>
            </div>
          </div>
        )}
        {status === 'DRAFT' && (
          <div className="space-y-space-xs">
            <div className="flex justify-between font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
              <span>WIZARD PROGRESSION</span>
              <span>60% Completed (3 / 5 Steps)</span>
            </div>
            <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-primary-container h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="flex justify-between font-body-sm text-on-surface-variant-weak pt-1">
              <span>Next: Team & Mentor Verification</span>
              <span>Remaining: Architecture Diagram & Git Mirror</span>
            </div>
          </div>
        )}
        {status === 'ACCEPTED' && (
          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
            <div className="flex items-center gap-space-md text-body-sm text-on-surface-variant-weak">
              <span className="flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-state-accepted-text">
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span> Grand Finale Pass Allocated
              </span>
              <span>·</span>
              <span className="font-label-mono-sm text-label-mono-sm">SHA: 77f903a...</span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
            {status === 'RETURNED' && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error"></span> Review window closes in 4 days</span>}
            {status === 'UNDER_REVIEW' && (
              <span className="flex items-center gap-space-sm font-body-sm">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">visibility</span> 2 Evaluators reviewing</span>
                <span>·</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check</span> Plagiarism: 3.2% (Passed)</span>
              </span>
            )}
            {status === 'DRAFT' && <span className="flex items-center gap-space-sm font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
              <span className="material-symbols-outlined text-[16px]">groups</span> Team EDITH (4 members)
            </span>}
            {status === 'ACCEPTED' && <span className="flex items-center gap-space-sm font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
              <span className="flex items-center gap-1 text-state-accepted-text"><span className="material-symbols-outlined text-[16px]">military_tech</span> Certificate</span>
            </span>}
          </div>
          <div className="flex items-center gap-space-sm">
            {status === 'RETURNED' && (
              <>
                <Button variant="secondary" size="sm" className="px-space-md h-9 rounded-lg bg-surface-card hover:bg-surface-container-low text-on-surface font-headline-sm text-headline-sm transition-colors shadow-sm">
                  Inspect Feedback & Files
                </Button>
                <Button variant="destructive" size="sm" className="inline-flex items-center gap-space-xs px-space-md h-9 rounded-lg bg-state-review-text text-on-primary hover:opacity-90 font-headline-sm text-headline-sm shadow transition-all">
                  <span>Edit & Resubmit Submission</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Button>
              </>
            )}
            {status === 'UNDER_REVIEW' && (
              <Button variant="secondary" size="sm" className="px-space-md h-9 rounded-lg bg-surface-card hover:bg-surface-container-low text-on-surface font-headline-sm text-headline-sm transition-colors shadow-sm">
                View Submission Dossier
              </Button>
            )}
            {status === 'DRAFT' && (
              <>
                <Button variant="destructive" size="sm" className="px-space-md h-9 rounded-lg bg-state-returned-bg text-state-returned-text hover:bg-state-returned-border/50 font-headline-sm text-headline-sm transition-colors">
                  Discard Draft
                </Button>
                <Button variant="primary" size="sm" className="inline-flex items-center gap-space-xs px-space-md h-9 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-headline-sm transition-all shadow-sm">
                  <span>Resume Wizard</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Button>
              </>
            )}
            {status === 'ACCEPTED' && (
              <>
                <Button variant="secondary" size="sm" className="inline-flex items-center gap-space-xs px-space-md h-9 rounded-lg bg-surface-card hover:bg-surface-container-low text-on-surface font-headline-sm text-headline-sm transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">military_tech</span>
                  <span>Certificate</span>
                </Button>
                <Button variant="primary" size="sm" className="inline-flex items-center gap-space-xs px-space-md h-9 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-headline-sm text-headline-sm transition-all shadow-sm">
                  <span>View Final Accepted Dossier</span>
                  <span className="material-symbols-outlined text-[18px]">launch</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MySubmissionsPage() {
  const { authed } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMySubmissions(authed);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const submissions = data ?? [];
  const counts = useMemo(() => ({
    all: submissions.length,
    draft: submissions.filter(s => s.status === 'DRAFT').length,
    under_review: submissions.filter(s => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED').length,
    returned: submissions.filter(s => s.status === 'RETURNED').length,
    accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
  }), [submissions]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return submissions;
    const statusMap: Record<string, SubmissionStatus[]> = {
      draft: ['DRAFT'],
      under_review: ['UNDER_REVIEW', 'SUBMITTED'],
      returned: ['RETURNED'],
      accepted: ['ACCEPTED'],
    };
    return submissions.filter(s => statusMap[activeTab]?.includes(s.status));
  }, [submissions, activeTab]);

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-xl max-w-[1600px] mx-auto w-full">
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="space-y-space-xs">
          <h1 className="font-display-lg text-display-lg text-on-surface">My Submissions</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Track, manage, and inspect all individual and team submissions across review rounds.
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <Button variant="secondary" className="inline-flex items-center gap-space-xs px-space-md h-10 rounded-lg bg-surface-card text-on-surface hover:bg-surface-container-low transition-colors shadow-sm font-headline-sm text-headline-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Summary</span>
          </Button>
          <LinkButton
            to="/app/submissions/new"
            variant="primary"
            className="inline-flex items-center gap-space-xs px-space-md h-10 rounded-lg bg-primary-container text-on-primary hover:bg-state-submitted-text transition-all shadow-md font-headline-sm text-headline-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Submission Draft</span>
          </LinkButton>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card variant="default" className="p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant-weak">
            <span className="font-label-mono-sm text-label-mono-sm uppercase">Total Active</span>
            <span className="material-symbols-outlined text-[20px]">folder_copy</span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-sm">
            <span className="font-display-lg text-display-lg text-on-surface">{counts.all}</span>
            <span className="font-label-mono-sm text-state-accepted-text flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> 100% on schedule
            </span>
          </div>
        </Card>
        <Card variant="default" className="p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-state-review-text">
            <span className="font-label-mono-sm text-label-mono-sm uppercase">Action Required</span>
            <span className="material-symbols-outlined text-[20px]">notification_important</span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-sm">
            <span className="font-display-lg text-display-lg text-state-review-text">{counts.returned}</span>
            <span className="font-label-mono-sm text-on-surface-variant-weak">Needs resubmission</span>
          </div>
        </Card>
        <Card variant="default" className="p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-state-submitted-text">
            <span className="font-label-mono-sm text-label-mono-sm uppercase">Under Evaluation</span>
            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-sm">
            <span className="font-display-lg text-display-lg text-on-surface">{counts.under_review}</span>
            <span className="font-label-mono-sm text-state-submitted-text">Round 1</span>
          </div>
        </Card>
        <Card variant="default" className="p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-state-accepted-text">
            <span className="font-label-mono-sm text-label-mono-sm uppercase">Accepted Solutions</span>
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-sm">
            <span className="font-display-lg text-display-lg text-state-accepted-text">{counts.accepted}</span>
            <span className="font-label-mono-sm text-on-surface-variant-weak">Grand Final Qualified</span>
          </div>
        </Card>
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <Tabs
          tabs={TAB_DEFS.map(t => ({
            id: t.id,
            label: t.label,
            badge: counts[t.id],
            badgeVariant: t.badgeVariant,
          }))}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as TabId)}
          variant="pills"
        />
        <div className="flex items-center gap-space-sm text-on-surface-variant-weak font-body-sm">
          <span className="material-symbols-outlined text-[16px]">sync</span>
          <span>Live — synced with backend</span>
        </div>
      </motion.div>

      <motion.div
        className="space-y-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3, 4].map(i => <motion.div key={i} className="h-24 rounded-xl skeleton-shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} />)}</div>
        ) : isError ? (
          <div className="bg-state-returned-bg border border-state-returned-border rounded-xl p-8 text-center">
            <div className="material-symbols-outlined text-state-returned-text text-3xl">error</div>
            <p className="mt-2 font-semibold text-state-returned-text">Failed to load submissions.</p>
            <p className="text-sm text-on-surface-variant-weak mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button onClick={() => refetch()} variant="primary" className="mt-4">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="py-20 text-center bg-surface-card rounded-xl border border-border-subtle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="animate-float w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle inline-flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary text-3xl">filter_alt_off</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-4">No submissions match this filter</h3>
            <p className="font-body-md text-body-md text-on-surface-variant-weak max-w-md mx-auto mt-1">
              No submissions found for the selected status. Try a different filter.
            </p>
          </motion.div>
        ) : (
          filtered.map((s, idx) => <SubmissionCard key={s.submissionId} submission={s} index={idx} />)
        )}
      </motion.div>

      <motion.div
        className="p-space-lg rounded-xl bg-surface-card shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0 shadow-xs text-primary">
            <span className="material-symbols-outlined text-[28px]">help_center</span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Have questions about evaluator remarks?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant-weak">Read the review guidelines or open an expedited dispute ticket with the nodal hackathon committee.</p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <Button variant="secondary" className="px-space-md h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-headline-sm text-headline-sm transition-colors">
            Evaluation Matrix
          </Button>
          <Button variant="primary" className="px-space-md h-9 rounded-lg bg-secondary text-on-secondary hover:opacity-90 font-headline-sm text-headline-sm transition-colors shadow-sm">
            Contact Nodal Desk
          </Button>
        </div>
      </motion.div>
    </div>
  );
}