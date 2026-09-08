import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="material-symbols-outlined text-[48px] text-[#CBD5E1] mb-3">{icon}</span>
      <h3 className="text-[16px] font-semibold text-[#0A2540] mb-1">{title}</h3>
      {description && <p className="text-[13px] text-[#64748B] max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
