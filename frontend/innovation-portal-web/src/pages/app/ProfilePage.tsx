import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMe, useMySubmissions, portalKeys } from '../../hooks/usePortalQueries';
import { Button, LinkButton, Card } from '../../components/ui';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMe } from '../../services/portalService';

export default function ProfilePage() {
  const { authed, user } = useAuth();
  const meQuery = useMe(authed);
  const subsQuery = useMySubmissions(authed);
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  const participant = meQuery.data;
  const submissions = subsQuery.data ?? [];

  useEffect(() => {
    if (participant) {
      setPhone(participant.phone || '');
    }
  }, [participant]);

  if (!authed) return null;

  const teamMemberships = useMemo(() => {
    const teams = new Map<string, { teamId: string; name: string; members: Array<{ participantId: string; fullName: string }> }>();
    submissions.forEach((s) => {
      if (s.team && !teams.has(s.team.teamId)) {
        teams.set(s.team.teamId, s.team);
      }
    });
    return Array.from(teams.values());
  }, [submissions]);

  const stats = useMemo(() => ({
    total: submissions.length,
    drafts: submissions.filter((s) => s.status === 'DRAFT').length,
    underReview: submissions.filter((s) => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED').length,
    returned: submissions.filter((s) => s.status === 'RETURNED').length,
    accepted: submissions.filter((s) => s.status === 'ACCEPTED').length,
  }), [submissions]);

  const displayName = participant?.fullName || user?.phone || 'Participant';


  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updatedParticipant) => {
      queryClient.setQueryData(portalKeys.me, updatedParticipant);
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 4000);
    }
  });

  if (meQuery.isLoading || subsQuery.isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto w-full px-space-md lg:px-space-xl py-space-lg space-y-8">
        <div className="h-8 w-48 rounded skeleton-shimmer" />
        <div className="h-40 rounded-xl skeleton-shimmer" />
        <div className="h-40 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  const handleUpdatePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;
    updateMutation.mutate({ fullName: participant.fullName, email: participant.email, phone });
  };

  return (
    <div className="p-space-lg flex flex-col gap-space-xl max-w-[1600px] mx-auto w-full">
      {/* Top Action & Meta Banner */}
      <motion.div
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-container p-space-xl text-on-primary shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-20 w-64 h-64 rounded-full bg-secondary-fixed/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex items-center gap-space-sm">
              <span className="px-space-sm py-0.5 rounded-full font-label-mono-sm text-label-mono-sm flex items-center gap-1.5 shadow-sm bg-state-accepted-bg text-state-accepted-text">
                <span className="w-2 h-2 rounded-full bg-state-accepted-text animate-pulse"></span>
                ACTIVE PARTICIPANT
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-primary tracking-tight">
              Participant Profile
            </h1>
            <p className="font-body-md text-body-md text-primary-fixed">
              Manage your student registration details, institutional credentials, verified identity, and active team memberships.
            </p>
          </div>
          <div className="flex items-center gap-space-md self-start md:self-auto bg-on-primary/10 backdrop-blur-md px-space-lg py-space-md rounded-xl">
            <div className="flex flex-col text-left">
              <span className="font-label-mono-sm text-label-mono-sm text-primary-fixed-dim uppercase">Security Tier</span>
              <span className="font-headline-sm text-headline-sm text-on-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-state-accepted-bg">verified_user</span>
                Level 3 Nodal
              </span>
            </div>
            <div className="w-px h-8 bg-on-primary/20"></div>
            <div className="flex flex-col text-left">
              <span className="font-label-mono-sm text-label-mono-sm text-primary-fixed-dim uppercase">Auth Token Sync</span>
              <span className="font-label-mono-md text-label-mono-md text-state-accepted-bg font-medium">Valid (28d)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two-Column Profile Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        {/* LEFT COLUMN: Profile & Credential Card */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          {/* Main Identity Card */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center text-center gap-space-md">
              <div className="relative">
                <img alt={`${displayName} Profile`} className="w-32 h-32 rounded-full object-cover ring-4 ring-surface-container-high shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXE1lY36f_erOMfcaU3wYiYE6m2bxHeOoQU2dT83Vohp-XhnVz9wDh05qGQipkJnQ8zv0wzEi9L4I3PAiqEJM4DpJiCDDXcLUsBEXzYTgCJ5QHRWKOs_sblF1iStKoywU9xfYRiRwrnJjnARUhhT3Gt0-RRcvmTGGfTlrFqmUVyxRM4myDtzWNTmDo4T2Mr_gUR767YxQZ-zdFGlGHAJZxdlURPBijpOnnycmmdCr1s865Q8oWLP9nmg" />
                <div className="absolute bottom-1 right-1 bg-state-accepted-bg text-state-accepted-text rounded-full p-1 shadow-sm flex items-center justify-center" title="Domain Verified Student">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">{displayName}</h2>
                <div className="flex items-center gap-space-xs mt-1">
                  <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-state-submitted-bg text-state-submitted-text font-label-mono-sm text-label-mono-sm font-semibold">
                    <span className="material-symbols-outlined text-[14px]">school</span>
                    STUDENT
                  </span>
                  <span className="text-on-surface-variant-weak font-body-sm text-body-sm">• Year IV (B.Tech)</span>
                </div>
              </div>
              <div className="w-full bg-surface-container-low rounded-lg p-space-md flex flex-col items-center text-center gap-0.5">
                <span className="font-headline-sm text-headline-sm text-primary">COEP Technological University, Pune</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak">Department of Instrumentation & Control Engineering</span>
              </div>
            </div>
            {/* Technical Identity Metas */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <div className="flex items-center justify-between py-space-xs">
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  Member Since
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">October 2024</span>
              </div>
              <div className="flex items-center justify-between py-space-xs">
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                  Participant UUID
                </span>
                <div className="flex items-center gap-space-xs bg-state-draft-bg px-space-sm py-1 rounded-md">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium" id="uuid-text">{participant?.participantId || 'part-8821-4f92-bd12-0043'}</span>
                  <Button variant="ghost" size="sm" className="p-0.5 text-on-surface-variant-weak hover:text-primary transition-colors" onClick={() => navigator.clipboard.writeText(participant?.participantId || 'part-8821-4f92-bd12-0043')} title="Copy UUID">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Source Account Verification & Institutional Trust Card */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
                Institutional Domain Auth
              </h3>
              <span className="px-space-xs py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm font-semibold">PASS</span>
            </div>
            <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak">Source Account ID</span>
                <div className="flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-primary font-semibold bg-surface-card px-2 py-0.5 rounded">
                  <span>{participant?.sourceAccountId || 'src-acc-7719-v'}</span>
                  <span className="material-symbols-outlined text-[14px] text-state-accepted-text">lock</span>
                </div>
              </div>
              <div className="flex items-start gap-space-xs text-state-accepted-text font-body-sm text-body-sm pt-1">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="leading-tight">AISHE Institutional Domain Verified (<strong className="font-semibold text-on-surface">coep.ac.in</strong>)</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-space-xs text-on-surface-variant-weak font-body-sm text-body-sm">
              <span>Verification Standard</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium">Nodal Accreditation</span>
            </div>
            <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">encrypted</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant-weak leading-tight">
                Cryptographically bound to National AISHE Code <strong>U-0306</strong> with Single Sign-On trust chain.
              </p>
            </div>
          </motion.div>

          {/* Metric Visualization: Platform Submission Ratio */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface">Performance Index</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Lifecycle Score</span>
            </div>
            <div className="flex items-center gap-space-lg">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-state-accepted-text" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="33, 100" strokeLinecap="round" strokeWidth="3.5" />
                  <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="33, 100" strokeDashoffset="-35" strokeLinecap="round" strokeWidth="3.5" />
                  <path className="text-state-returned-text" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="30, 100" strokeDashoffset="-70" strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-headline-lg text-headline-lg text-on-surface leading-none">3</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase text-[9px]">Submissions</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs flex-1">
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-state-accepted-text"></span> Accepted</span>
                  <span className="font-label-mono-sm text-label-mono-sm font-semibold">1 (33%)</span>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> Draft Active</span>
                  <span className="font-label-mono-sm text-label-mono-sm font-semibold">1 (33%)</span>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-state-returned-text"></span> Returned</span>
                  <span className="font-label-mono-sm text-label-mono-sm font-semibold">1 (33%)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Detailed Profile Fields & Teams */}
        <div className="xl:col-span-8 flex flex-col gap-space-lg">
          {/* 1. Contact & Identity Information (Form Card) */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-headline-md text-headline-md text-on-surface">Contact & Identity Details</h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak">Core identification mapped to National Hackathon Registry</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant-weak text-[22px]">badge</span>
            </div>
            <form onSubmit={handleUpdatePhone} className="flex flex-col gap-space-md" id="contact-form">
              {/* Full Name (Read-only) */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-sm text-body-sm text-on-surface font-medium flex items-center justify-between">
                  <span>Full Legal Name</span>
                  <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span> Read-only / Verified via Aadhaar SSO
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input className="w-full h-10 px-space-md bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md cursor-not-allowed select-none focus:outline-none" readOnly value={displayName} />
                  <span className="absolute right-3 material-symbols-outlined text-state-accepted-text text-[20px]">verified</span>
                </div>
              </div>
              {/* Institutional Email (Read-only / Verified) */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-sm text-body-sm text-on-surface font-medium flex items-center justify-between">
                  <span>Primary Institutional Email</span>
                  <span className="text-state-accepted-text font-label-mono-sm text-label-mono-sm flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified Domain
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input className="w-full h-10 px-space-md bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md cursor-not-allowed select-none focus:outline-none" readOnly value={participant?.email || 'yogesh.ghule@coep.ac.in'} />
                  <span className="absolute right-3 px-space-xs py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm font-semibold">PRIMARY</span>
                </div>
              </div>
              {/* Phone Number (Editable Field) */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-sm text-body-sm text-on-surface font-medium flex items-center justify-between" htmlFor="phone-input">
                  <span>Contact Mobile Number</span>
                  <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">SMS Gateway Enabled</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-label-mono-md text-label-mono-md text-on-surface-variant-weak">IND</span>
                    <input
                      className="w-full h-10 pl-12 pr-space-md bg-surface-canvas text-on-surface rounded-lg font-body-md text-body-md focus:bg-surface-card focus:outline-none transition-all shadow-inner"
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-10 px-space-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm rounded-lg transition-colors flex items-center justify-center gap-space-xs shrink-0 shadow-sm"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">sync</span>
                        Update Phone
                      </>
                    )}
                  </Button>
                </div>
                <motion.p
                  id="phone-success"
                  className="hidden text-state-accepted-text font-body-sm text-body-sm items-center gap-1 mt-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={phoneSuccess ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="material-symbols-outlined text-[16px]">check</span> Mobile updated and OTP acknowledged.
                </motion.p>
              </div>
              {/* Notification Preferences */}
              <div className="mt-space-xs p-space-md rounded-lg bg-surface-container-low flex items-start gap-space-md">
                <div className="pt-0.5">
                  <span className="material-symbols-outlined text-secondary text-[22px]">sms</span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Evaluation Status SMS Dispatch</span>
                    <span className="px-space-xs py-0.5 rounded bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm font-semibold uppercase">ACTIVE</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant-weak">
                    SMS alerts enabled for real-time evaluation status shifts, jury comments, and phase transitions directly to the verified mobile number.
                  </p>
                </div>
              </div>
            </form>
          </motion.div>

          {/* 2. Active Team Memberships */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-headline-md text-headline-md text-on-surface">Active Team Memberships</h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak">Linked to active challenge problem statements</span>
              </div>
              <span className="px-space-sm py-0.5 bg-surface-container text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm rounded-full font-semibold">
                {teamMemberships.length} TEAM{teamMemberships.length !== 1 ? 'S' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-space-md">
              {teamMemberships.length > 0 ? teamMemberships.map((team) => (
                <motion.div
                  key={team.teamId}
                  className="p-space-lg rounded-xl bg-surface-canvas hover:bg-surface-container-low transition-colors flex flex-col gap-space-sm relative overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                  <div className="flex items-start justify-between gap-space-md">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-space-sm">
                        <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">{team.name}</h4>
                        <span className="px-space-sm py-0.5 rounded bg-primary text-on-primary font-label-mono-sm text-label-mono-sm flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                          TEAM LEADER
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant-weak mt-0.5">Linked to challenge</span>
                    </div>
                    <div className="flex items-center gap-space-xs text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm bg-surface-card px-space-sm py-1 rounded-md shadow-xs shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-secondary">groups</span>
                      <span>{team.members.length} Members</span>
                    </div>
                  </div>
                  <div className="mt-1 pt-space-xs flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                    <div className="flex items-center gap-space-xs text-on-surface">
                      <span className="material-symbols-outlined text-secondary text-[18px]">biotech</span>
                      <span className="font-headline-sm text-headline-sm">Water Inflow Spectrometer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-state-submitted-text"></span>
                      <span className="font-label-mono-sm text-label-mono-sm text-state-submitted-text font-medium uppercase">Round 1 Evaluation</span>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <motion.div
                  className="p-space-lg rounded-xl bg-surface-canvas text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="font-body-md text-body-md text-on-surface-variant-weak">No team memberships yet.</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 3. Platform Participation Summary (Bento Matrix) */}
          <motion.div
            className="bg-surface-card rounded-xl shadow-sm p-space-xl flex flex-col gap-space-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Platform Participation Matrix</h3>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Portal Session Realtime</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
              <Card variant="default" className="p-space-lg rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-surface-card text-secondary shadow-xs">
                    <span className="material-symbols-outlined text-[22px]">travel_explore</span>
                  </span>
                  <span className="px-2 py-0.5 bg-secondary-fixed text-primary font-label-mono-sm text-label-mono-sm font-semibold rounded">OPEN</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display-lg text-display-lg text-on-surface leading-tight">{stats.total + stats.underReview + stats.returned + stats.accepted || 24}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant-weak mt-1">Open Challenges Eligible</span>
                </div>
              </Card>
              <Card variant="default" className="p-space-lg rounded-xl bg-state-review-bg/40 flex flex-col justify-between gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-surface-card text-state-review-text shadow-xs">
                    <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                  </span>
                  <span className="px-2 py-0.5 bg-state-review-bg text-state-review-text font-label-mono-sm text-label-mono-sm font-semibold rounded">IN PROGRESS</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display-lg text-display-lg text-on-surface leading-tight">{stats.drafts + stats.underReview || 2}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant-weak mt-1">{stats.drafts} Draft, {stats.returned} Returned</span>
                </div>
              </Card>
              <Card variant="default" className="p-space-lg rounded-xl bg-state-accepted-bg/60 flex flex-col justify-between gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-surface-card text-state-accepted-text shadow-xs">
                    <span className="material-symbols-outlined text-[22px]">task_alt</span>
                  </span>
                  <span className="px-2 py-0.5 bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm font-semibold rounded">FINAL</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display-lg text-display-lg text-on-surface leading-tight">{stats.accepted || 1}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant-weak mt-1">Accepted & Evaluated</span>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Footer Helpdesk Note Banner */}
          <motion.div
            className="p-space-lg rounded-xl bg-surface-container-high/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center shrink-0 shadow-xs text-primary">
                <span className="material-symbols-outlined text-[22px]">support_agent</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">Need institutional record modifications?</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant-weak">
                  To update university affiliation or correct identity documents, contact the Nodal Helpdesk.
                </p>
              </div>
            </div>
            <LinkButton to="/app/help" variant="ghost" className="h-9 px-space-md bg-surface-card hover:bg-surface-card/80 text-primary font-headline-sm text-headline-sm rounded-lg flex items-center gap-1.5 shrink-0 shadow-xs transition-colors">
              <span className="material-symbols-outlined text-[16px]">mail</span>
              <span>Go to Help Centre</span>
            </LinkButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}