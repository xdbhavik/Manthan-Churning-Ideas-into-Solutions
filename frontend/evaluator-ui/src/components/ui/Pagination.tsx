import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  size: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  pageSizes?: number[];
}

export default function Pagination({
  page,
  totalPages,
  size,
  totalElements,
  onPageChange,
  onSizeChange,
  pageSizes = [10, 20, 50, 100],
}: PaginationProps) {
  const start = page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[13px]">
      <div className="flex items-center gap-2 text-[#64748B]">
        <span>Rows per page:</span>
        <select
          value={size}
          onChange={(e) => { onSizeChange(Number(e.target.value)); onPageChange(0); }}
          className="border border-[#E2E8F0] rounded px-2 py-0.5 text-[#0A2540] bg-white"
        >
          {pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 text-[#64748B]">
        <span>{start}–{end} of {totalElements}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-[#E2E8F0] disabled:opacity-30"
            title="First page"
          >
            <span className="material-symbols-outlined text-[18px]">first_page</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-[#E2E8F0] disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="px-2 font-semibold text-[#0A2540]">Page {page + 1} of {totalPages || 1}</span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-[#E2E8F0] disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-[#E2E8F0] disabled:opacity-30"
            title="Last page"
          >
            <span className="material-symbols-outlined text-[18px]">last_page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
