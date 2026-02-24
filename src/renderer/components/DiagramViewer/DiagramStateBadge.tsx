import React from 'react';
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react';
import type { DiagramState } from '@shared/types/diagramState';

interface DiagramStateBadgeProps {
  /** Current diagram state */
  state: DiagramState;
  /** Error message (shown in tooltip for error state) */
  errorMessage?: string;
  /** Callback to regenerate diagram (called for stale/error states) */
  onRegenerate: () => void;
}

/**
 * Diagram State Badge Component
 *
 * Displays state icons in diagram header with contextual actions:
 * - Fresh: Green checkmark (up to date)
 * - Stale: Amber clock (clickable to regenerate)
 * - Generating: Blue spinner (loading)
 * - Error: Red warning (clickable to retry, shows error in tooltip)
 * - Never generated: Returns null (GeneratePromptCard handles this state)
 */
export const DiagramStateBadge: React.FC<DiagramStateBadgeProps> = ({
  state,
  errorMessage,
  onRegenerate,
}) => {
  const renderBadge = () => {
    switch (state) {
      case 'never_generated':
        // GeneratePromptCard handles this state with centered prompt
        return null;

      case 'generating':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-md">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm text-blue-300">Generating...</span>
          </div>
        );

      case 'fresh':
        return (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-md hover:bg-green-500/30 transition-colors"
            title="Up to date"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">Up to date</span>
          </button>
        );

      case 'stale':
        return (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-md hover:bg-amber-500/30 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Outdated - Click to regenerate</span>
          </button>
        );

      case 'error':
        return (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-md hover:bg-red-500/30 transition-colors"
            title={errorMessage || 'An error occurred'}
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">Failed to load - Click to retry</span>
          </button>
        );
    }
  };

  return <>{renderBadge()}</>;
};
