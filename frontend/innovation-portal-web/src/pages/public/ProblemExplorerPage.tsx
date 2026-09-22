import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { SignInPrompt } from '../../components/feedback/SignInPrompt';
import { useProblems } from '../../hooks/usePortalQueries';
import { ProblemCard } from '../../features/problems/ProblemCard';
import {
  ACCESS_RULE_LABEL,
  SEVERITY_LABEL,
  SOURCE_BUCKET_LABEL,
  URGENCY_LABEL,
} from '../../models/labels';
import type { AccessRule, Severity, SourceBucket, Urgency } from '../../types/dto';

const PAGE_SIZE = 9;

type SortKey = 'newest' | 'title' | 'urgency';
const URGENCY_ORDER: Record<Urgency, number> = { IMMEDIATE: 0, SHORT_TERM: 1, LONG_TERM: 2 };

interface Filters {
  q: string;
  bucket: '' | SourceBucket;
  urgency: '' | Urgency;
  severity: '' | Severity;
  access: '' | AccessRule;
  domain: string;
  sort: SortKey;
}

const EMPTY_FILTERS: Filters = {
  q: '',
  bucket: '',
  urgency: '',
  severity: '',
  access: '',
  domain: '',
  sort: 'newest',
};

export default function ProblemExplorerPage() {
  const { authed } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProblems(authed);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const domains = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((p) => p.domains?.forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let list = (data ?? []).filter((p) => {
      if (filters.bucket && p.sourceBucket !== filters.bucket) return false;
      if (filters.urgency && p.urgency !== filters.urgency) return false;
      if (filters.severity && p.severity !== filters.severity) return false;
      if (filters.access && p.accessRule !== filters.access) return false;
      if (filters.domain && !p.domains?.includes(filters.domain)) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = `${p.title} ${p.description ?? ''} ${p.location ?? ''} ${p.expectedOutcome ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list];
    switch (filters.sort) {
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'urgency':
        list.sort((a, b) => (URGENCY_ORDER[a.urgency ?? 'LONG_TERM'] ?? 9) - (URGENCY_ORDER[b.urgency ?? 'LONG_TERM'] ?? 9));
        break;
      default:
        list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    return list;
  }, [data, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const activeFilterCount =
    Number(!!filters.bucket) +
    Number(!!filters.urgency) +
    Number(!!filters.severity) +
    Number(!!filters.access) +
    Number(!!filters.domain) +
    Number(!!filters.q);

  useEffect(() => {
    setPage(0);
  }, [filters.q, filters.bucket, filters.urgency, filters.severity, filters.access, filters.domain]);

  if (!authed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SignInPrompt
          title="Sign in to browse problems"
          message="The problem catalog is available to verified participants. Sign in to explore."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Banner */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accepted-bg text-accepted-text text-xs font-bold px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accepted-text animate-pulse" /> Live catalog
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-navy-900 mt-3">Problem Explorer</h1>
        <p className="text-muted mt-1">Search and filter published national problem statements.</p>
      </div>

      {/* Toolbar */}
      <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur rounded-xl border border-hairline p-3 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-subtle text-[18px]">search</span>
            <input
              ref={searchRef}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search problems… (⌘K)"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-card border border-hairline text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex rounded border border-hairline bg-card px-1.5 py-0.5 text-[10px] font-code text-muted">
              ⌘K
            </kbd>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filters.bucket}
              onChange={(e) => setFilters((f) => ({ ...f, bucket: e.target.value as Filters['bucket'] }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="">Source</option>
              {Object.keys(SOURCE_BUCKET_LABEL).map((k) => (
                <option key={k} value={k}>{SOURCE_BUCKET_LABEL[k as SourceBucket]}</option>
              ))}
            </select>
            <select
              value={filters.urgency}
              onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value as Filters['urgency'] }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="">Urgency</option>
              {Object.keys(URGENCY_LABEL).map((k) => (
                <option key={k} value={k}>{URGENCY_LABEL[k as Urgency]}</option>
              ))}
            </select>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as Filters['severity'] }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="">Severity</option>
              {Object.keys(SEVERITY_LABEL).map((k) => (
                <option key={k} value={k}>{SEVERITY_LABEL[k as Severity]}</option>
              ))}
            </select>
            <select
              value={filters.access}
              onChange={(e) => setFilters((f) => ({ ...f, access: e.target.value as Filters['access'] }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="">Access</option>
              {Object.keys(ACCESS_RULE_LABEL).map((k) => (
                <option key={k} value={k}>{ACCESS_RULE_LABEL[k as AccessRule]}</option>
              ))}
            </select>
            <select
              value={filters.domain}
              onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="">Domain</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
              className="px-3 py-2 rounded-lg bg-card border border-hairline text-sm"
            >
              <option value="newest">Newest</option>
              <option value="title">Title A–Z</option>
              <option value="urgency">Urgency</option>
            </select>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>
            {isLoading ? 'Loading…' : `${filtered.length} of ${(data ?? []).length} problems`}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 text-navy-700 hover:text-navy-900 font-semibold"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-returned-bg border border-returned-border rounded-xl p-8 text-center">
          <div className="material-symbols-outlined text-returned-text text-3xl">error</div>
          <p className="mt-2 font-semibold text-returned-text">Failed to load the problem catalog.</p>
          <p className="text-sm text-muted mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-bold"
          >
            Retry
          </button>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="py-20 text-center">
          <div className="animate-float w-16 h-16 rounded-2xl bg-card border border-hairline inline-flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-navy-900 text-3xl">inventory_2</span>
          </div>
          <h3 className="font-headline font-semibold text-navy-900 mt-4">No problems match</h3>
          <p className="text-muted text-sm mt-1">Try adjusting your search or clearing filters.</p>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-4 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-bold"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageItems.map((p) => (
              <ProblemCard key={p.problemId} problem={p} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-lg border border-hairline text-sm font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold ${
                    i === currentPage ? 'bg-navy-900 text-white' : 'border border-hairline text-body'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage === pageCount - 1}
                className="px-3 py-1.5 rounded-lg border border-hairline text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
