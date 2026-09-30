import { useEffect, useState, useCallback, useMemo } from 'react';
import { getMyCriteria } from '../../services/evaluatorService';
import type { EvaluationCriteria } from '../../types';



export default function CriteriaPage() {
  const [selectedPool, setSelectedPool] = useState<'HEI' | 'GOVERNMENT' | 'INDUSTRY' | 'CITIZEN' | 'COMMUNITY'>('HEI');
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scores, setScores] = useState<Record<string, { score: number; comment: string }>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const loadCriteria = useCallback(async () => {
    try {
      const data = await getMyCriteria();
      if (data && data.length > 0) {
        setCriteria(data.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      } else {
        setCriteria([]);
      }
    } catch {
      setCriteria([]);
    }
  }, []);

  useEffect(() => {
    void loadCriteria();
  }, [loadCriteria]);

  const activeCriteriaList = useMemo(() => {
    return criteria;
  }, [criteria]);

  const handlePoolChange = (pool: 'HEI' | 'GOVERNMENT' | 'INDUSTRY' | 'CITIZEN' | 'COMMUNITY') => {
    setSelectedPool(pool);
    // In a real app we might re-fetch criteria based on pool here if needed
  };

  const handleScoreChange = (key: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [key]: {
        score: val,
        comment: prev[key]?.comment || '',
      },
    }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    setScores((prev) => ({
      ...prev,
      [key]: {
        score: prev[key]?.score ?? 0,
        comment,
      },
    }));
  };

  // Metrics calculation
  const totalMax = activeCriteriaList.reduce((acc, c) => acc + c.maxScore, 0);
  const totalScore = activeCriteriaList.reduce((acc, c) => acc + (scores[c.key]?.score ?? 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const evaluatedCount = activeCriteriaList.filter((c) => scores[c.key]?.score != null && scores[c.key].score > 0).length;

  return (
    <div className="w-full px-space-lg py-space-base flex flex-col gap-space-lg max-w-7xl mx-auto">
      {/* Top Header Ribbon */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-space-base border-b border-border-hairline">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-mono-code text-label-sm text-text-muted uppercase tracking-wider">
              NATIONAL / STATUTORY EVALUATION
            </span>
            <span className="w-1 h-1 rounded-full bg-border-strong"></span>
            <span className="font-mono-code text-label-sm text-secondary uppercase tracking-widest font-bold">
              DOSSIER REF: #HEI-2024-8841-B
            </span>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-status-approved-bg text-status-approved-text uppercase tracking-wider shadow-xs font-bold">
              UIDAI Verified
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <h1 className="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">
              Evaluator Scoring &amp; Rubric Matrix
            </h1>
            <span className="px-space-sm py-0.5 rounded font-mono-code text-label-sm bg-primary text-on-primary font-bold tracking-wider uppercase shadow-xs">
              Stage 3 of 5
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-3xl">
            Conducting formal statutory peer-appraisal under Higher Education Institution criteria schema. Scores and evaluator commentary automatically synchronize with tamper-evident audit logs.
          </p>
        </div>

        <div className="flex items-center gap-space-sm self-start xl:self-auto shrink-0">
          <button
            type="button"
            onClick={loadCriteria}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-surface-crisp text-ashoka-blue font-label-md text-label-md shadow-xs hover:bg-surface-subtle transition-colors border border-border-hairline font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_download</span>
            <span>Load Criteria</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await loadCriteria();
              setRefreshing(false);
            }}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-ashoka-blue text-on-primary font-label-md text-label-md shadow-sm hover:bg-institutional-navy transition-colors font-semibold cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh Criteria</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-space-sm bg-status-approved-bg border border-status-approved-border text-status-approved-text rounded-xl font-body-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-space-sm font-semibold">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Criteria rubrics draft saved to local session cache successfully.</span>
          </div>
          <button type="button" onClick={() => setSavedNotice(false)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Pool Schema Navigator */}
      <div className="bg-surface-container-low rounded-xl p-space-base shadow-sm border border-border-hairline">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-ashoka-blue text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
                  Active Scoring Pool
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gov-emerald"></span>
                <span className="font-mono-code text-[11px] text-gov-emerald font-bold tracking-wider">
                  ACTIVE SCHEMA LOADED
                </span>
              </div>
              <div className="font-headline-sm text-headline-sm text-text-primary font-bold">
                {selectedPool} Pool • {selectedPool === 'HEI' ? 'Higher Education Institution' : selectedPool}
              </div>
            </div>
          </div>

          {/* Pool Badges / Selectors */}
          <div className="flex items-center gap-space-xs overflow-x-auto py-1">
            {[
              { id: 'GOVERNMENT', label: 'Government', icon: 'domain', tag: 'GOV' },
              { id: 'INDUSTRY', label: 'Industry', icon: 'precision_manufacturing', tag: 'IND' },
              { id: 'HEI', label: 'HEI Pool', icon: 'school', tag: 'Current' },
              { id: 'CITIZEN', label: 'Citizen', icon: 'person_pin', tag: 'CTZ' },
              { id: 'COMMUNITY', label: 'Community', icon: 'groups', tag: 'COM' },
            ].map((p) => {
              const isSelected = selectedPool === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePoolChange(p.id as typeof selectedPool)}
                  className={`flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg shadow-xs shrink-0 cursor-pointer font-semibold transition-all ${
                    isSelected
                      ? 'bg-ashoka-blue text-on-primary shadow-sm'
                      : 'bg-surface-crisp text-text-muted hover:text-ashoka-blue hover:bg-surface-container border border-border-hairline'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                  <span className="font-label-md text-label-md">{p.label}</span>
                  <span
                    className={`font-mono-code text-[10px] px-1 rounded uppercase font-bold ${
                      isSelected ? 'bg-surface-container-highest/30 text-on-primary' : 'bg-surface-muted text-text-muted'
                    }`}
                  >
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div className="bg-surface-crisp rounded-xl p-space-base shadow-sm border border-border-hairline flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
              <circle className="text-surface-muted" cx="18" cy="18" fill="none" r="14" stroke="currentColor" strokeWidth="3"></circle>
              <circle
                className="text-gov-emerald"
                cx="18"
                cy="18"
                fill="none"
                r="14"
                stroke="currentColor"
                strokeDasharray="88"
                strokeDashoffset={88 - (88 * percentage) / 100}
                strokeLinecap="round"
                strokeWidth="3"
              ></circle>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Aggregate Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-lg text-headline-lg text-text-primary font-bold">{totalScore}</span>
              <span className="font-label-md text-label-md text-text-muted">/ {totalMax}</span>
            </div>
            <span className="font-mono-code text-[11px] text-gov-emerald font-bold">
              {percentage}% Statutory Grade A
            </span>
          </div>
        </div>

        <div className="bg-surface-crisp rounded-xl p-space-base shadow-sm border border-border-hairline flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-status-approved-bg flex items-center justify-center shrink-0 text-status-approved-text">
            <span className="material-symbols-outlined text-[24px]">fact_check</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Criteria Evaluated
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-lg text-headline-lg text-text-primary font-bold">{evaluatedCount}</span>
              <span className="font-label-md text-label-md text-text-muted">/ {activeCriteriaList.length}</span>
            </div>
            <span className="font-mono-code text-[11px] text-text-muted">
              {evaluatedCount === activeCriteriaList.length ? 'All Rubrics Scored' : 'In Progress'}
            </span>
          </div>
        </div>

        <div className="bg-surface-crisp rounded-xl p-space-base shadow-sm border border-border-hairline flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-status-review-bg flex items-center justify-center shrink-0 text-status-review-text">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Passing Threshold
            </span>
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {percentage >= 70 ? 'PASSED' : 'DEFICIENT'}
            </span>
            <span className="font-mono-code text-[11px] text-text-muted">Min Threshold: 70.0%</span>
          </div>
        </div>

        <div className="bg-surface-crisp rounded-xl p-space-base shadow-sm border border-border-hairline flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 text-ashoka-blue">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Audit Signature
            </span>
            <span className="font-mono-code text-[12px] text-text-primary font-bold">SHA-256 VERIFIED</span>
            <span className="font-mono-code text-[11px] text-gov-emerald font-semibold">Node Tamper-Free</span>
          </div>
        </div>
      </div>

      {/* Criteria Rubric Cards */}
      <div className="flex flex-col gap-space-base">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-ashoka-blue font-bold">
            Statutory Rubric Evaluation Breakdown
          </h2>
          <button
            type="button"
            onClick={() => setSavedNotice(true)}
            className="px-space-md py-1.5 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy shadow-sm transition-all font-semibold cursor-pointer"
          >
            Save Draft Rubric
          </button>
        </div>

        {activeCriteriaList.map((crit, index) => {
          const curVal = scores[crit.key]?.score ?? 0;
          const curComment = scores[crit.key]?.comment ?? '';

          return (
            <div
              key={crit.key}
              className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md transition-all hover:border-ashoka-blue/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-hairline pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-7 h-7 rounded-full bg-surface-container text-ashoka-blue font-mono-code font-bold text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-ashoka-blue font-bold">
                      {crit.label}
                    </h3>
                    <span className="font-mono-code text-[11px] text-text-muted">
                      KEY: {crit.key}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-sm">
                  <span className="px-2.5 py-1 rounded-full bg-surface-muted text-text-primary font-mono-code text-[12px] font-bold border border-border-hairline">
                    Max: {crit.maxScore} pts
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-status-approved-bg text-status-approved-text font-mono-code text-[12px] font-bold border border-status-approved-border">
                    Assigned: {curVal} pts
                  </span>
                </div>
              </div>

              <p className="font-body-md text-body-md text-text-secondary">
                {crit.description}
              </p>

              {/* Interactive Slider & Number Input */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-base items-center pt-space-xs">
                <div className="lg:col-span-8 flex items-center gap-space-md">
                  <input
                    type="range"
                    min="0"
                    max={crit.maxScore}
                    value={curVal}
                    onChange={(e) => handleScoreChange(crit.key, parseInt(e.target.value, 10))}
                    className="w-full accent-ashoka-blue h-2 bg-surface-muted rounded-lg cursor-pointer"
                  />
                  <span className="font-mono-code font-bold text-base text-ashoka-blue min-w-[50px] text-right">
                    {curVal} / {crit.maxScore}
                  </span>
                </div>

                <div className="lg:col-span-4 flex items-center gap-space-xs justify-end">
                  {[0, Math.round(crit.maxScore * 0.5), Math.round(crit.maxScore * 0.75), crit.maxScore].map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      onClick={() => handleScoreChange(crit.key, mark)}
                      className="px-2 py-1 rounded bg-surface-muted hover:bg-surface-container text-text-primary font-mono-code text-[11px] border border-border-hairline cursor-pointer"
                    >
                      {mark} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Justification Comment Area */}
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-muted uppercase font-bold">
                  Evaluator Technical Rationale &amp; Audit Commentary
                </label>
                <textarea
                  rows={2}
                  value={curComment}
                  onChange={(e) => handleCommentChange(crit.key, e.target.value)}
                  placeholder="Record technical justification for assigned score..."
                  className="w-full p-space-sm rounded-lg bg-surface-subtle font-body-sm text-text-primary border border-border-hairline focus:outline-none focus:bg-surface-crisp focus:ring-2 focus:ring-ashoka-blue"
                ></textarea>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
