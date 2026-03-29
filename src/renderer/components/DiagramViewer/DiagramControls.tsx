import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

interface DiagramControlsProps {
  isGenerating: boolean;
  onRegenerate: () => void;
  showChanges: boolean;
  onToggleChanges: () => void;
  staleLevelCount?: number;
  showGenerateAll?: boolean;
  onGenerateAll?: () => void;
}

export const DiagramControls: React.FC<DiagramControlsProps> = ({
  isGenerating,
  onRegenerate,
  showChanges,
  onToggleChanges,
  staleLevelCount,
  showGenerateAll,
  onGenerateAll,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRegenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmRegenerate = () => {
    setShowConfirmDialog(false);
    onRegenerate();
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center gap-3">
        {showGenerateAll && onGenerateAll && (
          <button
            onClick={onGenerateAll}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
            title="Generate all 4 C4 diagram levels"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate All
              </>
            )}
          </button>
        )}

        <button
          onClick={handleRegenerateClick}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>

        <button
          onClick={onToggleChanges}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
        >
          {showChanges ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide Changes
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show Changes
            </>
          )}
        </button>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md border border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Regenerate Diagram?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {staleLevelCount && staleLevelCount > 0
                    ? `${staleLevelCount} diagram${staleLevelCount === 1 ? '' : 's'} outdated. Regeneration uses the AI API and may take a few moments.`
                    : 'This will regenerate the diagram using the AI API, overwriting the stored version. This may take a few moments.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Keep Current Diagram
              </button>
              <button
                onClick={confirmRegenerate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                Regenerate Diagram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
