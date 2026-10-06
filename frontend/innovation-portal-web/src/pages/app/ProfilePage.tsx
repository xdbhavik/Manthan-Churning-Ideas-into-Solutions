import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMe, useMySubmissions, portalKeys } from '../../hooks/usePortalQueries';
import { Button, Card, LinkButton } from '../../components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMe } from '../../services/portalService';

export default function ProfilePage() {
  const { authed, user } = useAuth();
  const meQuery = useMe(authed);
  const subsQuery = useMySubmissions(authed);
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const participant = meQuery.data;
  const submissions = subsQuery.data ?? [];

  useEffect(() => {
    if (participant) setPhone(participant.phone || '');
  }, [participant]);

  const teams = useMemo(() => {
    const uniqueTeams = new Map<string, NonNullable<(typeof submissions)[number]['team']>>();
    submissions.forEach((submission) => {
      if (submission.team) uniqueTeams.set(submission.team.teamId, submission.team);
    });
    return [...uniqueTeams.values()];
  }, [submissions]);

  const stats = useMemo(() => ({
    total: submissions.length,
    drafts: submissions.filter((submission) => submission.status === 'DRAFT').length,
    underReview: submissions.filter((submission) => submission.status === 'UNDER_REVIEW' || submission.status === 'SUBMITTED').length,
    returned: submissions.filter((submission) => submission.status === 'RETURNED').length,
    accepted: submissions.filter((submission) => submission.status === 'ACCEPTED').length,
  }), [submissions]);

  const updateMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updatedParticipant) => queryClient.setQueryData(portalKeys.me, updatedParticipant),
  });

  const handleUpdatePhone = (event: React.FormEvent) => {
    event.preventDefault();
    if (!participant) return;
    updateMutation.mutate({ fullName: participant.fullName, email: participant.email, phone });
  };

  if (meQuery.isLoading || subsQuery.isLoading) {
    return <main className="mx-auto max-w-4xl space-y-4 px-4 py-8"><div className="h-8 w-48 rounded skeleton-shimmer" /><div className="h-48 rounded-xl skeleton-shimmer" /></main>;
  }

  if (!participant) {
    return <main className="mx-auto max-w-4xl px-4 py-8"><Card variant="default" className="p-5"><p className="text-on-surface">Could not load your participant profile.</p><p className="mt-1 text-sm text-on-surface-variant">{meQuery.error instanceof Error ? meQuery.error.message : 'Try again later.'}</p><Button className="mt-4" variant="secondary" onClick={() => meQuery.refetch()}>Retry</Button></Card></main>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Participant profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Your registered portal details and submission summary.</p>
      </header>

      <Card variant="default" className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-on-surface">Registered details</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Name</dt><dd className="mt-1 text-sm text-on-surface">{participant.fullName || user?.phone || 'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Participant type</dt><dd className="mt-1 text-sm text-on-surface">{participant.participantType || 'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Email</dt><dd className="mt-1 break-all text-sm text-on-surface">{participant.email || 'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Institution</dt><dd className="mt-1 text-sm text-on-surface">{participant.institutionName || 'Not provided'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-on-surface-variant">Participant ID</dt><dd className="mt-1 break-all font-mono text-sm text-on-surface">{participant.participantId}</dd></div>
        </dl>
      </Card>

      <Card variant="default" className="space-y-4 p-5">
        <div><h2 className="text-lg font-semibold text-on-surface">Contact number</h2><p className="mt-1 text-sm text-on-surface-variant">Update the phone number saved on your participant profile.</p></div>
        <form onSubmit={handleUpdatePhone} className="flex flex-col gap-3 sm:flex-row">
          <input aria-label="Contact phone number" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-on-surface" />
          <Button type="submit" variant="primary" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Update phone'}</Button>
        </form>
        {updateMutation.isSuccess && <p className="text-sm text-state-accepted-text">Phone number saved.</p>}
        {updateMutation.isError && <p className="text-sm text-state-returned-text">Could not save the phone number.</p>}
      </Card>

      <Card variant="default" className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-on-surface">Submission summary</h2><p className="mt-1 text-sm text-on-surface-variant">Counts from your current submissions.</p></div><LinkButton to="/app/submissions" variant="secondary">View submissions</LinkButton></div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([['Total', stats.total], ['Drafts', stats.drafts], ['Under review', stats.underReview], ['Returned', stats.returned], ['Accepted', stats.accepted]] as const).map(([label, count]) => <div key={label} className="rounded-lg bg-surface-container-low p-3"><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="mt-1 text-xl font-bold text-on-surface">{count}</dd></div>)}
        </dl>
      </Card>

      <Card variant="default" className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-on-surface">Teams on your submissions</h2><p className="mt-1 text-sm text-on-surface-variant">Teams attached to submissions you can access.</p></div><LinkButton to="/app/teams" variant="secondary">Manage teams</LinkButton></div>
        {teams.length ? teams.map((team) => <div key={team.teamId} className="rounded-lg bg-surface-container-low p-3"><h3 className="font-semibold text-on-surface">{team.name}</h3><p className="mt-1 text-sm text-on-surface-variant">{team.members.map((member) => member.fullName).join(', ')}</p></div>) : <p className="text-sm text-on-surface-variant">No team submissions yet.</p>}
      </Card>
    </main>
  );
}
