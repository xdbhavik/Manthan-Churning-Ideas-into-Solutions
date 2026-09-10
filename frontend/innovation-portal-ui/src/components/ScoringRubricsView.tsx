import React from 'react';
import { EvaluationCriteria } from '../types';

interface ScoringRubricsViewProps {
  criteria: EvaluationCriteria[];
}

export const ScoringRubricsView: React.FC<ScoringRubricsViewProps> = ({ criteria }) => {
  return (
    <div className="flex flex-col w-full pb-12">
      <div className="mb-6">
        <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">Scoring Rubrics</h1>
        <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
          The evaluation criteria configured for your review workload, as returned by the evaluation-service.
        </p>
      </div>

      {criteria.length === 0 ? (
        <div className="w-full bg-white rounded-xl p-12 shadow-xs border border-[#e2e8f0] text-center">
          <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#74777f] mb-4 mx-auto">
            <span className="material-symbols-outlined text-[36px]">rule</span>
          </div>
          <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">No Rubrics Configured</h3>
          <p className="text-[13px] text-[#43474e] max-w-lg mx-auto mt-1 leading-relaxed">
            No evaluation criteria are currently assigned to your profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {criteria.map((c) => (
            <div key={c.id} className="bg-white rounded-xl p-5 shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00152f]">
                  <span className="material-symbols-outlined text-[22px]">rule</span>
                </div>
                <span className="font-headline text-[22px] font-bold text-[#00152f]">{c.maxScore}</span>
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#0b1c30]">{c.label}</h3>
                <p className="text-[12px] text-[#43474e] mt-1 leading-relaxed">{c.description}</p>
              </div>
              <div className="mt-auto pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#74777f]">
                <span className="font-mono text-[10px] text-[#00152f] font-semibold">{c.key}</span>
                <span>Max {c.maxScore} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};