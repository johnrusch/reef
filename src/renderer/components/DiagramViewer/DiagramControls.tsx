import React, { useState } from 'react';
import { RefreshCw, Sliders, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { DiagramType, DetailLevel, FocusArea } from './DiagramViewer';

interface DiagramControlsProps {
  currentType: DiagramType;
  currentDetailLevel: DetailLevel;
  currentFocusArea?: FocusArea;
  showChanges?: boolean;
  isGenerating: boolean;
  hasChangedFiles: boolean;
  onTypeChange: (type: DiagramType) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  onFocusAreaChange: (area: FocusArea | undefined) => void;
  onShowChangesToggle?: (enabled: boolean) => void;
  onRegenerate: () => void;
  onForceRegenerate?: () => void;
}

export const DiagramControls: React.FC<DiagramControlsProps> = ({
  currentType,
  currentDetailLevel,
  currentFocusArea,
  showChanges = false,
  isGenerating,
  hasChangedFiles,
  onTypeChange,
  onDetailLevelChange,
  onFocusAreaChange,
  onShowChangesToggle,
  onRegenerate,
  onForceRegenerate,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRegenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmRegenerate = () => {
    setShowConfirmDialog(false);
    onRegenerate();
  };

  const diagramTypes: { value: DiagramType; label: string; description: string }[] = [
    { value: 'component', label: 'Component', description: 'High-level component relationships' },
    { value: 'class', label: 'Class', description: 'Detailed class structures' },
    { value: 'sequence', label: 'Sequence', description: 'Interaction flow diagrams' },
  ];

  const detailLevels: { value: DetailLevel; label: string; description: string }[] = [
    { value: 'overview', label: 'Overview', description: 'Basic structure' },
    { value: 'architectural', label: 'Architectural', description: 'Key components & flows' },
    { value: 'detailed', label: 'Detailed', description: 'Complete implementation' },
  ];

  const focusAreas: { value: FocusArea | undefined; label: string; icon: string }[] = [
    { value: undefined, label: 'All Areas', icon: '🎯' },
    { value: 'api', label: 'API', icon: '🔌' },
    { value: 'database', label: 'Database', icon: '💾' },
    { value: 'business-logic', label: 'Business Logic', icon: '⚙️' },
    { value: 'auth', label: 'Authentication', icon: '🔐' },
  ];

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Diagram Type
            </label>
            <div className="flex gap-1">
              {diagramTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => onTypeChange(type.value)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    currentType === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                  title={type.description}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Detail Level
            </label>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min="0"
                max="2"
                value={detailLevels.findIndex(l => l.value === currentDetailLevel)}
                onChange={(e) => {
                  const level = detailLevels[parseInt(e.target.value)];
                  onDetailLevelChange(level.value);
                }}
                className="w-32 accent-blue-600"
              />
              <span className="text-sm text-gray-400 w-24">
                {detailLevels.find(l => l.value === currentDetailLevel)?.label}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Focus Area
            </label>
            <div className="flex gap-1">
              {focusAreas.map(area => (
                <label
                  key={area.value || 'none'}
                  className="flex items-center gap-1"
                >
                  <input
                    type="checkbox"
                    checked={currentFocusArea === area.value}
                    onChange={() => onFocusAreaChange(
                      currentFocusArea === area.value ? undefined : area.value
                    )}
                    className="sr-only"
                  />
                  <button
                    onClick={() => onFocusAreaChange(
                      currentFocusArea === area.value ? undefined : area.value
                    )}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      currentFocusArea === area.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title={area.label}
                  >
                    <span className="mr-1">{area.icon}</span>
                    {area.label}
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChangedFiles && onShowChangesToggle && (
            <button
              onClick={() => onShowChangesToggle(!showChanges)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                showChanges
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Highlight changed components"
            >
              {showChanges ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Show Changes
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

          {onForceRegenerate && (
            <button
              onClick={onForceRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
              title="Force regenerate diagram (ignore cache)"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Force Regenerate
            </button>
          )}
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md border border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Regenerate Diagram?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  This will create a new diagram with your current settings. The process may take a few moments.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegenerate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};