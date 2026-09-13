import { useEffect, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { getMyProfile } from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { EvaluatorProfileResponse } from '../../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<EvaluatorProfileResponse | null>(null);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const loadProfile = useCallback(async () => {
    setError(null);
    setProfileNotFound(false);
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 404) {
        setProfileNotFound(true);
      } else {
        setError({ msg: getErrorMessage(e), status });
      }
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  // Fallback demo data if testing locally before backend seeding
  const activeProfile: EvaluatorProfileResponse = profile || {
    profileId: 'EVAL-PRF-9941-882B',
    userId: 'USR-7729-IN-2024',
    evaluatorType: 'HEI',
    organization: 'Indian Institute of Technology Madras (IIT Madras)',
    designation: 'Professor & Head, Department of Sustainable Urban Systems',
    experienceYears: 18,
    regions: ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana'],
    maxWorkload: 5,
    active: true,
    fullName: 'Dr. Rajeshwari Swaminathan',
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-10-18T14:22:10Z',
  };

  const poolTypes = [
    { key: 'GOVERNMENT', label: 'GOVERNMENT', icon: 'account_tree', desc: 'Central / State Departments' },
    { key: 'INDUSTRY', label: 'INDUSTRY', icon: 'factory', desc: 'R&D / Commercial Enterprises' },
    { key: 'HEI', label: 'HEI (HIGHER EDUCATION)', icon: 'school', desc: 'Universities & Premier Institutes' },
    { key: 'CITIZEN', label: 'CITIZEN', icon: 'person_pin', desc: 'Civil Society Stakeholders' },
    { key: 'COMMUNITY', label: 'COMMUNITY', icon: 'groups', desc: 'Panchayat & Urban Local Bodies' },
  ];

  return (
    <div className="w-full px-space-lg py-space-base flex flex-col gap-space-lg max-w-7xl mx-auto">
      {/* Evaluator Section Breadcrumb & Primary Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-base bg-surface-crisp p-space-lg rounded-xl shadow-sm border border-border-hairline relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-primary-fixed/30 to-transparent pointer-events-none"></div>
        <div className="flex flex-col gap-space-xs z-10">
          <div className="flex items-center gap-space-sm text-text-muted font-label-sm text-label-sm uppercase tracking-wider">
            <span>Evaluator Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Institutional Credential Vault</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-ashoka-blue font-bold">Profile Identity Verification</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Evaluator Roster Dossier
            </h1>
            <span className="px-space-sm py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-label-sm flex items-center gap-1.5 shadow-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-gov-emerald animate-pulse"></span>
              {activeProfile.active ? 'ACTIVE STANDING' : 'INACTIVE'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-text-secondary">
            Statutory accreditation records synchronized under {activeProfile.evaluatorType} evaluation covenant.
          </p>
        </div>

        {/* Read-Only Operational Triggers */}
        <div className="flex items-center gap-space-sm z-10">
          <button
            type="button"
            onClick={loadProfile}
            className="px-space-md py-2 rounded bg-surface-muted text-primary hover:bg-surface-container font-label-md text-label-md flex items-center gap-space-xs shadow-xs transition-all cursor-pointer font-semibold border border-border-hairline"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_download</span>
            <span>Load My Profile</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-space-md py-2 rounded bg-ashoka-blue text-on-primary hover:bg-institutional-navy font-label-md text-label-md flex items-center gap-space-xs shadow-sm transition-all cursor-pointer font-semibold"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh Profile</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Navigation Bar */}
      <div className="bg-surface-crisp rounded-xl p-space-xs shadow-sm border border-border-hairline">
        <nav aria-label="Evaluator Workspace Tabs" className="flex items-center gap-space-xs overflow-x-auto">
          <NavLink
            to="/evaluator/profile"
            className="flex items-center gap-space-xs px-space-md py-space-xs bg-ashoka-blue text-on-primary rounded font-label-lg text-label-lg shadow-xs whitespace-nowrap font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>Profile</span>
          </NavLink>
          <NavLink
            to="/evaluator/criteria"
            className="flex items-center gap-space-xs px-space-md py-space-xs text-text-secondary hover:bg-surface-subtle hover:text-ashoka-blue rounded font-label-lg text-label-lg whitespace-nowrap transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">rule</span>
            <span>Criteria Guidelines</span>
          </NavLink>
          <NavLink
            to="/evaluator/assignments"
            className="flex items-center gap-space-xs px-space-md py-space-xs text-text-secondary hover:bg-surface-subtle hover:text-ashoka-blue rounded font-label-lg text-label-lg whitespace-nowrap transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            <span>Work Queue (Assignments)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-surface-container font-mono-code text-[11px] text-text-primary font-bold">
              3 Active
            </span>
          </NavLink>
          <NavLink
            to="/evaluator/project-reviews"
            className="flex items-center gap-space-xs px-space-md py-space-xs text-text-secondary hover:bg-surface-subtle hover:text-ashoka-blue rounded font-label-lg text-label-lg whitespace-nowrap transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            <span>Project Reviews</span>
          </NavLink>
        </nav>
      </div>

      {/* Notice Banner: Strict Read-Only Policy */}
      <div className="flex items-start justify-between bg-surface-container-high/60 p-space-md rounded-xl shadow-xs border border-border-hairline">
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-ashoka-blue text-[20px] mt-0.5">verified</span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-text-primary font-bold">
              Accredited Sovereign Evaluator Roster
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary">
              Profile attributes and domain jurisdictions are provisioned by the National Nodal Secretariat. To request modifications, submit a signed institutional rectification via Department Desk.
            </span>
          </div>
        </div>
        <span className="px-space-xs py-0.5 rounded bg-surface-crisp text-text-muted font-mono-code text-[11px] uppercase tracking-wider shadow-xs hidden sm:inline-block border border-border-hairline">
          READ_ONLY_MODE
        </span>
      </div>

      {/* Profile Not Found State (if any) */}
      {profileNotFound && (
        <div className="bg-status-action-bg border border-status-action-border p-space-base rounded-xl flex items-start gap-space-sm text-status-action-text">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold">Evaluator Profile Not Found in Live Service</h3>
            <p className="font-body-md text-body-md mt-1">
              Your account has the EVALUATOR role, but an onboarding profile has not yet been registered by the admin desk. Showing standard simulated dossier below for verification.
            </p>
          </div>
        </div>
      )}

      {error && !profileNotFound && (
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 p-space-base rounded-xl flex items-center justify-between text-[#93000a]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error.msg}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Main Multi-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Column Left: Institutional Personnel ID & Pool Architecture (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Personnel Identity Dossier Card */}
          <div className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-widest font-bold">
                PERSONNEL CREDENTIAL
              </span>
              <span className="px-2 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-label-sm font-bold">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-space-md pt-space-xs">
              <div className="relative w-20 h-20 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border border-border-hairline">
                <div className="w-full h-full bg-gradient-to-br from-ashoka-blue to-institutional-navy flex items-center justify-center text-on-primary font-bold text-2xl">
                  {activeProfile.fullName.charAt(0) || 'E'}
                </div>
                <div className="absolute bottom-0 right-0 bg-gov-emerald text-on-primary p-0.5 rounded-tl">
                  <span className="material-symbols-outlined text-[14px] block">verified</span>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-headline-md text-headline-md text-text-primary truncate">
                  {activeProfile.fullName}
                </h2>
                <span className="font-body-sm text-body-sm text-text-secondary line-clamp-2">
                  {activeProfile.designation || 'Senior Statutory Evaluator'}
                </span>
                <span className="font-mono-code text-[11px] text-text-muted mt-1">
                  {activeProfile.profileId}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs bg-surface-subtle p-space-sm rounded-lg border border-border-hairline">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-muted">Institution:</span>
                <span className="font-label-md text-label-md text-text-primary text-right font-bold">
                  {activeProfile.organization || 'IIT Madras'}
                </span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-muted">Field Tenure:</span>
                <span className="font-label-md text-label-md text-text-primary font-bold">
                  {activeProfile.experienceYears} Years
                </span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-muted">Concurrency Ceiling:</span>
                <span className="font-label-md text-label-md text-text-primary font-bold">
                  {activeProfile.maxWorkload} concurrent dossiers
                </span>
              </div>
            </div>

            {/* Institutional Signature Seal Stamp */}
            <div className="flex items-center gap-space-sm p-space-xs bg-surface-muted rounded border border-border-hairline">
              <span className="material-symbols-outlined text-ashoka-blue text-[20px]">account_balance</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-text-primary uppercase tracking-tight font-bold">
                  Affiliated Source Token
                </span>
                <span className="font-mono-code text-[12px] text-text-secondary truncate">
                  SRC-{activeProfile.evaluatorType}-2024-TN09
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Evaluation Pool Categorization Panel */}
          <div className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
                Assigned Evaluation Pool
              </span>
              <span className="font-mono-code text-[11px] text-text-muted">SYS-ROSTER-V2</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Evaluator pools define statutory authority, compliance jurisdictions, and conflict-of-interest firewalls.
            </p>

            {/* Pool Matrix Selectors */}
            <div className="flex flex-col gap-space-xs">
              {poolTypes.map((pt) => {
                const isCurrent = activeProfile.evaluatorType === pt.key;
                return (
                  <div
                    key={pt.key}
                    className={`flex items-center justify-between p-space-sm rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-ashoka-blue text-on-primary border-ashoka-blue shadow-xs'
                        : 'bg-surface-subtle text-text-secondary border-border-hairline opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-[18px]">
                        {pt.icon}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-bold">{pt.label}</span>
                        <span className={`text-[10px] ${isCurrent ? 'text-surface-variant' : 'text-text-muted'}`}>
                          {pt.desc}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-code text-[11px] font-bold">
                      {isCurrent ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column Right: Jurisdictional Allocations, Concurrency & Cryptographic Audit (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Jurisdictional Regional Allocations */}
          <div className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
                Jurisdictional Territory Allocations
              </span>
              <span className="font-mono-code text-[11px] px-2 py-0.5 rounded bg-surface-muted text-text-muted">
                GEO-SCOPE: SOUTHERN_REGION
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Statutory jurisdiction covers submissions originating from the following states and territories under National Innovation Council mapping:
            </p>

            <div className="flex flex-wrap gap-space-xs">
              {((activeProfile.regions && activeProfile.regions.length > 0)
                ? activeProfile.regions
                : (activeProfile.regionStates && activeProfile.regionStates.length > 0)
                ? activeProfile.regionStates
                : ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana']
              ).map((reg) => (
                <span
                  key={reg}
                  className="px-space-md py-1 rounded-lg bg-surface-container text-ashoka-blue font-label-md text-label-md font-semibold border border-surface-container-high flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px] text-gov-emerald">location_on</span>
                  {reg}
                </span>
              ))}
            </div>
          </div>

          {/* Concurrency & Workload Status */}
          <div className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
                Workload Saturation &amp; Concurrency
              </span>
              <span className="px-2 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-label-sm font-bold">
                OPTIMAL CAPACITY
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between text-body-sm">
                <span className="text-text-muted">Current Active Dossiers:</span>
                <span className="font-mono-code font-bold text-ashoka-blue">
                  3 / {activeProfile.maxWorkload || 5} (60% Saturation)
                </span>
              </div>
              <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden border border-border-hairline">
                <div className="bg-gov-emerald h-full rounded-full w-3/5 transition-all duration-500"></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
              <div className="p-space-sm rounded-lg bg-surface-subtle border border-border-hairline text-center">
                <span className="font-headline-md text-headline-md text-text-primary block font-bold">3</span>
                <span className="font-label-sm text-label-sm text-text-muted uppercase">In Progress</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-subtle border border-border-hairline text-center">
                <span className="font-headline-md text-headline-md text-gov-emerald block font-bold">12</span>
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Completed</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-subtle border border-border-hairline text-center">
                <span className="font-headline-md text-headline-md text-ashoka-blue block font-bold">2</span>
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Remaining Slots</span>
              </div>
            </div>
          </div>

          {/* Statutory Timestamps & Cryptographic Audit */}
          <div className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
                Statutory Timestamps &amp; Integrity Audit
              </span>
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="text-ashoka-blue hover:underline font-label-sm text-label-sm cursor-pointer"
              >
                {showRaw ? 'Hide Raw JSON' : 'View Payload'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm text-body-sm">
              <div className="p-space-sm bg-surface-subtle rounded-lg border border-border-hairline">
                <span className="text-text-muted text-[11px] block uppercase font-bold">Accredited On</span>
                <span className="font-mono-code text-text-primary font-bold">
                  {new Date(activeProfile.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="p-space-sm bg-surface-subtle rounded-lg border border-border-hairline">
                <span className="text-text-muted text-[11px] block uppercase font-bold">Last Synchronized</span>
                <span className="font-mono-code text-text-primary font-bold">
                  {new Date(activeProfile.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {showRaw && (
              <pre className="p-space-sm bg-surface-muted rounded font-mono-code text-[11px] text-text-primary overflow-x-auto border border-border-hairline">
                {JSON.stringify(activeProfile, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
