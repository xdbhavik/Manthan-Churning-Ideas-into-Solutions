import React from 'react';
import { Submission, ProjectReview } from '../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  reviews: ProjectReview[];
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
  message: string;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  submissions,
  reviews,
}) => {
  if (!isOpen) return null;

  const items: NotificationItem[] = [
    ...submissions
      .filter((s) => s.status === 'UNDER_REVIEW')
      .map((s) => ({
        id: `sub-${s.submissionId}`,
        title: 'Submission under review',
        time: s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—',
        type: 'INFO' as const,
        message: s.title || s.submissionId,
      })),
    ...submissions
      .filter((s) => s.status === 'RETURNED')
      .map((s) => ({
        id: `ret-${s.submissionId}`,
        title: 'Submission returned',
        time: s.decidedAt ? new Date(s.decidedAt).toLocaleString() : '—',
        type: 'ALERT' as const,
        message: `${s.title || s.submissionId} — ${s.decisionComment || 'See decision note'}`,
      })),
    ...reviews
      .filter((r) => r.reviewStatus === 'ASSIGNED')
      .map((r) => ({
        id: `rev-${r.reviewId}`,
        title: 'New review assigned',
        time: new Date(r.createdAt).toLocaleString(),
        type: 'INFO' as const,
        message: r.submissionTitle || r.problemTitle,
      })),
  ];

  return (
    <div className="fixed inset-0 bg-[#00152f]/40 backdrop-blur-[2px] z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col border-l border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
          <h3 className="font-headline text-[16px] font-bold text-[#0b1c30]">Notifications</h3>
          <button onClick={onClose} className="text-[#74777f]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 flex flex-col gap-2.5">
          {items.length === 0 && (
            <div className="flex flex-col items-center text-center gap-2 py-16 text-[#74777f]">
              <span className="material-symbols-outlined text-[36px]">notifications_off</span>
              <span className="text-[13px]">You're all caught up.</span>
            </div>
          )}
          {items.map((n) => (
            <div key={n.id} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] flex gap-2.5">
              <span
                className={`material-symbols-outlined text-[18px] mt-0.5 ${
                  n.type === 'ALERT' ? 'text-[#ba1a1a]' : n.type === 'SUCCESS' ? 'text-[#002c47]' : 'text-[#00152f]'
                }`}
              >
                {n.type === 'ALERT' ? 'warning' : n.type === 'SUCCESS' ? 'check_circle' : 'info'}
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-[13px] text-[#0b1c30]">{n.title}</span>
                <span className="text-[12px] text-[#43474e] leading-snug">{n.message}</span>
                <span className="text-[10px] text-[#74777f] mt-0.5 font-mono">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};