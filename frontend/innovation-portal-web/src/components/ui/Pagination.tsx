import { Button } from './Button';

export interface PaginationProps {
  currentPage: number; // 0-indexed
  pageCount: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  pageCount,
  onPageChange,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className = '',
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const getPageNumbers = () => {
    if (pageCount <= maxPageNumbers) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    const half = Math.floor(maxPageNumbers / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(pageCount, start + maxPageNumbers);

    if (end - start < maxPageNumbers) {
      start = Math.max(0, end - maxPageNumbers);
    }

    return Array.from({ length: end - start }, (_, i) => start + i);
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav aria-label="Pagination" className={`flex items-center gap-1 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        aria-label="Previous page"
        leftIcon={<span className="material-symbols-outlined text-lg">chevron_left</span>}
      >
        <span className="sr-only">Previous page</span>
      </Button>
      {showPageNumbers && (
        <>
          {pageNumbers[0] > 0 && (
            <>
              <button
                onClick={() => onPageChange(0)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-label-mono-sm text-label-mono-sm ${
                  currentPage === 0
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'border border-border-subtle bg-surface-card text-on-surface hover:bg-surface-canvas'
                }`}
              >
                1
              </button>
              {pageNumbers[0] > 1 && (
                <span className="w-9 h-9 flex items-center justify-center text-on-surface-variant-weak font-label-mono-sm">…</span>
              )}
            </>
          )}
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-label-mono-sm text-label-mono-sm ${
                currentPage === page
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'border border-border-subtle bg-surface-card text-on-surface hover:bg-surface-canvas'
              }`}
            >
              {page + 1}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < pageCount - 1 && (
            <>
              {pageNumbers[pageNumbers.length - 1] < pageCount - 2 && (
                <span className="w-9 h-9 flex items-center justify-center text-on-surface-variant-weak font-label-mono-sm">…</span>
              )}
              <button
                onClick={() => onPageChange(pageCount - 1)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-label-mono-sm text-label-mono-sm ${
                  currentPage === pageCount - 1
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'border border-border-subtle bg-surface-card text-on-surface hover:bg-surface-canvas'
                }`}
              >
                {pageCount}
              </button>
            </>
          )}
        </>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.min(pageCount - 1, currentPage + 1))}
        disabled={currentPage === pageCount - 1}
        aria-label="Next page"
        rightIcon={<span className="material-symbols-outlined text-lg">chevron_right</span>}
      >
        <span className="sr-only">Next page</span>
      </Button>
    </nav>
  );
}

export interface PaginationInfoProps {
  currentPage: number; // 0-indexed
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className = '',
}: PaginationInfoProps) {
  const start = currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className={`font-body-sm text-body-sm text-on-surface-variant ${className}`}>
      Showing records <span className="font-semibold text-on-surface">{start}–{end}</span> of{' '}
      <span className="font-semibold text-on-surface">{totalItems}</span> verified submissions
    </div>
  );
}