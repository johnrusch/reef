import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface StalenessBadgeProps {
  isStale: boolean;
  isRegenerating: boolean;
  onClick: () => void;
}

export const StalenessBadge: React.FC<StalenessBadgeProps> = ({
  isStale,
  isRegenerating,
  onClick
}) => {
  // Hide badge when not stale and not regenerating
  if (!isStale && !isRegenerating) return null;

  return (
    <button
      onClick={onClick}
      disabled={isRegenerating}
      className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-yellow-600/90 hover:bg-yellow-600 disabled:hover:bg-yellow-600/90 rounded-lg transition-colors shadow-lg cursor-pointer disabled:cursor-not-allowed"
      title={isRegenerating ? 'Regenerating diagram...' : 'Diagram outdated - click to regenerate'}
    >
      {isRegenerating ? (
        <RefreshCw className="w-4 h-4 text-white animate-spin" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-white" />
      )}
      <span className="text-sm font-medium text-white">
        {isRegenerating ? 'Regenerating...' : 'Outdated'}
      </span>
    </button>
  );
};
