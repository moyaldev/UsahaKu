import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-[#E8EDF3] rounded-2xl shadow-[0_8px_28px_rgba(20,42,66,0.035)]">
      <div className="w-11 h-11 rounded-xl bg-[#E6F9F1] text-[#0B9B70] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-[#172B43]">{title}</h3>
      <p className="text-sm text-[#8190A3] max-w-md mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg shadow-[0_4px_10px_rgba(16,185,129,0.2)] transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
