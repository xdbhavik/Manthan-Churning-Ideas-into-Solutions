import React, { useCallback, useEffect, useState } from 'react';
<<<<<<< HEAD
import { motion, AnimatePresence } from 'framer-motion';
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
import {
  JwtRole,
  NavPath,
  Participant,
  PublishedProblem,
  Submission,
  SubmissionCreateRequest,
  SubmissionMetaRequest,
  ProjectReview,
  EvaluationCycle,
  EvaluationCriteria,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProblemCatalog } from './components/ProblemCatalog';
import { ProblemDetail } from './components/ProblemDetail';
import { SubmissionsDossier } from './components/SubmissionsDossier';
import { ReviewWorkbench } from './components/ReviewWorkbench';
import { DashboardView } from './components/DashboardView';
import { AdministrationView } from './components/AdministrationView';
import { NodalInstitutesView } from './components/NodalInstitutesView';
import { ScoringRubricsView } from './components/ScoringRubricsView';
import { ProfileModal } from './components/ProfileModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { AuthFlow } from './components/AuthFlow';
import { RegisterParticipant } from './components/RegisterParticipant';
<<<<<<< HEAD
import { ProfileView } from './components/ProfileView';
import { ToastProvider } from './components/Toast';
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
import { getRole, isAuthenticated, logout, getRefreshToken, getSessionUser } from './lib/auth';
import { getErrorMessage } from './lib/api';
import * as portal from './services/portalService';
import * as authService from './services/authService';
import * as evalService from './services/evaluationService';

const ROLE_LABEL: Record<string, string> = {
  SUBMITTER: 'PARTICIPANT',
  EVALUATOR: 'EVALUATOR',
  ADMIN: 'ADMIN / REVIEWER',
  REVIEWER: 'ADMIN / REVIEWER',
};

