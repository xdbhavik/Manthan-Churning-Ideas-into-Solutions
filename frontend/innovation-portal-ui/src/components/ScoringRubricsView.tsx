import React from 'react';
import { EvaluationCriteria } from '../types';

interface ScoringRubricsViewProps {
  criteria: EvaluationCriteria[];
}

export const ScoringRubricsView: React.FC<ScoringRubricsViewProps> = ({ criteria }) => {
  return (
    <div className="flex flex-col w-full pb-12 page-enter">
      <div className="mb-6">
        <h1 className="font-headline text-[26px] font-bold text-[#0A2540] tracking-tight">Scoring Rubrics</h1>
        <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
          The evaluation criteria configured for your review workload, as returned by the evaluation-service.
        </p>
      </div>

      {criteria.length === 0 ? (
        <div className="w-full bg-white rounded-xl p-12 border border-[#E5E7EB] text-center animate-fadeInUp">
          <div className="w-16 h-16 rounded-2xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8] mb-4 mx-auto">
            <span className="material-symbols-outlined text-[36px]">rule</span>
          </div>
          <h3 className="font-headline text-[18px] font-bold text-[#0A2540]">No Rubrics Configured</h3>
          <p className="text-[13px] text-[#64748B] max-w-lg mx-auto mt-1 leading-relaxed">
            No evaluation criteria are currently assigned to your profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {criteria.map((c, i) => (
            <div key={c.id} className={`bg-white rounded-xl p-5 border border-[#E5E7EB] flex flex-col gap-3 card-hover relative overflow-hidden animate-fadeInUp delay-${(i % 4) + 1}`}>
              <div className="absolute top-0 left-0 right-0 h-[3px] tricolor-stripe" />
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0A2540]">
                  <span className="material-symbols-outlined text-[22px]">rule</span>
                </div>
                <span className="font-headline text-[22px] font-bold text-[#0A2540]">{c.maxScore}</span>
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[#0A2540]">{c.label}</h3>
                <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed">{c.description}</p>
              </div>
              <div className="mt-auto pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-mono text-[10px] text-[#0A2540] font-semibold">{c.key}</span>
                <span>Max {c.maxScore} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};