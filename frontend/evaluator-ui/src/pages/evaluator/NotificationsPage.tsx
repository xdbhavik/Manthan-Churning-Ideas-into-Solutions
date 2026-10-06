import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvaluatorNotifications, type EvaluatorNotificationCategory } from '../../hooks/useEvaluatorNotifications';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Filter = 'all' | 'unread' | EvaluatorNotificationCategory;
const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All alerts' }, { id: 'unread', label: 'Unread' },
  { id: 'assignment', label: 'Assignments' }, { id: 'deadline', label: 'Deadlines' },
  { id: 'project', label: 'Project updates' }, { id: 'status', label: 'Review status' },
];
const icon: Record<EvaluatorNotificationCategory, string> = { assignment: 'assignment_add', deadline: 'schedule', project: 'folder_open', status: 'fact_check' };
const tone: Record<EvaluatorNotificationCategory, string> = {
  assignment: 'bg-blue-50 text-blue-700', deadline: 'bg-amber-50 text-amber-700',
  project: 'bg-violet-50 text-violet-700', status: 'bg-emerald-50 text-emerald-700',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, isRead, markRead, markAllRead, refresh, loading, error } = useEvaluatorNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => notifications.filter((item) => {
    if (filter === 'unread') return !isRead(item.id);
    return filter === 'all' || item.category === filter;
  }), [filter, isRead, notifications]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Evaluator updates</p><h1 className="mt-1 text-2xl font-bold text-[#0A2540]">Notifications</h1><p className="mt-1 text-sm text-[#64748B]">Assignments, upcoming deadlines, project updates and review decisions.</p></div>
        <div className="flex gap-2"><button onClick={() => void refresh()} className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold text-[#334155] hover:bg-slate-50"><span className="material-symbols-outlined mr-1 align-middle text-base">refresh</span>Refresh</button><button onClick={markAllRead} disabled={!unreadCount} className="rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1E3A8A] disabled:cursor-not-allowed disabled:opacity-50">Mark all read</button></div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter notifications">
        {filters.map((item) => <button key={item.id} role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === item.id ? 'border-[#0A2540] bg-[#0A2540] text-white' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'}`}>{item.label}{item.id === 'unread' && unreadCount > 0 ? ` · ${unreadCount}` : ''}</button>)}
      </div>

      {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some alerts could not be loaded. Check your connection and retry.<button onClick={() => void refresh()} className="font-bold underline">Retry</button></div>}
      {loading && <div className="flex justify-center py-12"><LoadingSpinner label="Loading notifications…" /></div>}
      {!loading && visible.length === 0 && <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center"><span className="material-symbols-outlined text-4xl text-[#94A3B8]">notifications_off</span><h2 className="mt-3 font-semibold text-[#0A2540]">You're all caught up</h2><p className="mt-1 text-sm text-[#64748B]">New assignments and review updates will appear here.</p></div>}
      {!loading && visible.length > 0 && <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">{visible.map((item, index) => {
        const read = isRead(item.id);
        return <Link key={item.id} to={item.href} onClick={() => markRead(item.id)} className={`flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 ${index ? 'border-t border-[#E2E8F0]' : ''} ${read ? '' : 'bg-blue-50/40'}`}>
          <span className={`material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone[item.category]}`}>{icon[item.category]}</span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#0A2540]">{item.title}</span>{item.urgent && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Action needed</span>}{!read && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}</span><span className="mt-1 block truncate text-sm text-[#475569]">{item.message}</span><time className="mt-2 block text-xs text-[#94A3B8]" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></span>
          <span className="material-symbols-outlined mt-2 text-[#94A3B8]">chevron_right</span>
        </Link>;
      })}</div>}
      <p className="mt-4 text-xs text-[#94A3B8]">Alerts refresh automatically every minute. Read status is saved on this device.</p>
    </div>
  );
}
