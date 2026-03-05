import React, { useRef, useState } from 'react';
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
  directChangedIds?: string[];
  inheritedChangedIds?: string[];
  directCount?: number;
  inheritedCount?: number;
  changedFilePaths?: string[];
  preRenderedSvg?: string;
  onSvgGenerated?: (svg: string) => void;
}

import { DiagramStateBadge } from './DiagramStateBadge';
import { ChangeBadge } from './ChangeBadge';

export const DiagramPanel: React.FC<DiagramPanelProps> = ({
  content,
  metadata,
  changedFiles: _changedFiles = [],
  showChanges = false,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  onElementClick,
  isClickable = false,
  diagramState,
  diagramErrorMessage,
  onRegenerateFromBadge,
  directChangedIds = [],
  inheritedChangedIds = [],
  directCount = 0,
  inheritedCount = 0,
  changedFilePaths = [],
  preRenderedSvg,
  onSvgGenerated,
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
      {/* State and change badges in header (top-left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {diagramState && onRegenerateFromBadge && (
          <DiagramStateBadge
            state={diagramState}
            errorMessage={diagramErrorMessage}
            onRegenerate={onRegenerateFromBadge}
          />
        )}
        {diagramState === 'stale' && (
          <ChangeBadge
            directCount={directCount}
            inheritedCount={inheritedCount}
            changedFiles={changedFilePaths}
          />
        )}
      </div>

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

      <PlantUMLRenderer
        content={content}
        metadata={{
          tokensUsed: metadata.tokensUsed,
          generatedAt: metadata.generatedAt,
          diagramType: metadata.diagramType,
        }}
        className="h-full"
        onElementClick={onElementClick}
        isClickable={isClickable}
        directChangedIds={showChanges ? directChangedIds : []}
        inheritedChangedIds={showChanges ? inheritedChangedIds : []}
        preRenderedSvg={preRenderedSvg}
        onSvgGenerated={onSvgGenerated}
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