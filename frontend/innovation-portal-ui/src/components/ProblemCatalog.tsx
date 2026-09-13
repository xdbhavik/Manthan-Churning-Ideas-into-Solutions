<<<<<<< HEAD
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublishedProblem } from '../types';
import { useToast } from './Toast';
=======
import React, { useState, useMemo } from 'react';
import { PublishedProblem } from '../types';
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d

interface ProblemCatalogProps {
  problems: PublishedProblem[];
  onSelectProblem: (problem: PublishedProblem) => void;
<<<<<<< HEAD
  loading?: boolean;
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
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

<<<<<<< HEAD
/* ── Count up hook ── */
function useCountUp(target: number, duration = 700): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const animated = useCountUp(value);
  return <>{animated}</>;
};

export const ProblemCatalog: React.FC<ProblemCatalogProps> = ({
  problems,
  onSelectProblem,
  loading = false,
}) => {
  const { toast } = useToast();
=======
export const ProblemCatalog: React.FC<ProblemCatalogProps> = ({ problems, onSelectProblem }) => {
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccessRule, setSelectedAccessRule] = useState<string>('ALL');
  const [selectedSourceBucket, setSelectedSourceBucket] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [quickPreviewProblem, setQuickPreviewProblem] = useState<PublishedProblem | null>(null);
<<<<<<< HEAD
  const [digestState, setDigestState] = useState<'idle' | 'generating' | 'success'>('idle');
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d

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

<<<<<<< HEAD
  const hasActiveFilters =
    selectedAccessRule !== 'ALL' ||
    selectedSourceBucket !== 'ALL' ||
    selectedUrgency !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedDomain !== 'ALL' ||
    searchQuery.trim() !== '';

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (searchQuery.trim()) {
      chips.push({ label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery('') });
    }
    if (selectedAccessRule !== 'ALL') {
      chips.push({ label: `Access: ${selectedAccessRule}`, onRemove: () => setSelectedAccessRule('ALL') });
    }
    if (selectedSourceBucket !== 'ALL') {
      chips.push({ label: `Source: ${selectedSourceBucket}`, onRemove: () => setSelectedSourceBucket('ALL') });
    }
    if (selectedUrgency !== 'ALL') {
      chips.push({ label: `Urgency: ${selectedUrgency}`, onRemove: () => setSelectedUrgency('ALL') });
    }
    if (selectedSeverity !== 'ALL') {
      chips.push({ label: `Severity: ${selectedSeverity}`, onRemove: () => setSelectedSeverity('ALL') });
    }
    if (selectedDomain !== 'ALL') {
      chips.push({ label: `Domain: ${selectedDomain}`, onRemove: () => setSelectedDomain('ALL') });
    }
    return chips;
  }, [searchQuery, selectedAccessRule, selectedSourceBucket, selectedUrgency, selectedSeverity, selectedDomain]);

