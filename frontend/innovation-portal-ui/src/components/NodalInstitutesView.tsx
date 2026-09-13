import React from 'react';

export const NodalInstitutesView: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-12 page-enter">
      <div className="mb-6">
        <h1 className="font-headline text-[26px] font-bold text-[#0A2540] tracking-tight">Nodal Institutes</h1>
        <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
          Reference directory of nodal and HEI institutes participating in the national innovation cycle.
        </p>
      </div>

      <div className="w-full bg-white rounded-xl p-10 border border-[#E5E7EB] flex flex-col items-center text-center gap-3 animate-fadeInUp">
        <div className="w-16 h-16 rounded-2xl bg-[#F7F8FC] flex items-center justify-center text-[#94A3B8]">
          <span className="material-symbols-outlined text-[36px]">corporate_fare</span>
        </div>
        <h3 className="font-headline text-[18px] font-bold text-[#0A2540]">Institute Directory</h3>
        <p className="text-[13px] text-[#64748B] max-w-md leading-relaxed">
          The nodal-institute directory is managed through the source-service registrations workflow. This view is a reference placeholder and will be populated once institute data is synced.
        </p>
      </div>
    </div>
  );
};