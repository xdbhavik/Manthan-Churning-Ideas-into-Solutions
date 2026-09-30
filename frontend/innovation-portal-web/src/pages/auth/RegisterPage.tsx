import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { portalKeys } from '../../hooks/usePortalQueries';
import { Link } from 'react-router-dom';
import { Button, LinkButton } from '../../components/ui';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [institutionName, setInstitutionName] = useState('');
  const [agree, setAgree] = useState(false);
  const [smsConsent, setSmsConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!agree) {
      setError('Please accept the participation terms.');
      return;
    }
    setLoading(true);
    try {
      await portal.registerStudent({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        institutionName: institutionName.trim() || undefined,
      });
      toast.notify('Profile created', 'success');
      await queryClient.invalidateQueries({ queryKey: portalKeys.me });
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        await queryClient.invalidateQueries({ queryKey: portalKeys.me });
        navigate('/app/dashboard', { replace: true });
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <LinkButton
          to="/"
          variant="ghost"
          className="inline-flex items-center gap-2 font-body-md text-body-md text-secondary hover:text-primary transition-colors group"
        >
          <span className="material-symbols-outlined text-body-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          <span>Back to Portal Home</span>
        </LinkButton>
      </motion.div>

      {/* Layout Grid: Form on Left/Center, Context and Visual Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Form (7 columns) */}
        <motion.div
          className="lg:col-span-7 bg-surface-card rounded-xl shadow-sm p-6 md:p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header Hierarchy */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container text-primary font-label-mono-sm text-label-mono-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              PORTAL REGISTRATION
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Create Your Participant Profile
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant-weak">
              Register as a verified student participant to create submissions, invite collaborators, connect code repositories, and solve national challenges.
            </p>
          </motion.div>

          {/* Participant Kind Banner */}
          <motion.div
            className="bg-surface-container-low rounded-lg p-3.5 flex items-start gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="material-symbols-outlined text-secondary text-headline-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <div className="space-y-0.5">
              <div className="font-headline-sm text-headline-sm text-on-surface">Participant Type: STUDENT (Self-Registration)</div>
            </div>
          </motion.div>

          {/* Notification Banner: Subtle Informational Callout */}
          <motion.div
            className="bg-state-submitted-bg rounded-lg p-3.5 flex items-start gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="material-symbols-outlined text-state-submitted-text text-headline-sm mt-0.5">info</span>
            <p className="font-body-sm text-body-sm text-state-submitted-text">
              If you have already registered or hold an active profile, signing in via OTP will restore your active workspace and team associations.
            </p>
          </motion.div>

          {/* Form: Directly implements ParticipantRegisterRequest */}
          <form onSubmit={submit} className="space-y-5">
            {/* Field 1: Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="fullName">
                  Full Name <span className="text-error">*</span>
                </label>
                <span className={`inline-flex items-center gap-1 font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded-full ${fullName.trim().length > 2 ? 'text-state-accepted-text bg-state-accepted-bg' : 'text-state-returned-text bg-state-returned-bg'}`}>
                  <span className="material-symbols-outlined text-sm">{fullName.trim().length > 2 ? 'check_circle' : 'cancel'}</span>
                  {fullName.trim().length > 2 ? 'Valid format' : 'Invalid format'}
                </span>
              </div>
              <div className="relative">
                <input
                  className="w-full h-10 px-3 pr-10 rounded-lg bg-surface-canvas text-on-surface font-body-md text-body-md focus:bg-surface-card focus:outline-none transition-colors shadow-inner border border-transparent focus:border-border-subtle"
                  id="fullName"
                  name="fullName"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {fullName.trim().length > 2 && (
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-state-accepted-text text-body-lg">
                    check
                  </span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant-weak">
                Must match your official university identity card for stage pass issuance.
              </span>
            </div>

            {/* Field 2: Email Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="email">
                  Institutional Email Address <span className="text-error">*</span>
                </label>
                {email.endsWith('.ac.in') || email.endsWith('.edu') || email.endsWith('.edu.in') ? (
                  <span className="inline-flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-state-accepted-text bg-state-accepted-bg px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-sm">domain_verification</span>
                    HEI Linked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak bg-surface-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-sm">public</span>
                    Not Linked
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  className="w-full h-10 px-3 pr-10 rounded-lg bg-surface-canvas text-on-surface font-body-md text-body-md focus:bg-surface-card focus:outline-none transition-colors shadow-inner"
                  id="email"
                  name="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-body-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  school
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant-weak">
                Used for institutional accreditation checks and evaluator assignment notices.
              </p>
            </div>

            {/* Field 4: College / Institution */}
            <div className="space-y-1.5">
              <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="institutionName">
                Institution Name <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  className="w-full h-10 px-3 pr-10 rounded-lg bg-surface-canvas text-on-surface font-body-md text-body-md focus:bg-surface-card focus:outline-none transition-colors shadow-inner"
                  id="institutionName"
                  name="institutionName"
                  required
                  type="text"
                  placeholder="e.g. COEP Technological University"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                />
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary text-body-lg">
                  account_balance
                </span>
              </div>
            </div>

            {/* Field 3: Mobile Phone Number */}
            <div className="space-y-2">
              <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="phone">
                Mobile Phone Number <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                <div className="w-20 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-mono-md text-label-mono-md flex items-center justify-center">
                  +91
                </div>
                <input
                  className="flex-1 h-10 px-3 rounded-lg bg-surface-canvas text-on-surface font-body-md text-body-md focus:bg-surface-card focus:outline-none transition-colors shadow-inner"
                  id="phone"
                  name="phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {/* SMS Notification Consent Toggle */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="w-4 h-4 rounded bg-surface-canvas text-primary focus:ring-0"
                  type="checkbox"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  Receive round advancement alerts and review room invites via SMS
                </span>
              </label>
            </div>

            {/* Form Terms Agreement Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-lg bg-surface-canvas hover:bg-surface-container-low transition-colors cursor-pointer select-none">
                <input
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-0"
                  required
                  type="checkbox"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak leading-relaxed">
                  I agree to the <span className="text-on-surface font-headline-sm">terms of participation</span>, intellectual property governance guidelines, and consent to single-blind same-evaluator review protocols across all submitted artifacts.
                </span>
              </label>
            </div>

            {/* Primary CTA & Sign In Link */}
            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                {loading ? 'Creating profile…' : 'Create Profile & Enter Workspace'}
                <span className="material-symbols-outlined text-body-lg">arrow_forward</span>
              </Button>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant-weak">Already have a profile?</span>
                <Link to="/login" className="font-headline-sm text-headline-sm text-secondary hover:underline">
                  Sign In
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-state-returned-bg border border-state-returned-border px-3 py-2 text-sm text-state-returned-text">
                {error}
              </div>
            )}
          </form>
        </motion.div>

        {/* RIGHT COLUMN: Institutional Trust, Evaluation Pipeline & Verification Highlights */}
        <motion.div
          className="lg:col-span-5 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Live Intake Status Card */}
          <motion.div
            className="bg-surface-card rounded-xl p-6 shadow-sm space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak tracking-wide uppercase">
                PORTAL CADENCE
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-state-accepted-bg text-state-accepted-text font-label-mono-sm text-label-mono-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-state-accepted-text"></span>
                STAGE 1 ACTIVE
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between font-body-sm text-body-sm mb-1">
                  <span className="text-on-surface">Participant Cohort Onboarding</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">74% Target Reached</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <motion.div
                    className="h-full bg-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '74%' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '74%' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-surface-canvas">
                  <span className="block font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">SOLVER QUOTA</span>
                  <span className="font-headline-md text-headline-md text-on-surface">32,480</span>
                  <span className="block font-body-sm text-body-sm text-state-accepted-text">National Registry</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-canvas">
                  <span className="block font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">CHALLENGES</span>
                  <span className="font-headline-md text-headline-md text-on-surface">184 PS</span>
                  <span className="block font-body-sm text-body-sm text-secondary">Open for Solution</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security & Validation Micro-Card */}
          <motion.div
            className="bg-surface-card rounded-xl p-6 shadow-sm space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">shield_lock</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Verification Protocol</h2>
              </div>
            </div>
            <ul className="space-y-2.5 font-body-sm text-body-sm text-on-surface-variant-weak">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-state-accepted-text text-sm mt-0.5">check_circle</span>
                <span>Direct linking with institutional NIRF & AISHE nodal directory.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-state-accepted-text text-sm mt-0.5">check_circle</span>
                <span>SHA-256 digital stamp minted for every code repository attachment.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-state-accepted-text text-sm mt-0.5">check_circle</span>
                <span>Double-blind review protocol ensured prior to grand finale shortlisting.</span>
              </li>
            </ul>
          </motion.div>

          {/* Student Innovator Visual Showcase */}
          <motion.div
            className="bg-surface-card rounded-xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-full h-36 bg-cover bg-center" style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDnviLysDHrcztrTTPVJ00qIso73NE3nRycEWxYscS0LpAfCDmE79vxdrq4p1wcuuRKH9mqZVwvXpF0AHpJQUTxuUAcKmb5reUsQGDikb6_s5sTNL6Vkx3hSWXmqUYBeDFLTO2yFzKALo4qkpooCTQ7lzYByoD9GhaaI2GIJ9TvUNSdlqjys56rlo-ILoxQSU7albyvlrNmR3XyDBzbtUgP9CHfkOSCpHBHSgSpHZgi_6SttH74EtE4Kw")'
            }} data-alt="Young Indian engineering students collaborating in an advanced innovation lab at a university hackathon, coding on high-end laptops, analyzing schematic diagrams on digital displays in an architectural modern academic environment lit by crisp cool daylight with high technical focus.">
            </div>
            <div className="p-4 space-y-1">
              <div className="font-headline-sm text-headline-sm text-on-surface">Verified Academic Credentials</div>
              <p className="font-body-sm text-body-sm text-on-surface-variant-weak">
                Profiles registered with verified .ac.in / .edu domains gain immediate eligibility for central incubation grants.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}