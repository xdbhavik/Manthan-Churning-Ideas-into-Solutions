import { formatDate } from '../../models/labels';
import type { Submission, SubmissionStatus } from '../../types/dto';

interface Node {
  key: string;
  label: string;
  state: 'done' | 'current' | 'pending';
  when?: string | null;
}

export function SubmissionTimeline({ submission }: { submission: Submission }) {
  const order: SubmissionStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'];
  const status = submission.status;
  const terminal = status === 'ACCEPTED' || status === 'RETURNED' ? status : null;

  let currentIndex = order.indexOf(status);
  const nodes: Node[] = order.map((s, i) => {
    let state: Node['state'];
    if (status === 'DRAFT') state = i === 0 ? 'current' : i === 1 ? 'pending' : 'pending';
    else if (terminal) state = 'done';
    else state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
    const when = s === 'DRAFT' ? null : s === 'SUBMITTED' ? submission.submittedAt : null;
    return { key: s, label: s === 'DRAFT' ? 'Draft created' : s === 'SUBMITTED' ? 'Submitted' : 'Under review', state, when };
  });

  if (terminal) {
    nodes.push({
      key: terminal,
      label: terminal === 'ACCEPTED' ? 'Accepted' : 'Returned for changes',
      state: 'current',
      when: submission.decidedAt,
    });
  }

  return (
    <ol className="space-y-4">
      {nodes.map((n, idx) => (
        <li key={n.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                n.state === 'done'
                  ? 'bg-accepted-bg text-accepted-text'
                  : n.state === 'current'
                  ? terminal
                    ? n.label.startsWith('Accepted')
                      ? 'bg-accepted-bg text-accepted-text'
                      : 'bg-returned-bg text-returned-text'
                    : 'bg-navy-900 text-white'
                  : 'bg-surface text-subtle'
              }`}
            >
              {n.state === 'done' ? (
                <span className="material-symbols-outlined text-[16px]">check</span>
              ) : (
                idx + 1
              )}
            </span>
            {idx < nodes.length - 1 && <span className="flex-1 w-px bg-hairline mt-1" />}
          </div>
          <div>
            <div className={`text-sm font-semibold ${n.state === 'pending' ? 'text-subtle' : 'text-body'}`}>
              {n.label}
            </div>
            {n.when && <div className="text-xs text-muted">{formatDate(n.when)}</div>}
            {terminal && n.state === 'current' && submission.reviewRound > 1 && (
              <div className="text-xs text-muted">Round {submission.reviewRound}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
