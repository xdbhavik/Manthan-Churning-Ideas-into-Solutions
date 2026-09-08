import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import Pagination from '../components/ui/Pagination';
import {
  getEvaluationQueue,
  getCycle,
  getCycleHistory,
  analyzeEvaluation,
} from '../services/evaluationService';
import type { EvaluationStatus, EvaluationCycleResponse } from '../types';

const STATUS_TABS: { label: string; value: EvaluationStatus | ''; icon: string }[] = [
  { label: 'All Cycles', value: '', icon: 'all_inbox' },
  { label: 'Received', value: 'RECEIVED', icon: 'input' },
  { label: 'Analyzing', value: 'ANALYZING', icon: 'psychology' },
  { label: 'Routing', value: 'ROUTING', icon: 'route' },
  { label: 'In Progress', value: 'EVALUATION_IN_PROGRESS', icon: 'pending_actions' },
  { label: 'Completed', value: 'EVALUATION_COMPLETED', icon: 'task_alt' },
  { label: 'Failed', value: 'ANALYSIS_FAILED', icon: 'error' },
];

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-[11px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`font-body-md text-body-md text-text-primary break-words ${mono ? 'font-mono-code text-body-sm bg-surface-muted px-1.5 py-0.5 rounded inline-block w-fit' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function EvaluationPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCycleId = searchParams.get('cycleId') || null;
  const statusFilter = (searchParams.get('status') as EvaluationStatus) || undefined;
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  const [size] = useState(20);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch Evaluation Queue (Paged)
  const {
    data: pageData,
    isLoading: queueLoading,
    error: queueError,
  } = useQuery({
    queryKey: ['evaluationQueue', currentPage, size, statusFilter],
    queryFn: () => getEvaluationQueue(currentPage, size, statusFilter),
  });

  // Fetch Selected Cycle Detail
  const { data: selectedCycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['evaluationCycle', selectedCycleId],
    queryFn: () => getCycle(selectedCycleId!),
    enabled: Boolean(selectedCycleId),
  });

  // Fetch Selected Cycle History
  const { data: cycleHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['evaluationHistory', selectedCycleId],
    queryFn: () => getCycleHistory(selectedCycleId!),
    enabled: Boolean(selectedCycleId),
  });

  // Run AI Analysis Mutation
  const analyzeMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      return analyzeEvaluation(cycleId);
    },
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('AI Matrix Analysis initiated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['evaluationQueue'] });
      if (selectedCycleId) {
        queryClient.invalidateQueries({ queryKey: ['evaluationCycle', selectedCycleId] });
        queryClient.invalidateQueries({ queryKey: ['evaluationHistory', selectedCycleId] });
      }
    },
    onError: (err: any) => {
      setActionSuccess(null);
      setActionError(err.response?.data?.message || err.message || 'AI Analysis failed');
    },
  });

  function handleStatusFilterChange(newStatus: string) {
    const params: Record<string, string> = { page: '0' };
    if (newStatus) params.status = newStatus;
    if (selectedCycleId) params.cycleId = selectedCycleId;
    setSearchParams(params);
  }

  function handlePageChange(newPage: number) {
    const params: Record<string, string> = { page: newPage.toString() };
    if (statusFilter) params.status = statusFilter;
    if (selectedCycleId) params.cycleId = selectedCycleId;
    setSearchParams(params);
  }

  function handleSelectCycle(cycle: EvaluationCycleResponse) {
    const params: Record<string, string> = {
      page: currentPage.toString(),
      cycleId: cycle.cycleId,
    };
    if (statusFilter) params.status = statusFilter;
    setSearchParams(params);
  }

  return (
    <div className="admin-page flex flex-col flex-1 h-full bg-background overflow-hidden">
      <Header
        title="AI Evaluation Pipeline"
        subtitle="Monitor evaluation cycles, inspect autonomous matrix processing, and review AI scoring analytics."
      />

      {/* Unified Filter Toolbar */}
      <div className="toolbar-sheen px-space-2xl py-space-md border-b border-border-hairline bg-surface-crisp flex flex-wrap items-center justify-between gap-space-md shadow-sm z-10">
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {STATUS_TABS.map(({ label, value, icon }) => {
            const isActive = (statusFilter || '') === value;
            return (
              <button
                key={value}
                id={`eval-tab-${value || 'all'}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleStatusFilterChange(value)}
                 className={`pressable flex items-center gap-space-xs px-space-md py-1.5 rounded-full text-label-sm font-label-md transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-ashoka-blue text-white border-ashoka-blue shadow-sm'
                    : 'bg-surface-crisp text-text-secondary border-border-hairline hover:border-border-strong hover:bg-surface-subtle'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['evaluationQueue'] })}
           className="icon-button flex items-center justify-center w-9 h-9 rounded border border-border-strong bg-surface-crisp text-text-secondary hover:text-text-primary hover:bg-surface-muted cursor-pointer transition-colors shadow-sm"
          title="Refresh Queue"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

       <div className="queue-layout flex flex-1 overflow-hidden">
        {queueLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner message="Loading evaluation cycles..." />
          </div>
        ) : queueError ? (
          <div className="flex-1 p-space-2xl">
            <ErrorAlert message={queueError instanceof Error ? queueError.message : 'Error fetching queue'} />
          </div>
        ) : pageData?.content.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-space-2xl">
            <div className="max-w-md w-full text-center flex flex-col items-center bg-surface-crisp border border-border-hairline rounded-lg p-space-2xl shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center mb-space-md text-text-muted">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">
                {statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} Cycles` : 'Evaluation Queue Empty'}
              </h3>
              <p className="font-body-md text-body-md text-text-secondary mt-space-xs leading-relaxed">
                No evaluation cycles match the active criteria. Problems must be sent to Evaluation from the Verification desk before they appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Left Queue Pane */}
             <div className="queue-pane w-[380px] border-r border-border-hairline flex flex-col bg-surface-crisp flex-shrink-0 z-0">
              <div className="px-space-lg py-space-xs bg-surface-muted/40 border-b border-border-hairline flex items-center justify-between text-body-sm text-text-muted">
                <span>Showing {pageData?.content.length || 0} of {pageData?.totalElements || 0}</span>
                <span className="font-mono-code text-[11px]">Sorted: Newest</span>
              </div>

              <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-xs">
                {pageData?.content.map((cycle) => {
                  const isSelected = selectedCycleId === cycle.cycleId;
                  return (
                    <button
                      key={cycle.cycleId}
                      onClick={() => handleSelectCycle(cycle)}
                       className={`queue-card text-left p-space-md rounded-lg border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-ashoka-blue bg-blue-50/40 shadow-xs'
                          : 'border-border-hairline bg-surface-crisp hover:border-border-strong hover:bg-surface-subtle/60'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-ashoka-blue rounded-r" />
                      )}
                      
                      <div className="flex items-center justify-between mb-space-xs">
                        <StatusBadge status={cycle.status} />
                        <span className="font-body-sm text-[11px] text-text-muted">
                          {new Date(cycle.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      <div className="font-mono-code text-[11px] text-text-secondary truncate">
                        C: {cycle.cycleId}
                      </div>
                      <div className="font-mono-code text-[11px] text-text-secondary truncate mt-0.5">
                        P: {cycle.problemId}
                      </div>

                      {/* Evaluator node info removed as evaluatorId is not in EvaluationCycleResponse */}
                    </button>
                  );
                })}
              </div>

              {pageData && pageData.totalPages > 1 && (
                <Pagination
                  page={pageData.number}
                  totalPages={pageData.totalPages}
                  totalElements={pageData.totalElements}
                  size={pageData.size}
                  onPageChange={handlePageChange}
                />
              )}
            </div>

            {/* Right Detail Pane */}
             <div className="detail-pane flex-1 overflow-y-auto p-space-2xl bg-background">
              {actionError && <ErrorAlert message={actionError} className="mb-space-lg max-w-4xl" />}
              {actionSuccess && (
                <div className="flex items-center gap-space-sm p-space-md bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg shadow-sm mb-space-lg max-w-4xl">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
                  <span className="font-body-sm text-body-sm font-medium">{actionSuccess}</span>
                </div>
              )}

              {!selectedCycleId ? (
                <div className="h-full flex items-center justify-center">
                  <div className="max-w-sm text-center flex flex-col items-center text-text-muted">
                    <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center mb-space-md">
                      <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
                    </div>
                    <p className="font-label-lg text-label-lg text-text-primary">
                      Select an Evaluation Cycle
                    </p>
                    <p className="font-body-sm text-body-sm text-text-muted mt-1 leading-relaxed">
                      Choose a cycle from the pipeline queue to inspect its status, history, and trigger AI analysis.
                    </p>
                  </div>
                </div>
              ) : cycleLoading || historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner message="Loading cycle details..." />
                </div>
              ) : selectedCycle ? (
                <div className="max-w-4xl flex flex-col gap-space-xl animate-in fade-in duration-300">
                  
                  {/* Cycle Overview Card */}
                  <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
                      <div className="flex items-center gap-space-sm">
                        <span className="material-symbols-outlined text-ashoka-blue text-[20px]">data_exploration</span>
                        <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
                          Cycle Metadata
                        </span>
                      </div>
                      <StatusBadge status={selectedCycle.status} />
                    </div>
                    
                    <div className="p-space-xl grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      <Field label="Cycle UUID" value={selectedCycle.cycleId} mono />
                      <Field label="Target Problem UUID" value={selectedCycle.problemId} mono />
                      <Field label="Version" value={`v${selectedCycle.version}`} mono />
                      <Field label="Cycle Created" value={new Date(selectedCycle.createdAt).toLocaleString('en-IN')} />
                      <Field label="Last Mutated" value={new Date(selectedCycle.updatedAt).toLocaleString('en-IN')} />
                    </div>
                  </div>

                  {/* AI Control Desk */}
                  <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
                    <div className="flex items-center gap-space-sm px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
                      <span className="material-symbols-outlined text-purple-600 text-[20px]">memory</span>
                      <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
                        AI Matrix Controller
                      </span>
                    </div>
                    <div className="p-space-xl flex flex-col sm:flex-row items-center justify-between gap-space-lg">
                      <div className="flex-1">
                        <h4 className="font-label-md text-label-md text-text-primary mb-1">Autonomous Evaluation</h4>
                        <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                          Trigger the deep-learning analysis matrix to parse problem semantics, compute complexity scoring, and route to specialized nodal agents.
                        </p>
                      </div>
                      <button
                        id="eval-analyze-btn"
                        type="button"
                        onClick={() => analyzeMutation.mutate(selectedCycle.cycleId)}
                        disabled={selectedCycle.status !== 'RECEIVED' || analyzeMutation.isPending}
                        className="h-10 px-space-xl rounded bg-purple-700 text-white hover:bg-purple-800 transition-colors font-medium flex items-center gap-space-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto shrink-0"
                      >
                        {analyzeMutation.isPending ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        )}
                        Execute AI Analysis
                      </button>
                    </div>
                    {selectedCycle.status !== 'RECEIVED' && (
                      <div className="px-space-xl pb-space-xl">
                        <div className="p-space-md rounded bg-surface-muted border border-border-hairline text-text-muted font-body-sm flex items-center gap-space-sm">
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                          Analysis can only be manually triggered when cycle is in RECEIVED status.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cycle History Ledger */}
                  {cycleHistory && (
                    <div>
                      <h4 className="font-label-lg text-label-lg text-text-primary mb-space-md px-1">Execution Trace Ledger</h4>
                      <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm p-space-md">
                        {cycleHistory.length > 0 ? (
                          <div className="relative before:absolute before:inset-0 before:ml-[19px] before:h-full before:w-0.5 before:bg-border-strong pl-10 space-y-space-md pt-2">
                            {cycleHistory.map((item) => (
                              <div key={item.historyId} className="relative">
                                {/* Dot */}
                                <div className="absolute -left-[30px] top-1 w-[11px] h-[11px] rounded-full border-2 border-surface-crisp bg-text-secondary z-10" />
                                
                                <div className="flex items-center justify-between mb-0.5">
                                  <StatusBadge status={item.toStatus} className="scale-90 origin-left" />
                                  <span className="font-mono-code text-[11px] text-text-muted">
                                    {new Date(item.changedAt).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="font-body-sm text-body-sm text-text-primary">
                                  {item.comment || 'System status transition.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-space-md text-center text-text-muted font-body-sm">
                            No history entries found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
