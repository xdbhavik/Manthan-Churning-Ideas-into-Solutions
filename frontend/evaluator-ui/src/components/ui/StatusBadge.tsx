
type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' | 'indigo';

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  amber: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  red: 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]',
  gray: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
  purple: 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  indigo: 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]',
};

function getVariantForStatus(status: string): BadgeVariant {
  switch (status) {
    // Assignment statuses
    case 'ASSIGNED': return 'blue';
    case 'IN_PROGRESS': return 'indigo';
    case 'SUBMITTED': return 'green';
    case 'DECLINED': return 'red';
    case 'EXPIRED': return 'gray';
    case 'REVIEWED': return 'purple';
    // Cycle statuses
    case 'RECEIVED': return 'gray';
    case 'ANALYZING': return 'amber';
    case 'ROUTING': return 'amber';
    case 'EVALUATION_IN_PROGRESS': return 'indigo';
    case 'EVALUATION_COMPLETED': return 'blue';
    case 'SCORES_AGGREGATED': return 'blue';
    case 'PRIORITIZED': return 'purple';
    case 'PHASE_3_READY': return 'green';
    case 'ANALYSIS_FAILED': return 'red';
    // Project review statuses
    case 'ACCEPTED': return 'green';
    case 'RETURNED': return 'amber';
    // Generic
    case 'SUCCESS': return 'green';
    case 'FAILED': return 'red';
    case 'HEURISTIC_FALLBACK': return 'amber';
    default: return 'gray';
  }
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: BadgeVariant;
}

export default function StatusBadge({ status, label, variant }: StatusBadgeProps) {
  const v = variant ?? getVariantForStatus(status);
  return (
    <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ' + variantClasses[v]}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
