import React from 'react';
import { PublishedProblem, Submission, ProjectReview, EvaluationCycle, JwtRole, Participant, NavPath } from '../types';

interface DashboardViewProps {
  problems: PublishedProblem[];
  submissions: Submission[];
  reviews: ProjectReview[];
  cycles: EvaluationCycle[];
  role: JwtRole;
  participant: Participant | null;
  onNavigate: (path: NavPath) => void;
  onSelectProblem: (problem: PublishedProblem) => void;
}

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  problems,
  submissions,
  reviews,
  cycles,
  role,
  participant,
  onNavigate,
  onSelectProblem,
}) => {
  const isParticipant = role === 'SUBMITTER';
  const isEvaluator = role === 'EVALUATOR';
  const isAdmin = role === 'ADMIN' || role === 'REVIEWER';

  const stats = [
    {
      label: isEvaluator ? 'Assigned Reviews' : 'Published Problems',
      value: isEvaluator ? reviews.filter((r) => r.reviewStatus === 'ASSIGNED').length : problems.length,
      icon: 'dataset',
      tint: 'bg-[#eff4ff] text-[#00152f]',
    },
    {
      label: isParticipant ? 'My Submissions' : isEvaluator ? 'Reviews Done' : 'Evaluation Cycles',
      value: isParticipant ? submissions.length : isEvaluator ? reviews.filter((r) => r.reviewStatus !== 'ASSIGNED').length : cycles.length,
      icon: 'folder_shared',
      tint: 'bg-[#dce9ff] text-[#00152f]',
    },
    {
      label: isParticipant ? 'Under Review' : isEvaluator ? 'Accepted' : 'Publishable',
      value: isParticipant
        ? submissions.filter((s) => s.status === 'UNDER_REVIEW').length
        : isEvaluator
        ? reviews.filter((r) => r.reviewStatus === 'ACCEPTED').length
        : cycles.filter((c) => ['EVALUATION_COMPLETED', 'SCORES_AGGREGATED', 'PRIORITIZED', 'PHASE_3_READY'].includes(c.status)).length,
      icon: 'hourglass_top',
      tint: 'bg-[#ffdfa0]/40 text-[#795900]',
    },
    {
      label: isParticipant ? 'Returned' : isEvaluator ? 'Returned' : 'In Progress',
      value: isParticipant || isEvaluator
        ? (isParticipant ? submissions : reviews).filter((x: any) => x.status === 'RETURNED' || x.reviewStatus === 'RETURNED').length
        : cycles.filter((c) => ['RECEIVED', 'ANALYZING', 'ROUTING', 'EVALUATION_IN_PROGRESS'].includes(c.status)).length,
      icon: 'warning',
      tint: 'bg-[#ffdad6] text-[#ba1a1a]',
    },
  ];

  const quickNav: { label: string; icon: string; path: NavPath; enabled: boolean }[] = [
    { label: 'Problem Catalog', icon: 'inventory_2', path: 'problem-catalog', enabled: isParticipant },
    { label: 'My Submissions', icon: 'folder_shared', path: 'my-submissions', enabled: isParticipant },
    { label: 'Project Review Queue', icon: 'fact_check', path: 'project-review-queue', enabled: isEvaluator },
    { label: 'Scoring Rubrics', icon: 'rule', path: 'evaluation-rubrics', enabled: isEvaluator },
    { label: 'Cycles & Publish', icon: 'published_with_changes', path: 'admin-cycles-and-publish', enabled: isAdmin },
    { label: 'Nodal Institutes', icon: 'corporate_fare', path: 'nodal-officers-directory', enabled: isAdmin },
  ];

  return (
    <div className="flex flex-col w-full pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#00152f] font-mono text-[11px] font-bold tracking-wide">
            SIH26043
          </span>
          <span className="text-[11px] font-semibold text-[#795900] px-2 py-0.5 rounded bg-[#ffdfa0]/60 border border-[#ffdfa0]">
            {role} · {participant?.participantType || '—'}
          </span>
        </div>
        <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">
          Welcome{participant?.fullName ? `, ${participant.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
          Live view of the innovation portal — problems, submissions{isEvaluator ? ', and your review queue' : ''}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">{s.label}</span>
                <span className="font-headline text-[32px] font-bold text-[#0b1c30] tracking-tight mt-1">{s.value}</span>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.tint}`}>
                <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Featured problems (participant) / recent reviews (evaluator) / cycles (admin) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-[15px] font-bold text-[#0b1c30]">
                {isParticipant ? 'Featured Problems' : isEvaluator ? 'Latest Reviews' : 'Evaluation Cycles'}
              </h2>
              {isParticipant && (
                <button onClick={() => onNavigate('problem-catalog')} className="text-[12px] text-[#795900] font-bold hover:underline" type="button">View All</button>
              )}
            </div>

            {isParticipant && problems.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#74777f]">No published problems yet.</div>
            )}
            {isParticipant && problems.slice(0, 3).map((p) => (
              <div key={p.problemId} onClick={() => onSelectProblem(p)} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] cursor-pointer hover:bg-[#eff4ff] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold text-[#00152f]">{shortId(p.problemId)}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#e5eeff] text-[#00152f]">{p.accessRule}</span>
                </div>
                <span className="font-semibold text-[13px] text-[#0b1c30]">{p.title}</span>
              </div>
            ))}

            {isEvaluator && reviews.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#74777f]">No project reviews yet.</div>
            )}
            {isEvaluator && reviews.slice(0, 4).map((r) => (
              <div key={r.reviewId} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[13px] text-[#0b1c30]">{r.submissionTitle || r.problemTitle}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${r.reviewStatus === 'ASSIGNED' ? 'bg-[#ffdfa0] text-[#795900]' : r.reviewStatus === 'ACCEPTED' ? 'bg-[#dce9ff] text-[#00152f]' : 'bg-[#ffdad6] text-[#ba1a1a]'}`}>{r.reviewStatus}</span>
                </div>
                <div className="text-[11px] text-[#74777f] mt-1">Round {r.submissionRound} · {r.submittedFiles.length} file(s)</div>
              </div>
            ))}

            {isAdmin && cycles.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#74777f]">No evaluation cycles yet.</div>
            )}
            {isAdmin && cycles.slice(0, 4).map((c) => (
              <div key={c.cycleId} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] flex items-center justify-between">
                <span className="font-mono text-[12px] font-bold text-[#00152f]">{shortId(c.cycleId)}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#74777f]">{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick nav */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-2">
            <h2 className="font-headline text-[15px] font-bold text-[#0b1c30] mb-1">Quick Access</h2>
            {quickNav.filter((q) => q.enabled).map((q) => (
              <button key={q.path} onClick={() => onNavigate(q.path)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#43474e] hover:bg-[#e5eeff] hover:text-[#0b1c30] text-[13px] font-medium transition-all text-left" type="button">
                <span className="material-symbols-outlined text-[19px]">{q.icon}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#0f2a4a] text-white flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a92b7]">Session</span>
            <span className="text-[13px] font-semibold">{participant?.fullName || 'You'}</span>
            <span className="text-[11px] text-[#dce9ff]">
              {participant?.participantType || role}{participant?.institutionName ? ` · ${participant.institutionName}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};