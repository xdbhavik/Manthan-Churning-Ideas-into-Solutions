import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserId } from '../lib/auth';
import { getMyAssignments, getMyAllProjectReviews } from '../services/evaluatorService';
import type { AssignmentResponse, ProjectReviewListItem } from '../types';

export type EvaluatorNotificationCategory = 'assignment' | 'deadline' | 'project' | 'status';
export interface EvaluatorNotification {
  id: string;
  category: EvaluatorNotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  href: string;
  urgent?: boolean;
}

const readStorageKey = () => `evaluator-notifications-read:${getUserId() || 'unknown'}`;
const readIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(readStorageKey()) || '[]') as string[]; }
  catch { return []; }
};

function buildNotifications(assignments: AssignmentResponse[], reviews: ProjectReviewListItem[]): EvaluatorNotification[] {
  const now = Date.now();
  const notifications: EvaluatorNotification[] = [];
  assignments.forEach((assignment) => {
    const open = ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'].includes(assignment.status);
    if (assignment.status === 'ASSIGNED') {
      notifications.push({
        id: `assignment:${assignment.assignmentId}:${assignment.status}`,
        category: 'assignment', title: 'Assignment awaiting review',
        message: assignment.problemTitle || `Problem ${assignment.problemId}`,
        createdAt: assignment.assignedAt, href: `/evaluator/assignments/${assignment.assignmentId}`,
      });
    } else if (assignment.status === 'IN_PROGRESS') {
      notifications.push({
        id: `assignment:${assignment.assignmentId}:${assignment.status}`,
        category: 'assignment', title: 'Continue your evaluation',
        message: assignment.problemTitle || `Problem ${assignment.problemId}`,
        createdAt: assignment.assignedAt, href: `/evaluator/assignments/${assignment.assignmentId}`,
      });
    }
    const deadline = assignment.deadlineAt || assignment.deadline;
    if (open && deadline) {
      const remaining = new Date(deadline).getTime() - now;
      if (remaining <= 48 * 60 * 60 * 1000) {
        notifications.push({
          id: `deadline:${assignment.assignmentId}:${deadline}`,
          category: 'deadline', title: remaining < 0 ? 'Assignment is overdue' : 'Deadline approaching',
          message: `${assignment.problemTitle || `Problem ${assignment.problemId}`} · ${remaining < 0 ? 'Deadline passed' : `Due ${new Date(deadline).toLocaleString()}`}`,
          createdAt: assignment.assignedAt, href: `/evaluator/assignments/${assignment.assignmentId}`, urgent: true,
        });
      }
    }
    if (['SUBMITTED', 'REVIEWED', 'DECLINED', 'EXPIRED', 'REJECTED'].includes(assignment.status)) {
      notifications.push({
        id: `assignment:${assignment.assignmentId}:${assignment.status}`,
        category: 'status', title: `Assignment ${assignment.status.toLowerCase()}`,
        message: assignment.problemTitle || `Problem ${assignment.problemId}`,
        createdAt: assignment.submittedAt || assignment.assignedAt,
        href: `/evaluator/assignments/${assignment.assignmentId}`,
      });
    }
  });
  reviews.forEach((review) => {
    const assigned = review.status === 'ASSIGNED';
    notifications.push({
      id: `project-review:${review.projectReviewId}:${review.status}`,
      category: assigned ? 'project' : 'status',
      title: assigned ? 'New project review assigned' : `Project review ${review.status.toLowerCase()}`,
      message: `${review.submissionTitle || 'Untitled solution'} · ${review.problemTitle}`,
      createdAt: review.decidedAt || review.createdAt,
      href: `/evaluator/project-reviews/${review.projectReviewId}`,
      urgent: assigned,
    });
  });
  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function useEvaluatorNotifications() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [reviews, setReviews] = useState<ProjectReviewListItem[]>([]);
  const [read, setRead] = useState<string[]>(readIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const notifications = useMemo(() => buildNotifications(assignments, reviews), [assignments, reviews]);

  const refresh = useCallback(async () => {
    const [assignmentResult, reviewResult] = await Promise.allSettled([getMyAssignments(), getMyAllProjectReviews()]);
    const failed = assignmentResult.status === 'rejected' && reviewResult.status === 'rejected';
    if (assignmentResult.status === 'fulfilled') setAssignments(assignmentResult.value);
    if (reviewResult.status === 'fulfilled') setReviews(reviewResult.value);
    setError(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    const syncRead = () => setRead(readIds());
    window.addEventListener('evaluator-notifications-read', syncRead);
    window.addEventListener('storage', syncRead);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('evaluator-notifications-read', syncRead);
      window.removeEventListener('storage', syncRead);
    };
  }, [refresh]);

  const markRead = useCallback((id: string) => {
    setRead((current) => {
      const next = current.includes(id) ? current : [...current, id];
      localStorage.setItem(readStorageKey(), JSON.stringify(next));
      window.dispatchEvent(new Event('evaluator-notifications-read'));
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const next = [...new Set([...read, ...notifications.map((item) => item.id)])];
    localStorage.setItem(readStorageKey(), JSON.stringify(next));
    setRead(next);
    window.dispatchEvent(new Event('evaluator-notifications-read'));
  }, [notifications, read]);

  return { notifications, unreadCount: notifications.filter((item) => !read.includes(item.id)).length, isRead: (id: string) => read.includes(id), markRead, markAllRead, refresh, loading, error };
}