function avatar(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'U';
}

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => isAuthenticated());
  const [role, setRole] = useState<JwtRole | null>(() => (isAuthenticated() ? (getRole() as JwtRole) : null));
  const [needsRegistration, setNeedsRegistration] = useState<boolean>(false);
  const [participant, setParticipant] = useState<Participant | null>(null);

  const [currentPath, setCurrentPath] = useState<NavPath>('overview');

  const [problems, setProblems] = useState<PublishedProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<PublishedProblem | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ProjectReview[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  const session = getSessionUser();
  const displayName = participant?.fullName || session?.phone || 'User';
  const roleLabel = ROLE_LABEL[role ?? ''] || (role ?? '');

  const isParticipant = role === 'SUBMITTER';
  const isEvaluator = role === 'EVALUATOR';
  const isAdmin = role === 'ADMIN' || role === 'REVIEWER';

  const notificationsCount =
    (isParticipant ? submissions.filter((s) => s.status === 'UNDER_REVIEW').length : 0) +
    (isEvaluator ? reviews.filter((r) => r.reviewStatus === 'ASSIGNED').length : 0);

  // ---- data loaders ----
  const loadParticipantData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await portal.me();
      setParticipant(me);
      setNeedsRegistration(false);
      const [ps, subs] = await Promise.all([portal.getProblems(), portal.getMySubmissions()]);
      setProblems(ps);
      setSubmissions(subs);
      setSelectedSubmissionId(subs[0]?.submissionId ?? null);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNeedsRegistration(true);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvaluatorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revs, crit] = await Promise.all([
        evalService.getMyProjectReviews(),
        evalService.getMyCriteria().catch(() => []),
      ]);
      setReviews(revs);
      setCriteria(crit);
      setSelectedReviewId(revs[0]?.reviewId ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queue = await evalService.getEvaluationQueue(0, 100);
      setCycles(queue.content);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSubmissions = useCallback(async () => {
    try {
      const subs = await portal.getMySubmissions();
      setSubmissions(subs);
      setSelectedSubmissionId((cur) => cur && subs.some((s) => s.submissionId === cur) ? cur : subs[0]?.submissionId ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const refreshReviews = useCallback(async () => {
    try {
      const revs = await evalService.getMyProjectReviews();
      setReviews(revs);
      setSelectedReviewId((cur) => (cur && revs.some((r) => r.reviewId === cur) ? cur : revs[0]?.reviewId ?? null));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  // ---- bootstrap once authenticated ----
  useEffect(() => {
    if (!authed) return;
    const currentRole = (getRole() as JwtRole) ?? 'SUBMITTER';
    setRole(currentRole);
    if (currentRole === 'SUBMITTER') loadParticipantData();
    else if (currentRole === 'EVALUATOR') loadEvaluatorData();
    else if (currentRole === 'ADMIN' || currentRole === 'REVIEWER') loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleAuthSuccess = () => {
    setAuthed(true);
  };

  const handleRegistered = () => {
    setNeedsRegistration(false);
    loadParticipantData();
  };

  const handleLogout = () => {
    const refresh = getRefreshToken();
    if (refresh) authService.logout(refresh).catch(() => undefined);
    logout();
    setAuthed(false);
    setRole(null);
    setParticipant(null);
    setNeedsRegistration(false);
    setProblems([]);
    setSubmissions([]);
    setReviews([]);
    setCycles([]);
    setSelectedProblem(null);
    setCurrentPath('overview');
  };

  const handleNavigate = (path: NavPath) => {
    setSelectedProblem(null);
    setCurrentPath(path);
  };

  const handleSelectProblem = (prob: PublishedProblem) => setSelectedProblem(prob);
  const handleBackToCatalog = () => {
    setSelectedProblem(null);
    setCurrentPath('problem-catalog');
  };

  // ---- submission operations (participant) ----
  const handleCreateSubmission = async (req: SubmissionCreateRequest): Promise<Submission> => {
    const sub = await portal.createSubmission(req);
    await refreshSubmissions();
    return sub;
  };

  const handleUpdateMeta = async (subId: string, req: SubmissionMetaRequest): Promise<Submission> => {
    const sub = await portal.updateSubmissionMeta(subId, req);
    await refreshSubmissions();
    return sub;
  };

  const handleSubmitSubmission = async (subId: string): Promise<Submission> => {
    const sub = await portal.submitSubmission(subId);
    await refreshSubmissions();
    return sub;
  };

  const handleUploadFile = async (subId: string, file: File): Promise<void> => {
    await portal.uploadFile(subId, file);
    await refreshSubmissions();
  };

  const handleDeleteFile = async (subId: string, fileId: string): Promise<void> => {
    await portal.deleteFile(subId, fileId);
    await refreshSubmissions();
  };

  // ---- review operations (evaluator) ----
  const handleCommitReviewDecision = async (
    reviewId: string,
    decision: 'ACCEPTED' | 'RETURNED',
    comment: string
  ) => {
    await evalService.submitProjectReviewDecision(reviewId, { decision, decisionComment: comment });
    await refreshReviews();
  };

  const handlePublishToPortal = async (cycleId: string) => {
    await evalService.publishToPortal(cycleId);
    await loadAdminData();
  };

  // ---- render gates ----
  if (!authed) {
    return <AuthFlow onSuccess={handleAuthSuccess} />;
  }

  if (needsRegistration) {
    return <RegisterParticipant onRegistered={handleRegistered} onLogout={handleLogout} />;
  }

  return (
<<<<<<< HEAD
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F8FC] text-[#1E293B] flex flex-col antialiased selection:bg-[#BFDBFE] selection:text-[#0A2540]">
        <Header
          displayName={displayName}
          roleLabel={roleLabel}
          avatarText={avatar(displayName)}
          onOpenProfile={() => setIsProfileOpen(true)}
          notificationsCount={notificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onLogout={handleLogout}
        />

        <div className="flex pt-[68px] min-h-[calc(100vh-68px)]">
          <Sidebar
            currentPath={selectedProblem ? 'problem-catalog' : currentPath}
            onNavigate={handleNavigate}
            role={role ?? 'SUBMITTER'}
            problemsCount={problems.length}
            submissionsCount={submissions.length}
            pendingReviewsCount={reviews.filter((r) => r.reviewStatus === 'ASSIGNED').length}
          />

          <main className="flex-1 ml-64 p-6 sm:p-8 max-w-7xl mx-auto w-full">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-[13px] font-semibold animate-slideDown">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  <span>{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {loading && !selectedProblem ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-[#64748B] gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[24px] text-[#0A2540] animate-spin">progress_activity</span>
                  </div>
                  <span className="text-[13px] font-bold uppercase tracking-wider text-[#94A3B8]">Loading Portal Data…</span>
                </motion.div>
              ) : selectedProblem ? (
                <motion.div
                  key={`problem-${selectedProblem.problemId}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProblemDetail
                    problem={selectedProblem}
                    participant={participant}
                    existingSubmission={submissions.find((s) => s.problemId === selectedProblem.problemId)}
                    onBack={handleBackToCatalog}
                    onViewSubmission={(sub) => {
                      setSelectedProblem(null);
                      setSelectedSubmissionId(sub.submissionId);
                      setCurrentPath('my-submissions');
                    }}
                    onCreateSubmission={handleCreateSubmission}
                    onUpdateMeta={handleUpdateMeta}
                    onSubmitSubmission={handleSubmitSubmission}
                    onUploadFile={handleUploadFile}
                    onDeleteFile={handleDeleteFile}
                  />
                </motion.div>
              ) : currentPath === 'problem-catalog' ? (
                <motion.div
                  key="catalog"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProblemCatalog
                    problems={problems}
                    onSelectProblem={handleSelectProblem}
                  />
                </motion.div>
              ) : currentPath === 'my-submissions' ? (
                <motion.div
                  key="submissions"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SubmissionsDossier
                    submissions={submissions}
                    selectedSubmissionId={selectedSubmissionId ?? ''}
                    onSelectSubmission={setSelectedSubmissionId}
                    onNewSubmissionClick={() => setCurrentPath('problem-catalog')}
                    onUpdateMeta={handleUpdateMeta}
                    onSubmitSubmission={handleSubmitSubmission}
                    onUploadFile={handleUploadFile}
                    onDeleteFile={handleDeleteFile}
                  />
                </motion.div>
              ) : currentPath === 'project-review-queue' ? (
                <motion.div
                  key="review-queue"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ReviewWorkbench
                    workItems={reviews}
                    selectedItemId={selectedReviewId ?? ''}
                    onSelectItem={setSelectedReviewId}
                    onCommitDecision={handleCommitReviewDecision}
                  />
                </motion.div>
              ) : currentPath === 'overview' ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DashboardView
                    problems={problems}
                    submissions={submissions}
                    reviews={reviews}
                    cycles={cycles}
                    role={role ?? 'SUBMITTER'}
                    participant={participant}
                    onNavigate={handleNavigate}
                    onSelectProblem={handleSelectProblem}
                  />
                </motion.div>
              ) : currentPath === 'admin-cycles-and-publish' ? (
                <motion.div
                  key="admin-cycles"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AdministrationView cycles={cycles} onPublish={handlePublishToPortal} />
                </motion.div>
              ) : currentPath === 'nodal-officers-directory' ? (
                <motion.div
                  key="nodal-directory"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NodalInstitutesView />
                </motion.div>
              ) : currentPath === 'evaluation-rubrics' ? (
                <motion.div
                  key="rubrics"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ScoringRubricsView criteria={criteria} />
                </motion.div>
              ) : currentPath === 'my-profile' ? (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <ProfileView
                    displayName={displayName}
                    roleLabel={roleLabel}
                    avatarText={avatar(displayName)}
                    participant={participant}
                    session={session}
                    onLogout={handleLogout}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </main>
        </div>

        <ProfileModal
          displayName={displayName}
          roleLabel={roleLabel}
          avatarText={avatar(displayName)}
          participant={participant}
          session={session}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
        />

        <NotificationsDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          submissions={isParticipant ? submissions : []}
          reviews={isEvaluator ? reviews : []}
        />
      </div>
    </ToastProvider>
=======
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col antialiased selection:bg-[#dce9ff] selection:text-[#00152f]">
      <Header
        displayName={displayName}
        roleLabel={roleLabel}
        avatarText={avatar(displayName)}
        onOpenProfile={() => setIsProfileOpen(true)}
        notificationsCount={notificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex pt-16 min-h-[calc(100vh-64px)]">
        <Sidebar
          currentPath={selectedProblem ? 'problem-catalog' : currentPath}
          onNavigate={handleNavigate}
          role={role ?? 'SUBMITTER'}
          problemsCount={problems.length}
          submissionsCount={submissions.length}
          pendingReviewsCount={reviews.filter((r) => r.reviewStatus === 'ASSIGNED').length}
        />

        <main className="flex-1 ml-64 p-6 sm:p-8 max-w-7xl mx-auto w-full">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] flex items-center justify-between text-[13px] font-semibold">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-[#93000a]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {loading && !selectedProblem ? (
            <div className="flex items-center justify-center py-24 text-[#74777f] text-[14px]">
              <span className="material-symbols-outlined text-[20px] animate-spin mr-2">progress_activity</span>
              Loading…
            </div>
          ) : selectedProblem ? (
            <ProblemDetail
              problem={selectedProblem}
              participant={participant}
              existingSubmission={submissions.find((s) => s.problemId === selectedProblem.problemId)}
              onBack={handleBackToCatalog}
              onViewSubmission={(sub) => {
                setSelectedProblem(null);
                setSelectedSubmissionId(sub.submissionId);
                setCurrentPath('my-submissions');
              }}
              onCreateSubmission={handleCreateSubmission}
              onUpdateMeta={handleUpdateMeta}
              onSubmitSubmission={handleSubmitSubmission}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
            />
          ) : currentPath === 'problem-catalog' ? (
            <ProblemCatalog
              problems={problems}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentPath === 'my-submissions' ? (
            <SubmissionsDossier
              submissions={submissions}
              selectedSubmissionId={selectedSubmissionId ?? ''}
              onSelectSubmission={setSelectedSubmissionId}
              onNewSubmissionClick={() => setCurrentPath('problem-catalog')}
              onUpdateMeta={handleUpdateMeta}
              onSubmitSubmission={handleSubmitSubmission}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
            />
          ) : currentPath === 'project-review-queue' ? (
            <ReviewWorkbench
              workItems={reviews}
              selectedItemId={selectedReviewId ?? ''}
              onSelectItem={setSelectedReviewId}
              onCommitDecision={handleCommitReviewDecision}
            />
          ) : currentPath === 'overview' ? (
            <DashboardView
              problems={problems}
              submissions={submissions}
              reviews={reviews}
              cycles={cycles}
              role={role ?? 'SUBMITTER'}
              participant={participant}
              onNavigate={handleNavigate}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentPath === 'admin-cycles-and-publish' ? (
            <AdministrationView cycles={cycles} onPublish={handlePublishToPortal} />
          ) : currentPath === 'nodal-officers-directory' ? (
            <NodalInstitutesView />
          ) : currentPath === 'evaluation-rubrics' ? (
            <ScoringRubricsView criteria={criteria} />
          ) : currentPath === 'my-profile' ? (
            <div className="bg-white rounded-xl p-8 max-w-xl shadow-xs border border-[#e2e8f0]">
              <h2 className="font-headline text-[20px] font-bold text-[#0b1c30] mb-4">
                User Profile & Credentials
              </h2>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] mb-6">
                <div className="w-14 h-14 rounded-full bg-[#00152f] text-white flex items-center justify-center font-bold text-[20px]">
                  {avatar(displayName)}
                </div>
                <div>
                  <div className="font-headline text-[18px] font-bold text-[#0b1c30]">{displayName}</div>
                  <div className="text-[12px] text-[#795900] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    {roleLabel}
                  </div>
                  <div className="text-[11px] text-[#74777f]">
                    {participant?.participantType || role} · Phone +91 {session?.phone}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
                  <span className="text-[#74777f]">Participant ID</span>
                  <span className="font-mono text-[#00152f] font-semibold">
                    {participant?.participantId || session?.userId}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
                  <span className="text-[#74777f]">Type</span>
                  <span className="font-semibold text-[#0b1c30]">
                    {participant?.participantType || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
                  <span className="text-[#74777f]">Email</span>
                  <span className="font-mono text-[#00152f]">{participant?.email || session?.email || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
                  <span className="text-[#74777f]">Phone</span>
                  <span className="font-mono text-[#00152f]">+91 {session?.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
                  <span className="text-[#74777f]">Institution / Panel</span>
                  <span className="font-semibold text-[#0b1c30]">
                    {participant?.institutionName || '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <ProfileModal
        displayName={displayName}
        roleLabel={roleLabel}
        avatarText={avatar(displayName)}
        participant={participant}
        session={session}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={handleLogout}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        submissions={isParticipant ? submissions : []}
        reviews={isEvaluator ? reviews : []}
      />
    </div>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
  );
}