interface PaginationProps {
  page?: number; // 0-indexed
  currentPage?: number; // 0-indexed alias
  totalPages: number;
  totalElements?: number;
  size?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  currentPage,
  totalPages,
  totalElements,
  size = 20,
  onPageChange,
}: PaginationProps) {
  const activePage = page ?? currentPage ?? 0;
  if (totalPages <= 1) return null;

  const showStats = totalElements !== undefined && totalElements !== null;
  const from = activePage * size + 1;
  const to = Math.min((activePage + 1) * size, totalElements ?? (activePage + 1) * size);

  return (
    <div className="flex items-center justify-between py-space-md px-space-lg border-t border-border-hairline">
      {showStats ? (
        <span className="font-body-sm text-body-sm text-text-muted">
          Showing {from}–{to} of {totalElements}
        </span>
      ) : <div />}
      <div className="flex items-center gap-space-sm">
        <button
          id="pagination-prev-btn"
          type="button"
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage === 0}
          className="flex items-center gap-space-xs px-space-md h-8 rounded font-label-lg text-label-lg bg-surface-muted text-text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Previous
        </button>
        <span className="font-label-md text-label-md text-text-primary px-space-sm">
          Page {activePage + 1} of {totalPages}
        </span>
        <button
          id="pagination-next-btn"
          type="button"
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage >= totalPages - 1}
          className="flex items-center gap-space-xs px-space-md h-8 rounded font-label-lg text-label-lg bg-surface-muted text-text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
        >
          Next
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
