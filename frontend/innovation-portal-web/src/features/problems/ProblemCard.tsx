import { Link } from 'react-router-dom';
import type { PublishedProblem } from '../../types/dto';
import {
  SOURCE_BUCKET_LABEL,
  URGENCY_LABEL,
  formatDate,
  shortId,
} from '../../models/labels';

export function ProblemCard({ problem }: { problem: PublishedProblem }) {
  return (
    <Link
      to={`/problems/${problem.problemId}`}
      className="card-hover bg-card rounded-xl border border-hairline p-5 flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {problem.sourceBucket && (
            <span className="inline-flex items-center rounded-full bg-navy-900/5 text-navy-900 text-[11px] font-bold px-2 py-0.5">
              {SOURCE_BUCKET_LABEL[problem.sourceBucket]}
            </span>
          )}
          {problem.urgency && (
            <span
              className={`inline-flex items-center rounded-full text-[11px] font-bold px-2 py-0.5 ${
                problem.urgency === 'IMMEDIATE'
                  ? 'bg-returned-bg text-returned-text'
                  : 'bg-review-bg text-review-text'
              }`}
            >
              {URGENCY_LABEL[problem.urgency]}
            </span>
          )}
        </div>
        {problem.accessRule === 'OPEN_TO_ALL' && (
          <span className="inline-flex items-center rounded-full bg-accepted-bg text-accepted-text text-[11px] font-semibold px-2 py-0.5">
            Open
          </span>
        )}
      </div>

      <div>
        <h3 className="font-headline font-semibold text-body group-hover:text-navy-900 leading-snug">
          {problem.title}
        </h3>
        <div className="font-code text-[11px] text-subtle mt-1">ID {shortId(problem.problemId)}</div>
      </div>

      {problem.expectedOutcome && (
        <p className="text-sm text-muted line-clamp-2">{problem.expectedOutcome}</p>
      )}

      {problem.domains?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {problem.domains.slice(0, 3).map((d) => (
            <span key={d} className="rounded bg-surface text-muted text-[11px] px-2 py-0.5">
              {d}
            </span>
          ))}
          {problem.domains.length > 3 && (
            <span className="rounded bg-surface text-muted text-[11px] px-2 py-0.5">
              +{problem.domains.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-subtle">
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">attach_file</span>
          {problem.evidenceCount} files
        </span>
        <span>{formatDate(problem.publishedAt)}</span>
      </div>
    </Link>
  );
}
