import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useProblems } from '../../hooks/usePortalQueries';
import type { AccessRule, Severity, SourceBucket, Urgency } from '../../types/dto';
import { formatLocation } from '../../lib/formatters';

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

const SOURCE_BUCKET_LABEL: Record<SourceBucket, string> = {
  GOVT: 'Central Ministry',
  CITIZEN: 'Citizen',
  INDUSTRY: 'Industry Partner',
  COMMUNITY: 'Community',
  HEI: 'Higher Education Institute',
};

const URGENCY_LABEL: Record<Urgency, string> = {
  IMMEDIATE: 'Urgent',
  SHORT_TERM: 'High Priority',
  LONG_TERM: 'Normal',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical Impact',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const ACCESS_RULE_LABEL: Record<AccessRule, string> = {
  OPEN_TO_ALL: 'Open to All',
  UNIVERSITY_ONLY: 'University Only',
  SELECTED_UNIVERSITIES: 'Selected Universities',
};

function ProblemCard({ problem }: { problem: any }) {
  const urgencyColors: Record<Urgency, { bg: string; text: string; border: string; pulse: boolean }> = {
    IMMEDIATE: { bg: 'state-returned-bg', text: 'state-returned-text', border: 'state-returned-border', pulse: true },
    SHORT_TERM: { bg: 'state-review-bg', text: 'state-review-text', border: 'state-review-border', pulse: false },
    LONG_TERM: { bg: 'state-draft-bg', text: 'state-draft-text', border: 'state-draft-border', pulse: false },
  };

  const urgency = urgencyColors[problem.urgency as Urgency] || urgencyColors.LONG_TERM;

  return (
    <article className="problem-card group bg-surface-card rounded-xl border border-border-subtle hover:border-secondary-container hover:shadow-level-2 transition-all duration-200 flex flex-col justify-between overflow-hidden relative">
      <div className="p-space-lg flex flex-col flex-grow">
        <div className="flex items-center justify-between gap-2 mb-space-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm text-on-surface-variant border border-border-subtle">
            <span className="material-symbols-outlined text-xs text-primary">account_balance</span>
            {problem.sourceBucket ? SOURCE_BUCKET_LABEL[problem.sourceBucket as SourceBucket] : 'Unknown Source'}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${urgency.bg} ${urgency.text} font-label-mono-sm text-label-mono-sm border ${urgency.border} ${urgency.pulse ? 'animate-pulse-ring' : ''}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(--color-${urgency.text.replace('-text', '')})` }}></span>
            {URGENCY_LABEL[problem.urgency as Urgency] || 'Normal'}
          </span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-2 mb-space-xs font-semibold">
          {problem.title}
        </h3>
        <div className="flex items-center gap-2 mb-space-sm font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
          <span>PROBLEM</span>
          <span>•</span>
          <span>Stage II Complete</span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mb-space-md flex-grow">
          {problem.description || 'No description available.'}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-space-md">
          {(problem.domains ?? []).map((d: string) => (
            <span key={d} className="px-2 py-0.5 rounded bg-surface-canvas text-on-surface-variant font-label-mono-sm text-label-mono-sm border border-border-subtle">
              {d}
            </span>
          ))}
          {(problem.domains ?? []).length === 0 && <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">No domains</span>}
        </div>
        <div className="pt-space-sm border-t border-border-subtle grid grid-cols-3 gap-2 text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm mb-space-md">
          <div className="flex items-center gap-1 truncate" title={`Location: ${formatLocation(problem.location)}`}>
            <span className="material-symbols-outlined text-sm text-secondary">location_on</span>
            <span className="truncate">{formatLocation(problem.location)}</span>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold text-label-mono-sm">
              {SEVERITY_LABEL[problem.severity as Severity] || 'Medium'}
            </span>
          </div>
          <div className="flex items-center gap-1 justify-end truncate" title="Evidence count">
            <span className="material-symbols-outlined text-sm text-on-surface-variant-weak">attach_file</span>
            <span>{problem.evidenceCount || 0} items</span>
          </div>
        </div>
      </div>

      {(problem.velocityIndex != null || problem.prizePool != null) && (
        <div className="px-space-lg py-space-md bg-surface-container/30 border-t border-border-subtle flex flex-col gap-3">
          {problem.accessRule === 'OPEN_TO_ALL' && problem.velocityIndex != null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">trending_up</span>
                <span className="font-label-mono-sm text-[11px] text-on-surface-variant font-bold tracking-widest uppercase">
                  Velocity Index: {problem.velocityIndex}%
                </span>
              </div>
              
              {problem.velocityHistory && problem.velocityHistory.length > 0 && (
                <div className="h-3 w-16">
                  <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full stroke-primary fill-none stroke-[2.5px] overflow-visible">
                    <polyline points={problem.velocityHistory.map((v: number, i: number, arr: number[]) => `${(i / Math.max(1, arr.length - 1)) * 100},${20 - (v / 100) * 20}`).join(' ')} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="100" cy={20 - ((problem.velocityHistory[problem.velocityHistory.length - 1] || 0) / 100) * 20} r="2.5" className="fill-primary stroke-none" />
                  </svg>
                </div>
              )}
              
              {problem.teamsActive != null && (
                <span className="font-label-mono-sm text-[11px] text-on-surface font-bold tracking-widest uppercase">
                  {problem.teamsActive} Teams Active
                </span>
              )}
            </div>
          )}
          
          {problem.prizePool != null && problem.prizePool > 0 && (
            <div className="font-label-mono-sm text-[11px] text-on-surface-variant font-bold tracking-widest uppercase">
              Prize Pool: ₹{problem.prizePool.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      )}

      <div className="px-space-lg py-space-sm bg-surface-container-low/60 border-t border-border-subtle flex items-center justify-between">
        <span className="font-body-sm text-body-sm text-on-surface-variant-weak flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">schedule</span>
          Published {new Date(problem.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <Link
          to={`/app/problems/${problem.problemId}`}
          className="h-9 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-body-sm inline-flex items-center gap-1 transition-all shadow-sm"
        >
          <span>View Problem</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}

export default function AppProblemExplorerPage() {
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

  return (
    <div className="max-w-[1600px] mx-auto px-space-md lg:px-space-xl py-space-lg w-full">
      <section className="relative w-full overflow-hidden bg-surface-card border-b border-border-subtle">
        <div className="absolute inset-0 bg-[radial-gradient(#1E40AF_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none"></div>
        <div className="relative max-w-7xl mx-auto px-space-lg pt-space-xl pb-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-state-submitted-bg text-state-submitted-text font-label-mono-sm text-label-mono-sm border border-state-submitted-border">
                <span className="w-1.5 h-1.5 rounded-full bg-state-submitted-text animate-pulse"></span>
                PROBLEM REPOSITORY
              </span>
              <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm hidden sm:inline-block">/</span>
              <span className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm hidden sm:inline-block">VERIFIED STAGE II</span>
            </div>
            <div className="flex items-center gap-space-sm text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-state-accepted-text">verified</span>
                EVALUATED
              </span>
            </div>
          </div>
          <div className="max-w-3xl mb-space-lg">
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mb-space-sm">
              Explore Problems
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Find a challenge and build a solution that matters. All published problem statements have been fully evaluated, benchmarked by national panels, and opened for solution submissions.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md pt-space-sm border-t border-border-subtle">
            <div className="flex flex-col">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Active Challenges</span>
              <span className="font-headline-lg text-headline-lg text-primary font-semibold">{(data ?? []).length}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Critical Severity</span>
              <span className="font-headline-lg text-headline-lg text-error font-semibold">
                {(data ?? []).filter(p => p.severity === 'CRITICAL').length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Participating Ministries</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                {new Set((data ?? []).map(p => p.sourceBucket)).size}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak uppercase">Aggregated Grant Pool</span>
              <span className="font-headline-lg text-headline-lg text-state-accepted-text font-semibold">₹4.8 Cr</span>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full bg-surface-canvas border-b border-border-subtle shadow-level-1 z-30">
        <div className="max-w-7xl mx-auto px-space-lg py-space-md flex flex-col gap-space-md">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant-weak">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              ref={searchRef}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search problems by title, keywords, domains, or location... (⌘K)"
              className="w-full h-12 pl-11 pr-28 rounded-lg bg-surface-card border border-border-subtle text-on-surface placeholder:text-on-surface-variant-weak font-body-md text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all shadow-level-1"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-label-mono-sm text-on-surface-variant-weak bg-surface-canvas border border-border-subtle rounded">⌘K</kbd>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={filters.bucket}
                  onChange={(e) => setFilters((f) => ({ ...f, bucket: e.target.value as Filters['bucket'] }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-body-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="ALL">Domain: All Domains</option>
                  {Object.keys(SOURCE_BUCKET_LABEL).map((k) => (
                    <option key={k} value={k}>{SOURCE_BUCKET_LABEL[k as SourceBucket]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">expand_more</span>
              </div>
              <div className="relative">
                <select
                  value={filters.urgency}
                  onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value as Filters['urgency'] }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-body-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="ALL">Urgency: All</option>
                  {Object.keys(URGENCY_LABEL).map((k) => (
                    <option key={k} value={k}>{URGENCY_LABEL[k as Urgency]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">expand_more</span>
              </div>
              <div className="relative">
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as Filters['severity'] }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-body-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="ALL">Severity: All</option>
                  {Object.keys(SEVERITY_LABEL).map((k) => (
                    <option key={k} value={k}>{SEVERITY_LABEL[k as Severity]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">expand_more</span>
              </div>
              <div className="relative">
                <select
                  value={filters.access}
                  onChange={(e) => setFilters((f) => ({ ...f, access: e.target.value as Filters['access'] }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-body-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="ALL">Access: Open to All</option>
                  {Object.keys(ACCESS_RULE_LABEL).map((k) => (
                    <option key={k} value={k}>{ACCESS_RULE_LABEL[k as AccessRule]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">expand_more</span>
              </div>
              <div className="relative">
                <select
                  value={filters.domain}
                  onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-body-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="ALL">Location: All Regions</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">expand_more</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak hidden md:inline">SORT BY:</span>
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
                  className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-card border border-border-subtle text-on-surface font-headline-sm text-body-sm hover:border-outline-variant focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-level-1"
                >
                  <option value="newest">Newest Published</option>
                  <option value="title">Title A–Z</option>
                  <option value="urgency">Most Urgent</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2.5 text-on-surface-variant-weak text-base">sort</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak mr-1">ACTIVE FILTERS:</span>
              {activeFilterCount === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-mono-sm text-label-mono-sm border border-border-subtle">
                  All Evaluated
                </span>
              )}
              {filters.bucket && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  {SOURCE_BUCKET_LABEL[filters.bucket as SourceBucket]}
                </span>
              )}
              {filters.urgency && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  {URGENCY_LABEL[filters.urgency as Urgency]}
                </span>
              )}
              {filters.severity && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  {SEVERITY_LABEL[filters.severity as Severity]}
                </span>
              )}
              {filters.access && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  {ACCESS_RULE_LABEL[filters.access as AccessRule]}
                </span>
              )}
              {filters.domain && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  {filters.domain}
                </span>
              )}
              {filters.q && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono-sm text-label-mono-sm">
                  Search: "{filters.q}"
                </span>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="font-label-mono-sm text-label-mono-sm text-primary hover:underline ml-2 transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="text-on-surface-variant-weak font-label-mono-sm text-label-mono-sm flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-state-accepted-text"></span>
              <span>Showing <strong className="text-on-surface font-semibold" id="problemCounter">{pageItems.length}</strong> of <strong className="text-on-surface font-semibold">{(data ?? []).length}</strong> Published Problems</span>
            </div>
          </div>
        </div>
      </section>
      <main className="max-w-[1600px] mx-auto px-space-lg py-space-xl w-full">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-state-returned-bg border border-state-returned-border rounded-xl p-8 text-center">
            <div className="material-symbols-outlined text-state-returned-text text-3xl">error</div>
            <p className="mt-2 font-semibold text-state-returned-text">Failed to load the problem catalog.</p>
            <p className="text-sm text-on-surface-variant-weak mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle inline-flex items-center justify-center shadow-level-1">
              <span className="material-symbols-outlined text-primary text-3xl">filter_alt_off</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-4">No matching verified problems found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mt-1">
              We couldn't find any published challenges matching your current search criteria. Try modifying your filter combinations or clearing search terms.
            </p>
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold"
            >
              Reset All Search Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg items-stretch" id="problemsGrid">
              {pageItems.map((p) => (
                <ProblemCard key={p.problemId} problem={p} />
              ))}
            </div>
            {pageCount > 1 && (
              <div className="mt-space-xl pt-space-lg border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-space-md">
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Showing records <span className="font-semibold text-on-surface">{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-on-surface">{filtered.length}</span> verified submissions
                </div>
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-subtle bg-surface-card text-on-surface-variant-weak hover:bg-surface-canvas hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg font-label-mono-sm text-label-mono-sm ${
                        i === currentPage
                          ? 'bg-primary text-on-primary font-semibold shadow-sm'
                          : 'border border-border-subtle bg-surface-card text-on-surface hover:bg-surface-canvas'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={currentPage === pageCount - 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-subtle bg-surface-card text-on-surface-variant-weak hover:bg-surface-canvas hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </nav>
              </div>
            )}
            <div className="mt-space-xl p-space-lg rounded-xl bg-surface-card border border-border-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg shadow-level-1">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-secondary-fixed text-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">help_center</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-0.5">Need help scoping your architecture before submission?</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Review the official Evaluation Rubric and benchmark requirements across edge constraints, memory bounds, and regional data privacy.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
