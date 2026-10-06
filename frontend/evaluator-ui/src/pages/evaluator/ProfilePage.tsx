import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import { getMyProfile } from '../../services/evaluatorService';
import type { EvaluatorProfileResponse } from '../../types';
import ErrorPanel from '../../components/ui/ErrorPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border border-border-hairline bg-surface-subtle p-space-sm">
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text-primary">{value == null || value === '' ? 'Not provided' : value}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EvaluatorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getMyProfile());
    } catch (cause) {
      setProfile(null);
      setError({ message: getErrorMessage(cause), status: getErrorStatus(cause) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  return (
    <main className="w-full max-w-5xl mx-auto px-space-lg py-space-base flex flex-col gap-space-lg">
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border-hairline pb-space-base">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-ashoka-blue">Evaluator Profile</h1>
          <p className="mt-1 text-body-sm text-text-secondary">Profile information returned by the evaluation service.</p>
        </div>
        <button type="button" onClick={() => void loadProfile()} disabled={loading} className="flex items-center gap-2 px-space-md py-2 rounded bg-ashoka-blue text-on-primary font-semibold disabled:opacity-60">
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          Refresh profile
        </button>
      </header>

      {error && <ErrorPanel status={error.status} message={error.message} onRetry={() => void loadProfile()} />}
      {loading && <div className="py-10 flex justify-center"><LoadingSpinner label="Loading evaluator profile…" /></div>}
      {!loading && !error && profile && (
        <>
          <section className="rounded-xl border border-border-hairline bg-surface-crisp p-space-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline pb-space-base">
              <div>
                <h2 className="font-headline-md text-text-primary">{profile.fullName}</h2>
                <p className="mt-1 text-sm text-text-secondary">{profile.designation || 'Designation not provided'}{profile.organization ? ` · ${profile.organization}` : ''}</p>
              </div>
              {(profile.status || (profile.active !== undefined ? (profile.active ? 'Active' : 'Inactive') : null)) && (
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">{profile.status || (profile.active ? 'Active' : 'Inactive')}</span>
              )}
            </div>
            <dl className="mt-space-base grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              <Detail label="Profile ID" value={profile.profileId} />
              <Detail label="User ID" value={profile.userId} />
              <Detail label="Evaluator type" value={profile.evaluatorType} />
              <Detail label="Organization" value={profile.organization} />
              <Detail label="Designation" value={profile.designation} />
              <Detail label="Experience (years)" value={profile.experienceYears} />
              <Detail label="Maximum workload" value={profile.maxWorkload} />
              <Detail label="Created" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString() : null} />
              <Detail label="Last updated" value={profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : null} />
            </dl>
          </section>
          <section className="rounded-xl border border-border-hairline bg-surface-crisp p-space-lg">
            <h2 className="font-label-lg text-text-primary font-bold">Regions</h2>
            {(profile.regions?.length || profile.regionStates?.length) ? (
              <ul className="mt-3 flex flex-wrap gap-2">{(profile.regions?.length ? profile.regions : profile.regionStates ?? []).map((region) => <li key={region} className="rounded-full bg-surface-muted px-3 py-1 text-sm text-text-secondary">{region}</li>)}</ul>
            ) : <p className="mt-2 text-sm text-text-secondary">No regions provided by the profile service.</p>}
          </section>
        </>
      )}
    </main>
  );
}
