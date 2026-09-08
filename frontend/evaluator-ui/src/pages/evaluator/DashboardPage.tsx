import React, { useEffect, useState, useCallback } from 'react';
import { getMyProfile, getMyCriteria } from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { EvaluatorProfileResponse, EvaluationCriteria } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DashboardPage() {
  const [profile, setProfile] = useState<EvaluatorProfileResponse | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [profileError, setProfileError] = useState<{ msg: string; status: number | null } | null>(null);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true); setProfileError(null); setProfileNotFound(false);
    try {
      setProfile(await getMyProfile());
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 404) setProfileNotFound(true);
      else setProfileError({ msg: getErrorMessage(e), status });
    } finally { setProfileLoading(false); }
  }, []);

  const loadCriteria = useCallback(async () => {
    setCriteriaLoading(true); setCriteriaError(null);
    try {
      const data = await getMyCriteria();
      setCriteria(data.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) { setCriteriaError(getErrorMessage(e)); }
    finally { setCriteriaLoading(false); }
  }, []);

  useEffect(() => { void loadProfile(); void loadCriteria(); }, [loadProfile, loadCriteria]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Evaluator Dashboard</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Your profile and assigned evaluation criteria</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Profile Panel */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[#0A2540] text-[20px]">account_circle</span>
            <h2 className="text-[15px] font-semibold text-[#0A2540]">Evaluator Profile</h2>
            <span className="ml-auto text-[11px] text-[#64748B] font-mono-code">GET /evaluation/me/profile</span>
          </div>

          {profileLoading && <div className="p-8 flex justify-center"><LoadingSpinner label="Loading profile…" /></div>}

          {profileNotFound && !profileLoading && (
            <div className="p-5">
              <div className="flex items-start gap-3 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                <span className="material-symbols-outlined text-[#D97706] text-[20px] shrink-0">warning</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#92400E]">No Evaluator Profile Found</p>
                  <p className="text-[13px] text-[#92400E] mt-0.5">
                    You have been authenticated as EVALUATOR but no evaluation profile exists in the system.
                    Please contact an administrator to create your evaluator profile before you can receive assignments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {profileError && !profileLoading && (
            <ErrorPanel status={profileError.status} message={profileError.msg} onRetry={loadProfile} />
          )}

          {profile && !profileLoading && (
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              {[
                ['Profile ID', profile.profileId],
                ['User ID', profile.userId],
                ['Full Name', profile.fullName],
                ['Evaluator Type', profile.evaluatorType],
                ['Organization', profile.organization ?? '—'],
                ['Designation', profile.designation ?? '—'],
                ['Experience', profile.experienceYears != null ? profile.experienceYears + ' years' : '—'],
                ['Max Workload', profile.maxWorkload.toString()],
                ['Active', profile.active ? 'Yes' : 'No'],
                ['Created', new Date(profile.createdAt).toLocaleDateString()],
                ['Updated', new Date(profile.updatedAt).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-0.5">{label}</div>
                  {label === 'Evaluator Type' ? (
                    <StatusBadge status={value as string} />
                  ) : (
                    <div className="text-[#0A2540] font-medium break-all">{value}</div>
                  )}
                </div>
              ))}
              {profile.regions.length > 0 && (
                <div className="col-span-2">
                  <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Regions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.regions.map((r) => (
                      <span key={r} className="px-2 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[12px] text-[#475569]">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Criteria Panel */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[#0A2540] text-[20px]">fact_check</span>
            <h2 className="text-[15px] font-semibold text-[#0A2540]">Evaluation Criteria</h2>
            <span className="ml-auto text-[11px] text-[#64748B] font-mono-code">GET /evaluation/me/criteria</span>
          </div>

          {criteriaLoading && <div className="p-8 flex justify-center"><LoadingSpinner label="Loading criteria…" /></div>}
          {criteriaError && !criteriaLoading && <ErrorPanel message={criteriaError} onRetry={loadCriteria} compact />}

          {!criteriaLoading && !criteriaError && criteria.length === 0 && (
            <div className="p-8 text-center text-[13px] text-[#64748B]">No criteria assigned yet.</div>
          )}

          {!criteriaLoading && criteria.length > 0 && (
            <div className="divide-y divide-[#E2E8F0]">
              {criteria.map((c) => (
                <div key={c.key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-[#0A2540]">{c.label}</span>
                        <span className="font-mono-code text-[11px] bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded border border-[#E2E8F0]">{c.key}</span>
                      </div>
                      <p className="text-[12px] text-[#64748B]">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-[#64748B]">Max Score</div>
                      <div className="text-[18px] font-bold text-[#0A2540]">{c.maxScore}</div>
                    </div>
                  </div>
                  {c.existingScore != null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[12px] text-[#059669] font-semibold">Score: {c.existingScore}/{c.maxScore}</span>
                      {c.existingComment && <span className="text-[12px] text-[#64748B] truncate">{c.existingComment}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