=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
  const openToAll = problems.filter((p) => p.accessRule === 'OPEN_TO_ALL').length;
  const uniOnly = problems.filter((p) => p.accessRule === 'UNIVERSITY_ONLY').length;
  const selectedUni = problems.filter((p) => p.accessRule === 'SELECTED_UNIVERSITIES').length;

  const handleDownloadDigest = () => {
<<<<<<< HEAD
    if (digestState !== 'idle') return;
    setDigestState('generating');

    setTimeout(() => {
      const content =
        `National Innovation Portal - Published Problem Catalog Digest\nGenerated: ${new Date().toLocaleString()}\nTotal Published: ${problems.length}\n\n` +
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
      a.download = 'Innovation_Portal_Catalog_Digest.txt';
      a.click();
      URL.revokeObjectURL(url);

      // Transition to success state
      setDigestState('success');
      toast('Catalog digest generated and downloaded successfully', 'success');

      setTimeout(() => {
        setDigestState('idle');
      }, 2000);
    }, 700);
  };

  const selectClass = (isActive: boolean) =>
    `bg-[#F7F8FC] px-3.5 py-2.5 rounded-xl text-[12px] font-semibold outline-none cursor-pointer transition-all ${
      isActive
        ? 'border-2 border-[#FF9933] text-[#0A2540] bg-[#FFF7ED] ring-2 ring-[#FF9933]/15'
        : 'border border-[#E5E7EB] text-[#475569] hover:border-[#94A3B8] focus:border-[#0A2540]'
    }`;

  return (
    <div className="flex flex-col w-full pb-14">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[#94A3B8] mb-3 text-[11px] uppercase tracking-wider font-semibold">
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">home</span>
          <span>Portal</span>
        </span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
<<<<<<< HEAD
        <span className="text-[#0A2540] font-bold">Published Catalog</span>
      </nav>

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
        <div className="flex flex-col max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9933]/10 text-[#FF9933] font-bold text-[11px] tracking-wide border border-[#FF9933]/25">
              <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
              CYCLE ACTIVE
            </span>
          </div>
          <h1 className="font-headline text-[28px] sm:text-[32px] font-bold text-[#0A2540] tracking-tight">
            Published Problem Statements
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1.5 leading-relaxed">
            Evaluated challenges auto-published to the portal. Visibility and access rules are governed by your participant verification.
          </p>
        </div>

        {/* Action Button: Digest with morphing checkmark */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadDigest}
            disabled={digestState !== 'idle'}
            className={`btn-sheen px-5 py-3 rounded-xl font-bold text-[13px] flex items-center gap-2.5 transition-all shadow-sm cursor-pointer ${
              digestState === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0A2540] hover:bg-[#163B65] text-white'
            }`}
            type="button"
          >
            {digestState === 'generating' ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : digestState === 'success' ? (
              <motion.span
                initial={{ scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                className="material-symbols-outlined text-[18px]"
              >
                check_circle
              </motion.span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">file_download</span>
            )}
            <span>
              {digestState === 'generating'
                ? 'Compiling Digest…'
                : digestState === 'success'
                ? 'Digest Downloaded!'
                : 'Catalog Digest'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Key Metrics Row with Stagger and Count-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Published', value: problems.length, icon: 'dataset', iconBg: 'bg-[#FFF7ED] text-[#FF9933]', sub: 'Visible to you' },
          { label: 'Open to All', value: openToAll, icon: 'public', iconBg: 'bg-[#EFF6FF] text-[#0A2540]', sub: 'Student teams' },
          { label: 'University Reserved', value: uniOnly, icon: 'account_balance', iconBg: 'bg-amber-50 text-amber-600', sub: 'HEI Nodal Lead' },
          { label: 'Selected Institutions', value: selectedUni, icon: 'shield_person', iconBg: 'bg-emerald-50 text-[#138808]', sub: 'Whitelist' },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex flex-col justify-between card-hover shadow-xs relative overflow-hidden group cursor-default"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] tricolor-stripe" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{m.label}</span>
                <span className="font-headline text-[32px] font-bold text-[#0A2540] tracking-tight mt-1">
                  <AnimatedNumber value={m.value} />
                </span>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${m.iconBg}`}>
                <span className="material-symbols-outlined text-[24px]">{m.icon}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#F1F5F9] text-[11px] text-[#64748B]">
              <span className="font-semibold">{m.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters Section */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] mb-6 flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/15 focus:border-[#0A2540] transition-all font-medium"
              placeholder="Search by problem title, ID, technology domain, or description…"
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
              type="text"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
<<<<<<< HEAD
            {/* Segmented control with animated sliding indicator */}
            <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'text-[#0A2540]' : 'text-[#64748B] hover:text-[#0A2540]'
                }`}
                type="button"
              >
                {viewMode === 'grid' && (
                  <motion.div
                    layoutId="catalog-view-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 material-symbols-outlined text-[17px]">grid_view</span>
                <span className="relative z-10">Cards</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'text-[#0A2540]' : 'text-[#64748B] hover:text-[#0A2540]'
                }`}
                type="button"
              >
                {viewMode === 'table' && (
                  <motion.div
                    layoutId="catalog-view-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 material-symbols-outlined text-[17px]">table_rows</span>
                <span className="relative z-10">Table</span>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
              </button>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={selectedAccessRule}
            onChange={(e) => setSelectedAccessRule(e.target.value)}
            className={selectClass(selectedAccessRule !== 'ALL')}
          >
=======
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          <select value={selectedAccessRule} onChange={(e) => setSelectedAccessRule(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            <option value="ALL">All Access Rules</option>
            <option value="OPEN_TO_ALL">OPEN_TO_ALL</option>
            <option value="UNIVERSITY_ONLY">UNIVERSITY_ONLY</option>
            <option value="SELECTED_UNIVERSITIES">SELECTED_UNIVERSITIES</option>
          </select>
<<<<<<< HEAD
          <select
            value={selectedSourceBucket}
            onChange={(e) => setSelectedSourceBucket(e.target.value)}
            className={selectClass(selectedSourceBucket !== 'ALL')}
          >
=======
          <select value={selectedSourceBucket} onChange={(e) => setSelectedSourceBucket(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            <option value="ALL">All Sources</option>
            <option value="GOVT">GOVT</option>
            <option value="CITIZEN">CITIZEN</option>
            <option value="INDUSTRY">INDUSTRY</option>
            <option value="COMMUNITY">COMMUNITY</option>
            <option value="HEI">HEI</option>
          </select>
<<<<<<< HEAD
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className={selectClass(selectedUrgency !== 'ALL')}
          >
=======
          <select value={selectedUrgency} onChange={(e) => setSelectedUrgency(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            <option value="ALL">All Urgency</option>
            <option value="IMMEDIATE">IMMEDIATE</option>
            <option value="SHORT_TERM">SHORT_TERM</option>
            <option value="LONG_TERM">LONG_TERM</option>
          </select>
<<<<<<< HEAD
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={selectClass(selectedSeverity !== 'ALL')}
          >
=======
          <select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            <option value="ALL">All Severity</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
<<<<<<< HEAD
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className={selectClass(selectedDomain !== 'ALL')}
          >
            <option value="ALL">All Domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
=======
          <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)} className="bg-[#eff4ff] border border-[#dce9ff] px-2.5 py-1.5 rounded text-[#0b1c30] text-[12px] font-semibold outline-none cursor-pointer">
            <option value="ALL">All Domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>{d}</option>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            ))}
          </select>
        </div>

<<<<<<< HEAD
        {/* Filter chips with animation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase">Active Filters:</span>
            {!hasActiveFilters && <span className="text-[12px] text-[#94A3B8]">None applied</span>}

            <AnimatePresence>
              {activeFilterChips.map((chip) => (
                <motion.span
                  key={chip.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#0A2540] text-[11px] font-semibold shadow-xs"
                >
                  <span>{chip.label}</span>
                  <button
                    onClick={chip.onRemove}
                    className="text-[#94A3B8] hover:text-red-500 cursor-pointer"
                    aria-label="Remove filter"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>

            {hasActiveFilters && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetFilters}
                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
                Reset All
              </motion.button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[12px] text-[#64748B]">
            Showing <strong className="text-[#0A2540] font-bold">{filteredProblems.length}</strong> of {problems.length} problems
=======
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#74777f] uppercase mr-1">Filtered by:</span>
            <button onClick={resetFilters} className="text-[#795900] hover:underline text-[11px] ml-1 font-bold" type="button">Reset Filters</button>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-[#43474e]">
            Showing <strong className="text-[#0b1c30] font-bold">{filteredProblems.length}</strong> of {problems.length} problems
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Skeletons when loading */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col gap-4 shadow-xs">
              <div className="flex justify-between items-center">
                <div className="w-24 h-5 rounded-md skeleton-shimmer" />
                <div className="w-28 h-5 rounded-full skeleton-shimmer" />
              </div>
              <div className="w-3/4 h-6 rounded-md skeleton-shimmer mt-2" />
              <div className="w-full h-16 rounded-lg skeleton-shimmer" />
              <div className="flex gap-2">
                <div className="w-16 h-5 rounded-md skeleton-shimmer" />
                <div className="w-20 h-5 rounded-md skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProblems.length === 0 ? (
        /* Empty State with floating micro-animation */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full bg-white rounded-3xl p-12 border border-[#E5E7EB] flex flex-col items-center justify-center text-center shadow-xs"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mb-4 shadow-inner animate-float">
            <span className="material-symbols-outlined text-[42px] text-[#94A3B8]">folder_off</span>
          </div>
          <h3 className="font-headline text-[20px] font-bold text-[#0A2540]">No Published Statements</h3>
          <p className="text-[13px] text-[#64748B] max-w-lg mt-2 mb-6 leading-relaxed">
            {problems.length === 0
              ? 'Problems are automatically published to this catalog once their evaluation cycle reaches completion. Please check back after an evaluation cycle is completed.'
              : 'No problems match your current filter parameters. Try clearing some filters to see the full set of published problems.'}
          </p>
          {problems.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetFilters}
              className="btn-sheen px-5 py-2.5 rounded-xl bg-[#0A2540] text-white font-bold text-[13px] hover:bg-[#163B65] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              <span>Reset All Filters</span>
            </motion.button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        /* Staggered Card Grid with Framer Motion */
        <motion.div
          layout
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
        >
          {filteredProblems.map((prob) => (
            <motion.article
              key={prob.problemId}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl p-6 border border-[#E5E7EB] flex flex-col justify-between card-hover relative overflow-hidden shadow-xs group"
            >
              {/* Left gradient accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-full"
                style={{ background: 'linear-gradient(180deg, #FF9933 0%, #138808 100%)' }}
              />

              <div className="flex flex-col pl-1.5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#0A2540] text-white font-bold">
                      {shortId(prob.problemId)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-bold">
                      {BUCKET_LABEL[prob.sourceBucket ?? ''] || prob.sourceBucket}
                    </span>
                    {prob.urgency && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          prob.urgency === 'IMMEDIATE'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
                        {prob.urgency}
                      </span>
                    )}
                    {prob.severity && (
<<<<<<< HEAD
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          prob.severity === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : prob.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
=======
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${prob.severity === 'CRITICAL' ? 'bg-[#ba1a1a] text-white' : prob.severity === 'HIGH' ? 'bg-[#ffc641] text-[#715300]' : 'bg-[#e5eeff] text-[#0b1c30]'}`}>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
                        {prob.severity}
                      </span>
                    )}
                  </div>
<<<<<<< HEAD

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      prob.accessRule === 'OPEN_TO_ALL'
                        ? 'bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE]'
                        : prob.accessRule === 'UNIVERSITY_ONLY'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {prob.accessRule === 'OPEN_TO_ALL'
                        ? 'public'
                        : prob.accessRule === 'UNIVERSITY_ONLY'
                        ? 'account_balance'
                        : 'shield'}
=======
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${prob.accessRule === 'OPEN_TO_ALL' ? 'bg-[#dce9ff] text-[#00152f]' : prob.accessRule === 'UNIVERSITY_ONLY' ? 'bg-[#ffdfa0] text-[#5c4300]' : 'bg-[#cce5ff] text-[#001d31]'}`}>
                    <span className="material-symbols-outlined text-[13px]">
                      {prob.accessRule === 'OPEN_TO_ALL' ? 'public' : prob.accessRule === 'UNIVERSITY_ONLY' ? 'account_balance' : 'shield'}
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
                    </span>
                    {prob.accessRule}
                  </span>
                </div>

<<<<<<< HEAD
                <h2
                  onClick={() => onSelectProblem(prob)}
                  className="font-headline text-[18px] text-[#0A2540] font-bold tracking-tight cursor-pointer hover:text-[#FF9933] transition-colors leading-snug"
                >
                  {prob.title}
                </h2>

                <p className="text-[13px] text-[#64748B] mt-2 line-clamp-3 leading-relaxed">
                  {prob.description}
                </p>

                {prob.expectedOutcome && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col gap-1">
                    <span className="text-[10px] text-[#0A2540] font-bold uppercase tracking-wider">
                      Expected Outcome
                    </span>
                    <p className="text-[12px] text-[#64748B] leading-relaxed">{prob.expectedOutcome}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
                  {prob.domains.map((d) => (
                    <span
                      key={d}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B] font-semibold border border-[#E5E7EB]"
                    >
                      {d}
                    </span>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
                  ))}
                </div>
              </div>

<<<<<<< HEAD
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-3.5 border-t border-[#F1F5F9] pl-1.5">
                <div className="flex items-center gap-3 text-[#64748B] text-[12px]">
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-[#0A2540]">attachment</span>
                    {prob.evidenceCount} evidence
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {timeAgo(prob.publishedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickPreviewProblem(prob)}
                    className="px-3.5 py-2 rounded-xl text-[#475569] hover:bg-[#F1F5F9] font-bold text-[12px] transition-colors cursor-pointer"
                    type="button"
                  >
                    Quick View
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectProblem(prob)}
                    className="btn-sheen px-4 py-2 rounded-xl bg-[#0A2540] text-white hover:bg-[#163B65] font-bold text-[12px] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    type="button"
                  >
                    <span>View & Submit</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </motion.button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      ) : (
        /* Table View */
        <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F7F8FC] text-[#64748B] text-[11px] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
                  <th className="py-3.5 px-4">Problem</th>
                  <th className="py-3.5 px-3">Source</th>
                  <th className="py-3.5 px-3">Access Rule</th>
                  <th className="py-3.5 px-3">Urgency & Severity</th>
                  <th className="py-3.5 px-3 text-right">Evidence</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[13px] text-[#1E293B]">
                {filteredProblems.map((prob) => (
                  <tr key={prob.problemId} className="hover:bg-[#F7F8FC] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-[#0A2540] font-bold">
                          {shortId(prob.problemId)}
                        </span>
                        <span
                          onClick={() => onSelectProblem(prob)}
                          className="font-bold text-[#1E293B] line-clamp-1 cursor-pointer hover:text-[#FF9933] transition-colors"
                        >
                          {prob.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-[12px]">
                        {BUCKET_LABEL[prob.sourceBucket ?? ''] || prob.sourceBucket}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          prob.accessRule === 'OPEN_TO_ALL'
                            ? 'bg-[#EFF6FF] text-[#0A2540]'
                            : prob.accessRule === 'UNIVERSITY_ONLY'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {prob.accessRule}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
                          {prob.urgency || '—'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
                          {prob.severity || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-[11px] font-semibold">
                      {prob.evidenceCount}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectProblem(prob)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0A2540] text-white hover:bg-[#163B65] text-[12px] font-bold transition-colors cursor-pointer shadow-xs"
                        type="button"
                      >
                        Details
                      </button>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Quick Preview Drawer with Spring slide */}
      <AnimatePresence>
        {quickPreviewProblem && (
          <div
            className="fixed inset-0 bg-[#0A2540]/40 backdrop-blur-[3px] z-50 transition-opacity flex justify-end"
            onClick={() => setQuickPreviewProblem(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto flex flex-col justify-between border-l border-[#E5E7EB]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#0A2540] text-white font-bold">
                        {shortId(quickPreviewProblem.problemId)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-bold">
                        {quickPreviewProblem.accessRule}
                      </span>
                    </div>
                    <h3 className="font-headline text-[20px] text-[#0A2540] font-bold leading-tight">
                      {quickPreviewProblem.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setQuickPreviewProblem(null)}
                    className="p-1.5 rounded-xl hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0A2540] transition-colors cursor-pointer"
                    type="button"
                    aria-label="Close drawer"
                  >
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F7F8FC] border border-[#E5E7EB] mt-4 text-[11px]">
                  <div>
                    <span className="text-[#94A3B8] uppercase font-bold">Source Bucket:</span>
                    <p className="font-bold text-[#0A2540] mt-0.5 text-[13px]">
                      {BUCKET_LABEL[quickPreviewProblem.sourceBucket ?? ''] || quickPreviewProblem.sourceBucket}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] uppercase font-bold">Evidence Count:</span>
                    <p className="font-bold text-[#0A2540] mt-0.5 text-[13px]">
                      {quickPreviewProblem.evidenceCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] uppercase font-bold">Urgency:</span>
                    <p className="font-bold text-amber-700 mt-0.5 text-[13px]">
                      {quickPreviewProblem.urgency || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] uppercase font-bold">Severity:</span>
                    <p className="font-bold text-[#0A2540] mt-0.5 text-[13px]">
                      {quickPreviewProblem.severity || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  <h4 className="text-[12px] text-[#0A2540] font-bold uppercase tracking-wider">Problem Statement</h4>
                  <p className="text-[14px] text-[#64748B] leading-relaxed">{quickPreviewProblem.description}</p>
                  {quickPreviewProblem.expectedOutcome && (
                    <>
                      <h4 className="text-[12px] text-[#0A2540] font-bold uppercase tracking-wider mt-3">
                        Expected Outcome
                      </h4>
                      <p className="text-[14px] text-[#64748B] leading-relaxed">
                        {quickPreviewProblem.expectedOutcome}
                      </p>
                    </>
                  )}
                  {quickPreviewProblem.accessUniversities && quickPreviewProblem.accessUniversities.length > 0 && (
                    <>
                      <h4 className="text-[12px] text-[#0A2540] font-bold uppercase tracking-wider mt-3">
                        Selected Institutions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {quickPreviewProblem.accessUniversities.map((u) => (
                          <span key={u} className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-medium">
                            {u}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  onClick={() => setQuickPreviewProblem(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#F1F5F9] text-[#475569] font-bold text-[13px] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                  type="button"
                >
                  Close Preview
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const prob = quickPreviewProblem;
                    setQuickPreviewProblem(null);
                    onSelectProblem(prob);
                  }}
                  className="btn-sheen px-5 py-2.5 rounded-xl bg-[#0A2540] text-white font-bold text-[13px] hover:bg-[#163B65] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Initiate Proposal Submission</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    </div>
  );
};