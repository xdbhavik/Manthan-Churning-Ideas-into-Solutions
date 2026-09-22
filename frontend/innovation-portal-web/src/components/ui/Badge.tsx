import { type ReactNode } from 'react';

export type BadgeVariant =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'returned'
  | 'accepted'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'error';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  draft: {
    bg: 'bg-state-draft-bg',
    text: 'text-state-draft-text',
    border: 'border-state-draft-border',
  },
  submitted: {
    bg: 'bg-state-submitted-bg',
    text: 'text-state-submitted-text',
    border: 'border-state-submitted-border',
  },
  review: {
    bg: 'bg-state-review-bg',
    text: 'text-state-review-text',
    border: 'border-state-review-border',
  },
  returned: {
    bg: 'bg-state-returned-bg',
    text: 'text-state-returned-text',
    border: 'border-state-returned-border',
  },
  accepted: {
    bg: 'bg-state-accepted-bg',
    text: 'text-state-accepted-text',
    border: 'border-state-accepted-border',
  },
  neutral: {
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    border: 'border-border-subtle',
  },
  primary: {
    bg: 'bg-primary-fixed',
    text: 'text-on-primary-fixed-variant',
    border: 'border-primary-fixed-dim',
  },
  secondary: {
    bg: 'bg-secondary-fixed',
    text: 'text-on-secondary-fixed-variant',
    border: 'border-secondary-fixed-dim',
  },
  error: {
    bg: 'bg-error-container',
    text: 'text-error',
    border: 'border-error',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-5 px-2 text-label-mono-sm',
  md: 'h-6 px-2.5 text-label-mono-md',
};

export function Badge({ variant, size = 'sm', children, dot = true, className = '' }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${styles.bg} ${styles.text} border ${styles.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: `var(--color-${variant === 'neutral' ? 'on-surface-variant' : variant === 'primary' ? 'on-primary-fixed-variant' : variant === 'secondary' ? 'on-secondary-fixed-variant' : variant === 'error' ? 'error' : `${variant}-text`})` }} />}
      {children}
    </span>
  );
}

export interface StatusBadgeProps {
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED' | 'ACCEPTED';
  size?: BadgeSize;
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const variantMap: Record<StatusBadgeProps['status'], BadgeVariant> = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'review',
    RETURNED: 'returned',
    ACCEPTED: 'accepted',
  };

  const labelMap: Record<StatusBadgeProps['status'], string> = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'UNDER REVIEW',
    RETURNED: 'RETURNED',
    ACCEPTED: 'ACCEPTED',
  };

  return <Badge variant={variantMap[status]} size={size} className={className}>{labelMap[status]}</Badge>;
}