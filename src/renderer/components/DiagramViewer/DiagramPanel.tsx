import React, { useRef, useState, useEffect } from 'react';
import { PlantUMLRenderer } from '../PlantUMLRenderer';
import { Maximize2, Minimize2, Download, Copy, Info } from 'lucide-react';
import type { DiagramMetadata } from './DiagramViewer';

import type { DiagramState } from '@shared/types/diagramState';

interface DiagramPanelProps {
  content: string;
  metadata: DiagramMetadata;
  changedFiles?: string[];
  showChanges?: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: (format: 'svg' | 'png') => void;
  onElementClick?: (elementId: string) => void;
  isClickable?: boolean;
  diagramState?: DiagramState;
  diagramErrorMessage?: string;
  onRegenerateFromBadge?: () => void;
}

import { DiagramStateBadge } from './DiagramStateBadge';

export const DiagramPanel: React.FC<DiagramPanelProps> = ({
  content,
  metadata,
  changedFiles = [],
  showChanges = false,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  onElementClick,
  isClickable = false,
  diagramState,
  diagramErrorMessage,
  onRegenerateFromBadge,
}) => {
  const [highlightedContent, setHighlightedContent] = useState(content);
  const [showLegend, setShowLegend] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const highlightChangesInDiagram = () => {
      let modifiedContent = content;
      
      changedFiles.forEach(file => {
        const componentName = extractComponentName(file);
        if (componentName) {
          const highlightPattern = new RegExp(
            `(class|component|participant|entity|interface)\\s+(${componentName})`,
            'gi'
          );
          modifiedContent = modifiedContent.replace(
            highlightPattern,
            (_match, type, name) => `${type} ${name} #FFE4B5`
          );
        }
      });

      setHighlightedContent(modifiedContent);
    };

    if (showChanges && changedFiles.length > 0) {
      highlightChangesInDiagram();
    } else {
      setHighlightedContent(content);
    }
  }, [content, changedFiles, showChanges]);

  const extractComponentName = (filePath: string): string => {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
  };

  const handleCopyDiagram = () => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Diagram copied to clipboard');
    });
  };

  const handlePanZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  };

  return (
    <div 
      ref={panelRef}
      className="relative h-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
      onWheel={handlePanZoom}
    >
      {/* State Badge in header (top-left) */}
      {diagramState && onRegenerateFromBadge && (
        <div className="absolute top-4 left-4 z-10">
          <DiagramStateBadge
            state={diagramState}
            errorMessage={diagramErrorMessage}
            onRegenerate={onRegenerateFromBadge}
          />
        </div>
      )}

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-2 bg-gray-900/80 hover:bg-gray-900 rounded-lg transition-colors"
          title="Toggle Legend"
        >
          <Info className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={handleCopyDiagram}
          className="p-2 bg-gray-900/80 hover:bg-gray-900 rounded-lg transition-colors"
          title="Copy PlantUML Code"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={() => onExport('svg')}
          className="p-2 bg-gray-900/80 hover:bg-gray-900 rounded-lg transition-colors"
          title="Export as SVG"
        >
          <Download className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={onToggleFullscreen}
          className="p-2 bg-gray-900/80 hover:bg-gray-900 rounded-lg transition-colors"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F)'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-gray-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {showLegend && showChanges && (
        <div className="absolute top-16 right-4 z-10 bg-gray-900/90 rounded-lg p-3 border border-gray-700">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#FFE4B5] rounded" />
              <span className="text-xs text-gray-400">Changed Components</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600 rounded" />
              <span className="text-xs text-gray-400">Unchanged Components</span>
            </div>
          </div>
          {changedFiles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                {changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''} changed
              </p>
            </div>
          )}
        </div>
      )}

      <PlantUMLRenderer
        content={highlightedContent}
        metadata={{
          tokensUsed: metadata.tokensUsed,
          generatedAt: metadata.generatedAt,
          diagramType: metadata.diagramType,
        }}
        className="h-full"
        onElementClick={onElementClick}
        isClickable={isClickable}
      />

      {isFullscreen && (
        <div className="absolute bottom-4 left-4 bg-gray-900/80 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">Esc</kbd> to exit fullscreen
          </p>
        </div>
      )}
    </div>
  );
};