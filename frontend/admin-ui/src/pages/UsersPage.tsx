import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import ErrorAlert from '../components/ui/ErrorAlert';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getUser, changeRole } from '../services/userService';
import { getErrorMessage } from '../lib/api';
import type { UserResponse } from '../types';

type AssignableRole = 'SUBMITTER' | 'REVIEWER' | 'ADMIN';

function UserDossier({ user, onRoleChange }: { user: UserResponse; onRoleChange: (role: AssignableRole) => void }) {
  const [selectedRole, setSelectedRole] = useState<AssignableRole>(
    (user.role === 'EVALUATOR' ? 'SUBMITTER' : user.role) as AssignableRole
  );
  const [showConfirm, setShowConfirm] = useState(false);

  function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRole !== user.role) {
      setShowConfirm(true);
    }
  }

  return (
    <div className="flex flex-col gap-space-xl">
      {/* Dossier Header */}
      <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-ashoka-blue text-[20px]" aria-hidden="true">
              badge
            </span>
            <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
              Identity Dossier
            </span>
          </div>
          <StatusBadge status={user.role} />
        </div>

        <div className="p-space-xl grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <Field label="User UUID" value={user.userId} mono />
          <Field label="Phone Number" value={user.phone} mono />
          <Field label="Email Address" value={user.email ?? 'Not provided'} />
          <Field label="Account Created" value={new Date(user.createdAt).toLocaleString('en-IN')} />
          <Field label="KYC Status" value={<StatusBadge status={user.kycStatus} />} />
          <Field label="Linked Source ID" value={user.linkedSourceId ?? 'None'} mono />
        </div>
      </div>

      {/* Authorization Action Desk */}
      <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-text-secondary text-[20px]" aria-hidden="true">
              admin_panel_settings
            </span>
            <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
              Authorization Action Desk
            </span>
          </div>
        </div>
        
        <div className="p-space-xl flex flex-col gap-space-lg">
          <div className="flex items-start gap-space-sm p-space-md bg-amber-50/60 border border-amber-200 rounded-lg">
            <span className="material-symbols-outlined text-saffron-accent text-[20px] flex-shrink-0 mt-0.5">warning</span>
            <div>
              <p className="font-label-sm text-label-sm text-amber-800 uppercase tracking-wider font-semibold">
                Immediate Effect
              </p>
              <p className="font-body-sm text-body-sm text-amber-900 mt-1">
                Role modifications alter access control instantly across the system. The user's active sessions will reflect the new permissions immediately without requiring re-authentication.
              </p>
            </div>
          </div>

          <form onSubmit={handleRoleSubmit} className="flex flex-col gap-space-sm">
            <label className="font-label-md text-label-md text-text-primary" htmlFor="role-select">
              System Role Assignment
            </label>
            <div className="flex flex-col sm:flex-row gap-space-md">
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
                className="flex-1 h-10 px-space-md rounded border border-border-strong bg-surface-crisp font-body-md text-body-md text-text-primary focus:outline-none focus:border-ashoka-blue"
              >
                <option value="SUBMITTER">SUBMITTER — Can submit registrations and problems</option>
                <option value="REVIEWER">REVIEWER — Can audit and verify submissions</option>
                <option value="ADMIN">ADMIN — Full systemic access and user management</option>
              </select>
              <button
                id="change-role-btn"
                type="submit"
                disabled={selectedRole === user.role}
                className="h-10 px-space-xl rounded bg-ashoka-blue text-white hover:bg-institutional-navy transition-colors cursor-pointer font-medium disabled:opacity-50 shadow-sm"
              >
                Apply Role Change
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={selectedRole === 'ADMIN' ? 'Grant Full Admin Privileges' : 'Confirm Role Change'}
        description={
          selectedRole === 'ADMIN'
            ? 'You are granting this account ultimate administrative access. They will bypass all standard restrictions.'
            : `You are modifying this account's access level to ${selectedRole}. This is an audited action.`
        }
        confirmLabel="Execute Change"
        requiredTyping={selectedRole === 'ADMIN' ? 'CONFIRM' : undefined}
        danger={selectedRole === 'ADMIN'}
        onConfirm={() => { setShowConfirm(false); onRoleChange(selectedRole); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-[11px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`font-body-md text-body-md text-text-primary break-all ${mono ? 'font-mono-code text-body-sm bg-surface-muted px-1.5 py-0.5 rounded inline-block w-fit' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function UsersPage() {
  const [userId, setUserId] = useState('');
  const [userInput, setUserInput] = useState('');
  const [user, setUser] = useState<UserResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignableRole }) => changeRole(id, role),
    onSuccess: (updated) => {
      setUser(updated);
      setFetchError(null);
    },
  });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!userInput.trim()) return;
    setFetchLoading(true);
    setFetchError(null);
    setUser(null);
    roleChangeMutation.reset();
    try {
      const result = await getUser(userInput.trim());
      setUser(result);
      setUserId(userInput.trim());
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setFetchLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Identity & Access Management"
        subtitle="Look up system identities by UUID and manage platform authorization roles."
      />

      <div className="flex-1 overflow-y-auto p-space-2xl">
        <div className="max-w-4xl mx-auto flex flex-col gap-space-xl">
          
          {/* Centralized Search Console */}
          <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm p-space-xl flex flex-col gap-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-text-primary">
                Security & Identity Lookup
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                Enter a verified User UUID to retrieve their identity dossier.
              </p>
            </div>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
              <div className="flex-1 w-full relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
                  search
                </span>
                <input
                  id="user-id-input"
                  type="text"
                  placeholder="Enter User UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full h-10 pl-10 pr-space-md rounded border border-border-strong bg-surface-crisp font-mono-code text-body-md text-text-primary placeholder:text-outline-variant focus:outline-none focus:border-ashoka-blue"
                />
              </div>
              <button
                id="user-search-btn"
                type="submit"
                disabled={fetchLoading || !userInput.trim()}
                className="w-full sm:w-auto h-10 px-space-xl rounded bg-surface-muted border border-border-strong text-text-primary hover:bg-surface-container transition-colors cursor-pointer font-medium disabled:opacity-50 flex items-center justify-center gap-space-sm"
              >
                {fetchLoading ? (
                  <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">person_search</span>
                )}
                Lookup User
              </button>
            </form>
          </div>

          {/* Error State */}
          {fetchError && <ErrorAlert message={fetchError} onDismiss={() => setFetchError(null)} />}
          {roleChangeMutation.isError && <ErrorAlert message={getErrorMessage(roleChangeMutation.error)} />}

          {/* Success State */}
          {roleChangeMutation.isSuccess && (
            <div className="flex items-center gap-space-sm p-space-md bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
              <span className="font-body-sm text-body-sm font-medium">
                Authorization update executed successfully.
              </span>
            </div>
          )}

          {/* Loaded Dossier */}
          {user && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <UserDossier
                user={user}
                onRoleChange={(role) => roleChangeMutation.mutate({ id: userId, role })}
              />
            </div>
          )}
          
          {/* Empty State when nothing is loaded or searching */}
          {!user && !fetchLoading && !fetchError && (
            <div className="mt-space-2xl flex flex-col items-center justify-center text-text-muted">
              <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-space-md border border-border-hairline">
                <span className="material-symbols-outlined text-[32px]">shield_person</span>
              </div>
              <p className="font-label-lg text-label-lg text-text-primary">
                Awaiting Identity Query
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1 text-center max-w-sm">
                System architecture mandates direct UUID queries for administrative security. Global user indexing is disabled in this tier.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
