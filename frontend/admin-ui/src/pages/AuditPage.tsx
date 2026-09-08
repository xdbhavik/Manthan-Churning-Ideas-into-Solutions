import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getAuditLog } from '../services/auditService';
import type { AuditLog, AuditAction } from '../types';

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProblemId = searchParams.get('problemId') || '';

  const [inputProblemId, setInputProblemId] = useState(queryProblemId);
  const [activeProblemId, setActiveProblemId] = useState(queryProblemId);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const {
    data: auditLogs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auditLog', activeProblemId],
    queryFn: () => getAuditLog(activeProblemId),
    enabled: Boolean(activeProblemId),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (inputProblemId.trim()) {
      setActiveProblemId(inputProblemId.trim());
      setSearchParams({ problemId: inputProblemId.trim() });
      setExpandedLogId(null);
    }
  }

  function getActionCategoryStyle(action: AuditAction): { icon: string; bg: string; text: string; border: string; line: string } {
    if (action.startsWith('SOURCE_VERIFICATION')) {
      return { icon: 'how_to_reg', bg: 'bg-ashoka-blue/10', text: 'text-ashoka-blue', border: 'border-ashoka-blue/30', line: 'bg-ashoka-blue' };
    }
    if (action.startsWith('EVALUATION')) {
      return { icon: 'psychology', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', line: 'bg-emerald-500' };
    }
    if (['REJECTED', 'ARCHIVED', 'WITHDRAWN'].includes(action)) {
      return { icon: 'gavel', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', line: 'bg-red-500' };
    }
    if (['CREATED', 'UPDATED', 'STATUS_CHANGED', 'EVIDENCE_ADDED'].includes(action)) {
      return { icon: 'description', bg: 'bg-surface-container', text: 'text-text-primary', border: 'border-border-strong', line: 'bg-text-secondary' };
    }
    return { icon: 'history', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', line: 'bg-amber-500' };
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      <Header
        title="Immutable Audit Ledger"
        subtitle="Forensic, append-only timeline of all operations, status changes, and evaluations performed on a problem."
      />

      <main className="flex-1 p-space-2xl overflow-y-auto">
        <div className="max-w-4xl mx-auto flex flex-col gap-space-xl">
          
          {/* Immutable Notice Banner */}
          <div className="flex items-start gap-space-sm p-space-md bg-slate-900 border border-slate-700 rounded-lg text-slate-200 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-[24px] mt-0.5">lock</span>
            <div>
              <p className="font-label-md text-label-md uppercase tracking-widest text-slate-300 font-bold">
                Cryptographic Ledger
              </p>
              <p className="font-body-sm text-body-sm mt-1 text-slate-400">
                Audit records displayed here are append-only. They cannot be altered, overwritten, or deleted by any administrative role, ensuring full non-repudiation.
              </p>
            </div>
          </div>

          {/* Problem ID Search Console */}
          <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm p-space-xl flex flex-col gap-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-text-primary">
                Retrieve Audit Trail
              </h2>
            </div>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
              <div className="flex-1 w-full relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
                  search
                </span>
                <input
                  id="audit-problem-id-input"
                  type="text"
                  value={inputProblemId}
                  onChange={(e) => setInputProblemId(e.target.value)}
                  placeholder="Enter Problem UUID (e.g. 550e8400-e29b-41d4...)"
                  className="w-full h-10 pl-10 pr-space-md rounded border border-border-strong bg-surface-crisp font-mono-code text-body-md text-text-primary placeholder:text-outline-variant focus:outline-none focus:border-ashoka-blue"
                />
              </div>
              <button
                id="audit-search-btn"
                type="submit"
                disabled={isLoading || !inputProblemId.trim()}
                className="w-full sm:w-auto h-10 px-space-xl rounded bg-ashoka-blue text-white hover:bg-institutional-navy transition-colors cursor-pointer font-medium disabled:opacity-50 flex items-center justify-center gap-space-sm shadow-sm"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                )}
                Fetch Ledger
              </button>
            </form>
          </div>

          {error && <ErrorAlert message="Failed to fetch audit log." />}

          {/* Empty State */}
          {!activeProblemId && !isLoading && !auditLogs && (
            <div className="mt-space-xl flex flex-col items-center justify-center text-text-muted">
              <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-space-md border border-border-hairline">
                <span className="material-symbols-outlined text-[32px]">history</span>
              </div>
              <p className="font-label-lg text-label-lg text-text-primary">
                No Record Specified
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1 text-center max-w-sm">
                Enter a Problem UUID above to extract its complete historical event sequence.
              </p>
            </div>
          )}

          {/* Timeline */}
          {auditLogs && auditLogs.length > 0 && (
            <div className="mt-space-md relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border-strong">
              {auditLogs.map((log: AuditLog) => {
                const isExpanded = expandedLogId === log.logId;
                const style = getActionCategoryStyle(log.actionType);
                
                return (
                  <div key={log.logId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-space-lg">
                    {/* Icon Marker */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background ${style.bg} ${style.text} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10`}>
                      <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                    </div>

                    {/* Content Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-surface-crisp border border-border-hairline rounded-lg shadow-sm p-space-md">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className={`font-label-sm text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${style.bg} ${style.text} ${style.border} border`}>
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono-code text-[11px] text-text-muted">
                          {new Date(log.performedAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      <p className="font-body-sm text-body-sm text-text-primary mt-space-sm mb-space-xs leading-relaxed">
                        System executed {log.actionType.replace(/_/g, ' ').toLowerCase()} operation.
                      </p>

                      <div className="mt-space-sm pt-space-xs border-t border-border-hairline/60 flex items-center justify-between">
                        <div className="flex items-center gap-space-2xs text-[11px] text-text-muted">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          <span className="font-mono-code truncate max-w-[120px] sm:max-w-[160px]">{log.performedByUserId || 'SYSTEM'}</span>
                        </div>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.logId)}
                          className="font-label-sm text-[11px] text-ashoka-blue hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                          <span className="material-symbols-outlined text-[14px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </div>

                      {/* Collapsible Payload */}
                      {isExpanded && (
                        <div className="mt-space-sm animate-in slide-in-from-top-2 duration-200">
                          <p className="font-label-sm text-[10px] text-text-muted uppercase tracking-wider mb-1">State Snapshot</p>
                          <pre className="font-mono-code text-[10px] text-text-secondary bg-surface-subtle p-space-sm rounded border border-border-hairline overflow-x-auto max-h-48">
                            {JSON.stringify(log.afterState, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {auditLogs && auditLogs.length === 0 && (
            <div className="p-space-lg bg-surface-crisp border border-border-hairline rounded-lg text-center text-text-muted shadow-sm">
              No audit records found for this Problem UUID.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
