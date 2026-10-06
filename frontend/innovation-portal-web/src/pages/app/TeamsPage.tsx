import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import { Button, Card, Input } from '../../components/ui';

export default function TeamsPage() {
  const { authed } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [problemId, setProblemId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ participantId: string; fullName: string }[]>([]);
  const [selected, setSelected] = useState<{ participantId: string; fullName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const teams = useQuery({ queryKey: ['portal', 'teams'], queryFn: portal.getMyTeams, enabled: authed });
  const invites = useQuery({ queryKey: ['portal', 'team-invitations'], queryFn: portal.getTeamInvitations, enabled: authed, refetchInterval: 30000 });
  const problems = useQuery({ queryKey: ['portal', 'problems'], queryFn: portal.getProblems, enabled: authed });

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const found = await portal.searchStudentParticipants(search.trim());
        if (active) setResults(found.filter(p => !selected.some(s => s.participantId === p.participantId)));
      } catch (error) { if (active) toast.notify(getErrorMessage(error), 'error'); }
      finally { if (active) setSearching(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, selected]);

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['portal', 'teams'] }),
      client.invalidateQueries({ queryKey: ['portal', 'team-invitations'] }),
      client.invalidateQueries({ queryKey: ['portal', 'submissions'] }),
    ]);
  };
  const create = useMutation({
    mutationFn: () => portal.createTeam({ problemId, name: teamName.trim(), inviteeParticipantIds: selected.map(p => p.participantId) }),
    onSuccess: async () => { await refresh(); toast.notify('Team created and invitations sent', 'success'); setCreateOpen(false); setTeamName(''); setSelected([]); setSearch(''); },
    onError: e => toast.notify(getErrorMessage(e), 'error'),
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => portal.respondToTeamInvitation(id, accept),
    onSuccess: async (_data, vars) => { await refresh(); toast.notify(vars.accept ? 'Invitation accepted. You are now a team member.' : 'Invitation declined', 'success'); },
    onError: e => toast.notify(getErrorMessage(e), 'error'),
  });
  const pending = invites.data?.filter(i => i.direction === 'RECEIVED' && i.status === 'PENDING') ?? [];

  return <div className="p-space-lg lg:p-space-xl space-y-space-xl max-w-[1600px] mx-auto w-full">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
      <div><h1 className="font-display-lg text-display-lg text-on-surface">My Teams</h1><p className="font-body-md text-body-md text-on-surface-variant">Create teams for a published problem and invite registered Innovation Portal students.</p></div>
      <Button variant="primary" onClick={() => setCreateOpen(v => !v)} className="h-10 px-space-md">{createOpen ? 'Close' : 'Create a team'}</Button>
    </div>

    {createOpen && <Card variant="default" className="space-y-space-md">
      <h2 className="font-headline-md text-headline-md text-on-surface">Create a team and invite students</h2>
      <label className="block text-sm font-medium text-on-surface">Problem statement<select className="mt-1 w-full rounded-lg border border-border-subtle bg-surface-card p-3 text-on-surface" value={problemId} onChange={e => setProblemId(e.target.value)}><option value="">Choose a published problem</option>{(problems.data ?? []).map(p => <option key={p.problemId} value={p.problemId}>{p.title}</option>)}</select></label>
      <Input label="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Campus Innovators" />
      <Input label="Find registered students" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name" helperText="Students are added only after they accept your invitation." />
      {(searching || results.length > 0 || search.trim().length >= 2) && <div className="max-h-44 overflow-y-auto rounded-lg border border-border-subtle">{searching ? <p className="p-3 text-sm">Searching…</p> : results.length ? results.map(p => <button key={p.participantId} className="block w-full px-3 py-2 text-left hover:bg-surface-container-low" onClick={() => { setSelected(old => [...old, p]); setSearch(''); }}><span className="font-medium">{p.fullName}</span><span className="float-right text-primary">Invite</span></button>) : <p className="p-3 text-sm text-on-surface-variant">No registered students found.</p>}</div>}
      <div className="flex flex-wrap gap-2">{selected.map(p => <span key={p.participantId} className="rounded-full bg-primary-container px-3 py-1 text-sm">{p.fullName}<button className="ml-2" aria-label={`Remove ${p.fullName}`} onClick={() => setSelected(s => s.filter(x => x.participantId !== p.participantId))}>×</button></span>)}</div>
      <Button variant="primary" disabled={!problemId || !teamName.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : `Create team${selected.length ? ` and invite ${selected.length}` : ''}`}</Button>
    </Card>}

    <section className="space-y-space-md"><h2 className="font-headline-md text-headline-md text-on-surface">Team invitations {pending.length > 0 && <span className="rounded-full bg-primary-container px-2 py-0.5 text-sm text-primary">{pending.length} new</span>}</h2>
      {pending.length === 0 ? <p className="text-sm text-on-surface-variant">No pending invitations.</p> : pending.map(i => <Card key={i.invitationId} variant="default" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-on-surface">{i.inviterName} invited you to {i.teamName}</p><p className="text-sm text-on-surface-variant">Problem: {i.problemTitle}</p></div><div className="flex gap-2"><Button variant="primary" disabled={respond.isPending} onClick={() => respond.mutate({ id: i.invitationId, accept: true })}>Accept</Button><Button variant="secondary" disabled={respond.isPending} onClick={() => respond.mutate({ id: i.invitationId, accept: false })}>Decline</Button></div></Card>)}
    </section>

    <section className="space-y-space-md"><h2 className="font-headline-md text-headline-md text-on-surface">Your teams</h2>
      {teams.isLoading ? <div className="h-40 rounded-xl skeleton-shimmer" /> : teams.data?.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">{teams.data.map(team => <Card key={team.teamId} variant="default" className="space-y-4"><div><div className="flex items-center justify-between"><h3 className="font-headline-md text-headline-md text-on-surface">{team.name}</h3><span className="rounded-full bg-surface-container px-2 py-1 text-xs">{team.callerRole}</span></div><p className="mt-1 text-sm text-on-surface-variant">{team.problemTitle}</p></div><div><h4 className="mb-2 text-xs uppercase tracking-wide text-on-surface-variant">Members ({team.members.length})</h4><ul className="space-y-2">{team.members.map(member => <li key={member.participantId} className="flex items-center gap-2 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-primary">{member.fullName.charAt(0).toUpperCase()}</span>{member.fullName}</li>)}</ul></div><Link className="text-sm font-semibold text-primary" to={`/app/problems/${team.problemId}`}>View problem</Link></Card>)}</div> : <Card variant="default" className="py-10 text-center"><p className="font-semibold text-on-surface">No teams yet</p><p className="mt-1 text-sm text-on-surface-variant">Create a team above and invite registered students.</p></Card>}
    </section>
    <section className="space-y-2"><h2 className="font-headline-md text-headline-md text-on-surface">Sent invitations</h2>{(invites.data ?? []).filter(i => i.direction === 'SENT').map(i => <div key={i.invitationId} className="flex justify-between rounded-lg border border-border-subtle bg-surface-card p-3 text-sm"><span>{i.inviteeName} · {i.teamName}</span><span className={i.status === 'PENDING' ? 'text-primary' : 'text-on-surface-variant'}>{i.status}</span></div>)}</section>
  </div>;
}
