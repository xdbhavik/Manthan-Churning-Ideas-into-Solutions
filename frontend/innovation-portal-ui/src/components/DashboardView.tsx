<<<<<<< HEAD
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
=======
import React from 'react';
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
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

<<<<<<< HEAD
/* ── Animated count-up hook with cubic easing ── */
function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current && target === 0) return;
    started.current = true;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const animated = useCountUp(value);
  return <>{animated}</>;
};

=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
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
<<<<<<< HEAD
      iconBg: 'bg-[#FFF7ED] text-[#FF9933]',
=======
      tint: 'bg-[#eff4ff] text-[#00152f]',
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    },
    {
      label: isParticipant ? 'My Submissions' : isEvaluator ? 'Reviews Done' : 'Evaluation Cycles',
      value: isParticipant ? submissions.length : isEvaluator ? reviews.filter((r) => r.reviewStatus !== 'ASSIGNED').length : cycles.length,
      icon: 'folder_shared',
<<<<<<< HEAD
      iconBg: 'bg-[#EFF6FF] text-[#0A2540]',
=======
      tint: 'bg-[#dce9ff] text-[#00152f]',
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    },
    {
      label: isParticipant ? 'Under Review' : isEvaluator ? 'Accepted' : 'Publishable',
      value: isParticipant
        ? submissions.filter((s) => s.status === 'UNDER_REVIEW').length
        : isEvaluator
        ? reviews.filter((r) => r.reviewStatus === 'ACCEPTED').length
        : cycles.filter((c) => ['EVALUATION_COMPLETED', 'SCORES_AGGREGATED', 'PRIORITIZED', 'PHASE_3_READY'].includes(c.status)).length,
      icon: 'hourglass_top',
<<<<<<< HEAD
      iconBg: 'bg-emerald-50 text-[#138808]',
=======
      tint: 'bg-[#ffdfa0]/40 text-[#795900]',
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    },
    {
      label: isParticipant ? 'Returned' : isEvaluator ? 'Returned' : 'In Progress',
      value: isParticipant || isEvaluator
        ? (isParticipant ? submissions : reviews).filter((x: any) => x.status === 'RETURNED' || x.reviewStatus === 'RETURNED').length
        : cycles.filter((c) => ['RECEIVED', 'ANALYZING', 'ROUTING', 'EVALUATION_IN_PROGRESS'].includes(c.status)).length,
      icon: 'warning',
<<<<<<< HEAD
      iconBg: 'bg-red-50 text-red-500',
=======
      tint: 'bg-[#ffdad6] text-[#ba1a1a]',
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
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

<<<<<<< HEAD
  const firstName = participant?.fullName ? participant.fullName.split(' ')[0] : '';
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const welcomeText = `${greeting()}${firstName ? `, ${firstName}` : ''}`;
  const words = welcomeText.split(' ');

  return (
    <div className="flex flex-col w-full pb-14">
      {/* ── Hero Banner with tricolor mesh animation ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hero-gradient rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-lg"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Pulsing/glowing role chip */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 350 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/95 text-[11px] font-bold tracking-wide border border-white/20 mb-4 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
              <span>{participant?.participantType || role}</span>
              {participant?.institutionName && (
                <span className="text-white/70 font-normal">· {participant.institutionName}</span>
              )}
            </motion.div>

            {/* Staggered word reveal for greeting */}
            <h1 className="font-headline text-[32px] sm:text-[38px] font-bold text-white tracking-tight leading-tight flex flex-wrap gap-x-2">
              {words.map((word, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-[14px] sm:text-[15px] text-white/70 mt-2 leading-relaxed"
            >
              Your live portal command center for challenges, submissions
              {isEvaluator ? ', and active evaluations.' : '.'}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center gap-3 shrink-0"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                onNavigate(isEvaluator ? 'project-review-queue' : isAdmin ? 'admin-cycles-and-publish' : 'problem-catalog')
              }
              className="btn-sheen px-5 py-3 rounded-xl bg-white text-[#0A2540] font-bold text-[13px] hover:bg-white/95 transition-all flex items-center gap-2.5 shadow-md cursor-pointer"
              type="button"
            >
              <span>{isEvaluator ? 'Review Queue' : isAdmin ? 'Manage Cycles' : 'Browse Problems'}</span>
              <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Staggered Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex flex-col justify-between shadow-xs card-hover overflow-hidden relative cursor-default group"
          >
            {/* Top tricolor accent strip */}
            <div className="absolute top-0 left-0 right-0 h-[3px] tricolor-stripe" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{s.label}</span>
                <span className="font-headline text-[34px] font-bold text-[#0A2540] tracking-tight mt-1">
                  <AnimatedNumber value={s.value} />
                </span>
              </div>
              <motion.div
                whileHover={{ scale: 1.15, rotate: 6 }}
                transition={{ type: 'spring', stiffness: 350 }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${s.iconBg}`}
              >
                <span className="material-symbols-outlined text-[26px]">{s.icon}</span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel: featured items / empty states */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="lg:col-span-8 flex flex-col gap-4"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E7EB] flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h2 className="font-headline text-[17px] font-bold text-[#0A2540]">
                {isParticipant ? 'Featured Problems' : isEvaluator ? 'Latest Reviews' : 'Evaluation Cycles'}
              </h2>
              {isParticipant && (
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => onNavigate('problem-catalog')}
                  className="text-[12px] text-[#FF9933] font-bold flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  View All
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </motion.button>
              )}
            </div>

            {/* Participant empty state with looping micro-animation */}
            {isParticipant && problems.length === 0 && (
              <div className="py-12 px-6 text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-[#FFF7ED] flex items-center justify-center shadow-inner animate-float">
                  <span className="material-symbols-outlined text-[40px] text-[#FF9933]">inventory_2</span>
                </div>
                <div>
                  <h3 className="font-headline text-[17px] font-bold text-[#0A2540]">No Published Problems Yet</h3>
                  <p className="text-[13px] text-[#64748B] mt-1.5 max-w-md mx-auto leading-relaxed">
                    Evaluated problem statements will appear here once an evaluation cycle completes. In the meantime, you can explore the full catalog overview.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate('problem-catalog')}
                  className="btn-sheen mt-1 px-5 py-2.5 rounded-xl bg-[#0A2540] text-white font-bold text-[13px] hover:bg-[#163B65] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  type="button"
                >
                  <span>Browse the Full Catalog</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </motion.button>
              </div>
            )}

            {isParticipant &&
              problems.slice(0, 3).map((p) => (
                <motion.div
                  key={p.problemId}
                  whileHover={{ scale: 1.01, x: 2 }}
                  onClick={() => onSelectProblem(p)}
                  className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] cursor-pointer hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-all group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#FF9933] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#64748B]">{shortId(p.problemId)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE]">
                      {p.accessRule}
                    </span>
                  </div>
                  <span className="font-semibold text-[14px] text-[#1E293B] group-hover:text-[#0A2540] transition-colors">
                    {p.title}
                  </span>
                </motion.div>
              ))}

            {/* Evaluator empty state */}
            {isEvaluator && reviews.length === 0 && (
              <div className="py-12 px-6 text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center shadow-inner animate-float">
                  <span className="material-symbols-outlined text-[40px] text-[#138808]">fact_check</span>
                </div>
                <div>
                  <h3 className="font-headline text-[17px] font-bold text-[#0A2540]">No Reviews Assigned</h3>
                  <p className="text-[13px] text-[#64748B] mt-1.5 max-w-md mx-auto leading-relaxed">
                    You will see incoming project reviews here once submissions are assigned to your evaluation track.
                  </p>
                </div>
              </div>
            )}

            {isEvaluator &&
              reviews.slice(0, 4).map((r) => (
                <div
                  key={r.reviewId}
                  className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] hover:bg-[#EFF6FF] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[13px] text-[#1E293B]">
                      {r.submissionTitle || r.problemTitle}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        r.reviewStatus === 'ASSIGNED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : r.reviewStatus === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {r.reviewStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1.5">
                    Round {r.submissionRound} · {r.submittedFiles.length} file(s)
                  </div>
                </div>
              ))}

            {/* Admin empty state */}
            {isAdmin && cycles.length === 0 && (
              <div className="py-12 px-6 text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-[#EFF6FF] flex items-center justify-center shadow-inner animate-float">
                  <span className="material-symbols-outlined text-[40px] text-[#0A2540]">published_with_changes</span>
                </div>
                <div>
                  <h3 className="font-headline text-[17px] font-bold text-[#0A2540]">No Evaluation Cycles</h3>
                  <p className="text-[13px] text-[#64748B] mt-1.5 max-w-md mx-auto leading-relaxed">
                    Evaluation cycles are initialized when registered problems begin evaluation in the engine.
                  </p>
                </div>
              </div>
            )}

            {isAdmin &&
              cycles.slice(0, 4).map((c) => (
                <div
                  key={c.cycleId}
                  className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-between hover:bg-[#EFF6FF] transition-all"
                >
                  <span className="font-mono text-[12px] font-bold text-[#0A2540]">{shortId(c.cycleId)}</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B] border border-[#E5E7EB]">
                    {c.status}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Right panel: quick access */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="lg:col-span-4 flex flex-col gap-4"
        >
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-1.5 shadow-xs">
            <h2 className="font-headline text-[16px] font-bold text-[#0A2540] mb-2">Quick Access</h2>
            {quickNav
              .filter((q) => q.enabled)
              .map((q) => (
                <motion.button
                  key={q.path}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate(q.path)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[#475569] hover:bg-[#F7F8FC] hover:text-[#0A2540] text-[13px] font-semibold transition-all text-left group relative cursor-pointer"
                  type="button"
                >
                  <div className="absolute left-0 top-2 bottom-2 w-0 group-hover:w-[3px] bg-[#FF9933] rounded-r-full transition-all" />
                  <span className="material-symbols-outlined text-[20px] text-[#94A3B8] group-hover:text-[#FF9933] transition-colors">
                    {q.icon}
                  </span>
                  <span>{q.label}</span>
                  <span className="material-symbols-outlined text-[15px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </motion.button>
              ))}
          </div>
        </motion.div>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
      </div>
    </div>
  );
};