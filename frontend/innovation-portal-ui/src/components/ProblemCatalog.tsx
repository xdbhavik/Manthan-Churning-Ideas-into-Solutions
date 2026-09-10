import React, { useState, useMemo } from 'react';
import { PublishedProblem } from '../types';

interface ProblemCatalogProps {
  problems: PublishedProblem[];
  onSelectProblem: (problem: PublishedProblem) => void;
}

const BUCKET_LABEL: Record<string, string> = {
  GOVT: 'GOVT',
  CITIZEN: 'CITIZEN',
  INDUSTRY: 'INDUSTRY',
  COMMUNITY: 'COMMUNITY',
  HEI: 'HEI',
};

function shortId(id: string): string {
  return id.length > 13 ? id.slice(0, 13).toUpperCase() : id.toUpperCase();
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const ProblemCatalog: React.FC<ProblemCatalogProps> = ({ problems, onSelectProblem }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccessRule, setSelectedAccessRule] = useState<string>('ALL');
  const [selectedSourceBucket, setSelectedSourceBucket] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [quickPreviewProblem, setQuickPreviewProblem] = useState<PublishedProblem | null>(null);

  const allDomains = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => p.domains.forEach((d) => set.add(d)));
    return Array.from(set);
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((prob) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = prob.title.toLowerCase().includes(q);
        const matchesCode = shortId(prob.problemId).toLowerCase().includes(q);
        const matchesDesc = (prob.description || '').toLowerCase().includes(q);
        const matchesDomains = prob.domains.some((d) => d.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCode && !matchesDesc && !matchesDomains) return false;
      }
      if (selectedAccessRule !== 'ALL' && prob.accessRule !== selectedAccessRule) return false;
      if (selectedSourceBucket !== 'ALL' && prob.sourceBucket !== selectedSourceBucket) return false;
      if (selectedUrgency !== 'ALL' && prob.urgency !== selectedUrgency) return false;
      if (selectedSeverity !== 'ALL' && prob.severity !== selectedSeverity) return false;
      if (selectedDomain !== 'ALL' && !prob.domains.includes(selectedDomain)) return false;
      return true;
    });
  }, [problems, searchQuery, selectedAccessRule, selectedSourceBucket, selectedUrgency, selectedSeverity, selectedDomain]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedAccessRule('ALL');
    setSelectedSourceBucket('ALL');
    setSelectedUrgency('ALL');
    setSelectedSeverity('ALL');
    setSelectedDomain('ALL');
  };

  const openToAll = problems.filter((p) => p.accessRule === 'OPEN_TO_ALL').length;
  const uniOnly = problems.filter((p) => p.accessRule === 'UNIVERSITY_ONLY').length;
  const selectedUni = problems.filter((p) => p.accessRule === 'SELECTED_UNIVERSITIES').length;

  const handleDownloadDigest = () => {
    const content =
      `SIH26043 - Published Problem Catalog Digest\nGenerated: ${new Date().toLocaleString()}\nTotal Published: ${problems.length}\n\n` +
      problems
        .map(
          (p) =>
            `[${shortId(p.problemId)}] ${p.title}\nSource: ${p.sourceBucket} | Access: ${p.accessRule} | Urgency: ${p.urgency} | Severity: ${p.severity}\nDeliverable: ${p.expectedOutcome || '—'}\n\n`
        )
        .join('----------------------------------------\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIH26043_Catalog_Digest.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full pb-12">
      <nav className="flex items-center gap-1.5 text-[#74777f] mb-3 text-[11px] uppercase tracking-wider font-semibold">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">home</span>
          <span>Portal</span>
        </span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#00152f] font-bold">Published Catalog</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col max-w-3xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#00152f] font-mono text-[11px] font-bold tracking-wide">
              CYCLE SIH26043
            </span>
          </div>
          <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">
            Published Problem Statements
          </h1>
          <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
            Evaluated challenges auto-published to the portal on EVALUATION_COMPLETED. Visibility is
            filtered server-side per your participant access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadDigest}
            className="px-3.5 py-2 rounded-lg bg-[#0f2a4a] hover:bg-[#00152f] text-white font-semibold text-[13px] flex items-center gap-1.5 transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Catalog Digest</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">Total Published</span>
              <span className="font-headline text-[32px] font-bold text-[#0b1c30] tracking-tight mt-1">{problems.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00152f]">
              <span className="material-symbols-outlined text-[24px]">dataset</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#43474e]">
            <span className="text-[#795900] font-bold">Visible to you</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">Open to All</span>
              <span className="font-headline text-[32px] font-bold text-[#0b1c30] tracking-tight mt-1">{openToAll}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#00152f]">
              <span className="material-symbols-outlined text-[24px]">public</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#43474e]">
            <span className="text-[#00152f] font-semibold">Student teams</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">University Reserved</span>
              <span className="font-headline text-[32px] font-bold text-[#0b1c30] tracking-tight mt-1">{uniOnly}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#ffdfa0]/40 flex items-center justify-center text-[#795900]">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#43474e]">
            <span className="text-[#795900] font-bold">HEI Nodal Lead</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">Selected Institutions</span>
              <span className="font-headline text-[32px] font-bold text-[#0b1c30] tracking-tight mt-1">{selectedUni}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#cce5ff] flex items-center justify-center text-[#002c47]">
              <span className="material-symbols-outlined text-[24px]">shield_person</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#43474e]">
            <span className="text-[#00152f] font-bold">Whitelist</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e2e8f0] mb-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#74777f] text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[13px] placeholder:text-[#74777f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0f2a4a] transition-all"
              placeholder="Search by title, id, domain, or description…"
              type="text"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <div className="flex items-center bg-[#eff4ff] p-1 rounded-lg border border-[#dce9ff]">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-[12px] font-semibold flex items-center gap-1 transition-all ${viewMode === 'grid' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#74777f] hover:text-[#0b1c30]'}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded text-[12px] font-semibold flex items-center gap-1 transition-all ${viewMode === 'table' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#74777f] hover:text-[#0b1c30]'}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          <select value={selectedAccessRule} onChange={(e) => setSelectedAccessRule(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Access Rules</option>
            <option value="OPEN_TO_ALL">OPEN_TO_ALL</option>
            <option value="UNIVERSITY_ONLY">UNIVERSITY_ONLY</option>
            <option value="SELECTED_UNIVERSITIES">SELECTED_UNIVERSITIES</option>
          </select>
          <select value={selectedSourceBucket} onChange={(e) => setSelectedSourceBucket(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Sources</option>
            <option value="GOVT">GOVT</option>
            <option value="CITIZEN">CITIZEN</option>
            <option value="INDUSTRY">INDUSTRY</option>
            <option value="COMMUNITY">COMMUNITY</option>
            <option value="HEI">HEI</option>
          </select>
          <select value={selectedUrgency} onChange={(e) => setSelectedUrgency(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Urgency</option>
            <option value="IMMEDIATE">IMMEDIATE</option>
            <option value="SHORT_TERM">SHORT_TERM</option>
            <option value="LONG_TERM">LONG_TERM</option>
          </select>
          <select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Severity</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#74777f] uppercase mr-1">Filtered by:</span>
            <button onClick={resetFilters} className="text-[#795900] hover:underline text-[11px] ml-1 font-bold" type="button">Reset Filters</button>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-[#43474e]">
            Showing <strong className="text-[#0b1c30] font-bold">{filteredProblems.length}</strong> of {problems.length} problems
          </div>
        </div>
      </div>

      {/* Catalog content */}
      {filteredProblems.length === 0 ? (
        <div className="w-full bg-white rounded-xl p-12 shadow-xs border border-[#e2e8f0] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#74777f] mb-4">
            <span className="material-symbols-outlined text-[36px]">folder_off</span>
          </div>
          <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">No Published Statements</h3>
          <p className="text-[13px] text-[#43474e] max-w-lg mt-1 mb-5 leading-relaxed">
            {problems.length === 0
              ? 'Problems are auto-published to this portal once their evaluation cycle reaches EVALUATION_COMPLETED. Check back after a cycle completes.'
              : 'No problems match your current filters. Adjust the filters or reset them to see everything available to you.'}
          </p>
          {problems.length > 0 && (
            <button onClick={resetFilters} className="px-4 py-2 rounded-lg bg-[#00152f] text-white font-semibold text-[13px]" type="button">
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProblems.map((prob) => (
            <article key={prob.problemId} className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#00152f] text-white font-bold">{shortId(prob.problemId)}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#e5eeff] text-[#0b1c30] font-semibold">
                      {BUCKET_LABEL[prob.sourceBucket ?? ''] || prob.sourceBucket}
                    </span>
                    {prob.urgency && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${prob.urgency === 'IMMEDIATE' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#ffdfa0] text-[#5c4300]'}`}>
                        {prob.urgency}
                      </span>
                    )}
                    {prob.severity && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${prob.severity === 'CRITICAL' ? 'bg-[#ba1a1a] text-white' : prob.severity === 'HIGH' ? 'bg-[#ffc641] text-[#715300]' : 'bg-[#e5eeff] text-[#0b1c30]'}`}>
                        {prob.severity}
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${prob.accessRule === 'OPEN_TO_ALL' ? 'bg-[#dce9ff] text-[#00152f]' : prob.accessRule === 'UNIVERSITY_ONLY' ? 'bg-[#ffdfa0] text-[#5c4300]' : 'bg-[#cce5ff] text-[#001d31]'}`}>
                    <span className="material-symbols-outlined text-[13px]">
                      {prob.accessRule === 'OPEN_TO_ALL' ? 'public' : prob.accessRule === 'UNIVERSITY_ONLY' ? 'account_balance' : 'shield'}
                    </span>
                    {prob.accessRule}
                  </span>
                </div>

                <h2 onClick={() => onSelectProblem(prob)} className="font-headline text-[17px] text-[#0b1c30] font-bold tracking-tight group-hover:text-[#00152f] transition-colors cursor-pointer hover:underline">
                  {prob.title}
                </h2>

                <p className="text-[13px] text-[#43474e] mt-2 line-clamp-3 leading-relaxed">{prob.description}</p>

                {prob.expectedOutcome && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#eff4ff] border border-[#dce9ff] flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#0b1c30] font-bold uppercase tracking-wider">Expected Outcome</span>
                    <p className="text-[12px] text-[#43474e] leading-snug">{prob.expectedOutcome}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {prob.domains.map((d) => (
                    <span key={d} className="text-[11px] px-2 py-0.5 rounded bg-[#eff4ff] text-[#43474e] font-medium border border-[#dce9ff]">{d}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-[#f1f5f9]">
                <div className="flex items-center gap-3 text-[#43474e] text-[12px]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00152f]">attachment</span>
                    {prob.evidenceCount} evidence
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                    {timeAgo(prob.publishedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuickPreviewProblem(prob)} className="px-2.5 py-1 rounded text-[#0b1c30] hover:bg-[#e5eeff] font-semibold text-[12px] transition-colors" type="button">Quick View</button>
                  <button onClick={() => onSelectProblem(prob)} className="px-3.5 py-1.5 rounded bg-[#00152f] text-white hover:bg-[#0f2a4a] font-semibold text-[12px] transition-colors shadow-xs flex items-center gap-1" type="button">
                    <span>View Details & Submit</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl shadow-xs border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#43474e] text-[11px] uppercase tracking-wider font-bold border-b border-[#e2e8f0]">
                  <th className="py-3 px-4">Problem</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Access Rule</th>
                  <th className="py-3 px-3">Urgency & Severity</th>
                  <th className="py-3 px-3 text-right">Evidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[13px] text-[#0b1c30]">
                {filteredProblems.map((prob) => (
                  <tr key={prob.problemId} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-[#00152f] font-bold">{shortId(prob.problemId)}</span>
                        <span onClick={() => onSelectProblem(prob)} className="font-semibold text-[#0b1c30] line-clamp-1 cursor-pointer hover:underline">{prob.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[12px]">{BUCKET_LABEL[prob.sourceBucket ?? ''] || prob.sourceBucket}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${prob.accessRule === 'OPEN_TO_ALL' ? 'bg-[#dce9ff] text-[#00152f]' : prob.accessRule === 'UNIVERSITY_ONLY' ? 'bg-[#ffdfa0] text-[#5c4300]' : 'bg-[#cce5ff] text-[#001d31]'}`}>
                        {prob.accessRule}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ffdfa0] text-[#5c4300]">{prob.urgency || '—'}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e5eeff] text-[#0b1c30]">{prob.severity || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] font-semibold">{prob.evidenceCount}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => onSelectProblem(prob)} className="px-3 py-1 rounded bg-[#00152f] text-white hover:bg-[#0f2a4a] text-[12px] font-semibold transition-colors" type="button">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Preview Drawer */}
      {quickPreviewProblem && (
        <div className="fixed inset-0 bg-[#00152f]/40 backdrop-blur-[2px] z-50 transition-opacity flex justify-end" onClick={() => setQuickPreviewProblem(null)}>
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              <div className="flex items-start justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#00152f] text-white font-bold">{shortId(quickPreviewProblem.problemId)}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#e5eeff] text-[#00152f] font-semibold">{quickPreviewProblem.accessRule}</span>
                  </div>
                  <h3 className="font-headline text-[18px] text-[#0b1c30] font-bold">{quickPreviewProblem.title}</h3>
                </div>
                <button onClick={() => setQuickPreviewProblem(null)} className="p-1 rounded-lg hover:bg-[#eff4ff] text-[#74777f] hover:text-[#0b1c30]" type="button">
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#eff4ff] mt-3 text-[11px]">
                <div>
                  <span className="text-[#74777f] uppercase font-semibold">Source:</span>
                  <p className="font-bold text-[#0b1c30] mt-0.5 text-[12px]">{BUCKET_LABEL[quickPreviewProblem.sourceBucket ?? ''] || quickPreviewProblem.sourceBucket}</p>
                </div>
                <div>
                  <span className="text-[#74777f] uppercase font-semibold">Evidence Count:</span>
                  <p className="font-bold text-[#0b1c30] mt-0.5 text-[12px]">{quickPreviewProblem.evidenceCount}</p>
                </div>
                <div>
                  <span className="text-[#74777f] uppercase font-semibold">Urgency:</span>
                  <p className="font-bold text-[#795900] mt-0.5 text-[12px]">{quickPreviewProblem.urgency || '—'}</p>
                </div>
                <div>
                  <span className="text-[#74777f] uppercase font-semibold">Severity:</span>
                  <p className="font-bold text-[#00152f] mt-0.5 text-[12px]">{quickPreviewProblem.severity || '—'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <h4 className="text-[12px] text-[#0b1c30] font-bold uppercase tracking-wider">Problem Statement</h4>
                <p className="text-[13px] text-[#43474e] leading-relaxed">{quickPreviewProblem.description}</p>
                {quickPreviewProblem.expectedOutcome && (
                  <>
                    <h4 className="text-[12px] text-[#0b1c30] font-bold uppercase tracking-wider mt-3">Expected Outcome</h4>
                    <p className="text-[13px] text-[#43474e] leading-relaxed">{quickPreviewProblem.expectedOutcome}</p>
                  </>
                )}
                {quickPreviewProblem.accessUniversities && quickPreviewProblem.accessUniversities.length > 0 && (
                  <>
                    <h4 className="text-[12px] text-[#0b1c30] font-bold uppercase tracking-wider mt-3">Selected Institutions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {quickPreviewProblem.accessUniversities.map((u) => (
                        <span key={u} className="text-[11px] px-2 py-0.5 rounded bg-[#e5eeff] text-[#0b1c30] font-medium">{u}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2.5">
              <button onClick={() => setQuickPreviewProblem(null)} className="px-3.5 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-semibold text-[13px] hover:bg-[#dce9ff] transition-colors" type="button">Close Preview</button>
              <button
                onClick={() => { const prob = quickPreviewProblem; setQuickPreviewProblem(null); onSelectProblem(prob); }}
                className="px-4 py-1.5 rounded-lg bg-[#00152f] text-white font-semibold text-[13px] hover:bg-[#0f2a4a] transition-colors shadow-xs flex items-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Initiate Proposal Submission</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};