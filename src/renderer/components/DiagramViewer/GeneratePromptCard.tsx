import React from 'react';
import { GitBranch, Loader2, Sparkles } from 'lucide-react';

interface GeneratePromptCardProps {
  /** Repository name to display in prompt */
  repoName: string;
  /** Callback to start diagram generation */
  onGenerate: () => void;
  /** Whether generation is currently in progress */
  isGenerating?: boolean;
}

/**
 * Generate Prompt Card Component
 *
 * Displays an inviting prompt for the "never generated" state.
 * Centered card with architecture icon, friendly message, and generate button.
 * Uses blue accent colors (not red/yellow) to feel inviting, not like an error.
 */
export const GeneratePromptCard: React.FC<GeneratePromptCardProps> = ({
  repoName,
  onGenerate,
  isGenerating = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
          <GitBranch className="w-8 h-8 text-blue-400" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-gray-100">
          No C4 Diagrams Yet
        </h2>

        {/* Description */}
        <p className="text-gray-400">
          Generate C4 architecture diagrams to visualize the structure of{' '}
          <span className="text-gray-200 font-medium">{repoName}</span>.
          Deeper levels (Components, Code) are generated when you drill into specific elements.
        </p>

        {/* Action button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Diagrams
            </>
          )}
        </button>

        {/* Optional: subtle note about generation */}
        <p className="text-xs text-gray-500">
          Creates System Context and Container diagrams via AI analysis.
        </p>
      </div>
    </div>
  );
};
