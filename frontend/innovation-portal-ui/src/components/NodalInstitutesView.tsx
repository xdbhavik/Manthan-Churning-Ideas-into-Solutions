import React from 'react';

export const NodalInstitutesView: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-12">
      <div className="mb-6">
        <h1 className="font-headline text-[26px] font-bold text-[#0b1c30] tracking-tight">Nodal Institutes</h1>
        <p className="text-[14px] text-[#43474e] mt-1 leading-relaxed">
          Reference directory of nodal / HEI institutes participating in the SIH26043 innovation cycle.
        </p>
      </div>

      <div className="w-full bg-white rounded-xl p-10 shadow-xs border border-[#e2e8f0] flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#74777f]">
          <span className="material-symbols-outlined text-[36px]">corporate_fare</span>
        </div>
        <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">Institute Directory</h3>
        <p className="text-[13px] text-[#43474e] max-w-md leading-relaxed">
          The nodal-institute directory is managed through the source-service registrations workflow. Currently
          there is no portal endpoint exposing the live directory — this view is a static reference placeholder.
        </p>
      </div>
    </div>
  );
};