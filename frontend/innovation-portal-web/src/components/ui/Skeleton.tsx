

export interface SkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(90deg, var(--color-surface-container-low) 25%, var(--color-surface-container) 37%, var(--color-surface-container-low) 63%)',
    backgroundSize: '400% 100%',
    animation: 'shimmer-sweep 1.6s ease infinite',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      height: height || '1rem',
      width: width || '100%',
      borderRadius: 'var(--radius-sm)',
    },
    card: {
      width: width || '100%',
      height: height || '12rem',
      borderRadius: 'var(--radius-xl)',
    },
    avatar: {
      width: width || '3rem',
      height: height || '3rem',
      borderRadius: '50%',
    },
    button: {
      width: width || '100%',
      height: height || '2.5rem',
      borderRadius: 'var(--radius-md)',
    },
    circular: {
      width: width || '3rem',
      height: height || '3rem',
      borderRadius: '50%',
    },
    rectangular: {
      width: width || '100%',
      height: height || '1rem',
      borderRadius: 'var(--radius-md)',
    },
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              ...baseStyle,
              ...variantStyles.text,
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        width,
        height,
      }}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card-interactive ${className}`}>
      <Skeleton variant="rectangular" height="120px" className="rounded-t-xl" />
      <div className="p-space-md space-y-space-sm">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" lines={3} />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width="80px" height="24px" />
          <Skeleton variant="rectangular" width="80px" height="24px" />
          <Skeleton variant="rectangular" width="80px" height="24px" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="p-space-md border-b border-border-subtle">
        <div className="flex gap-space-md">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width={i === 0 ? '120px' : '80px'} className="flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="p-space-md">
            <div className="flex gap-space-md">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} variant="text" width={i === 0 ? '140px' : '80px'} className="flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}