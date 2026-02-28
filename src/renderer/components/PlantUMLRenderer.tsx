import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import plantumlEncoder from 'plantuml-encoder';

interface PlantUMLRendererProps {
  content: string;
  metadata?: {
    tokensUsed?: {
      input: number;
      output: number;
    };
    generatedAt?: string;
    diagramType?: string;
  };
  className?: string;
  onElementClick?: (elementId: string) => void;  // Add this
  isClickable?: boolean;  // Add this - controls whether click detection is active
  directChangedIds?: string[];
  inheritedChangedIds?: string[];
}

/**
 * Applies change highlighting to SVG DOM elements.
 * Exported for unit testing.
 *
 * @param container - The diagram-wrapper element containing the SVG
 * @param directIds - Element IDs for directly changed elements (amber fill)
 * @param inheritedIds - Element IDs for inherited change elements (dashed amber border)
 */
export function applyChangeHighlighting(
  container: Element,
  directIds: string[],
  inheritedIds: string[]
): void {
  // Remove existing reef change style block
  container.querySelector('style[data-reef-changes]')?.remove();

  // Reset all previously set data-changed attributes
  const allHighlighted = container.querySelectorAll('[data-changed]');
  allHighlighted.forEach(el => el.removeAttribute('data-changed'));

  // Apply direct changes
  for (const elementId of directIds) {
    const group = container.querySelector(`[id="elem_${elementId}"]`);
    if (group) group.setAttribute('data-changed', 'direct');
  }

  // Apply inherited changes
  for (const elementId of inheritedIds) {
    const group = container.querySelector(`[id="elem_${elementId}"]`);
    if (group) group.setAttribute('data-changed', 'inherited');
  }

  // Inject amber styling into SVG
  const svgEl = container.querySelector('svg');
  if (svgEl) {
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.setAttribute('data-reef-changes', '');
    styleEl.textContent = `
      [data-changed="direct"] rect,
      [data-changed="direct"] polygon {
        fill: rgba(251, 191, 36, 0.25) !important;
        stroke: rgb(245, 158, 11) !important;
        stroke-width: 2 !important;
      }
      [data-changed="inherited"] rect,
      [data-changed="inherited"] polygon {
        stroke: rgb(245, 158, 11) !important;
        stroke-width: 2 !important;
        stroke-dasharray: 4 2 !important;
      }
    `;
    svgEl.prepend(styleEl);
  }
}

export const PlantUMLRenderer: React.FC<PlantUMLRendererProps> = ({
  content,
  metadata,
  className = '',
  onElementClick,
  isClickable = false,
  directChangedIds = [],
  inheritedChangedIds = [],
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [useLocalGeneration, setUseLocalGeneration] = useState<boolean>(true);
  const [fallbackNotification, setFallbackNotification] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only process if click detection is enabled and callback provided
    if (!onElementClick || !isClickable) return;

    const target = event.target as SVGElement;

    // Traverse up DOM tree to find element with ID
    // PlantUML generates elements like <g id="elem_reef_main">
    // Or directly on shapes like <rect id="reef_main">
    let element: Element | null = target;
    let elementId: string | null = null;

    while (element && element !== event.currentTarget) {
      // Check for ID attribute
      const id = element.getAttribute('id');

      if (id) {
        // Skip SVG root and internal PlantUML IDs
        if (id === 'svg_root' || id.startsWith('_')) {
          element = element.parentElement;
          continue;
        }

        // PlantUML wraps elements in groups with "elem_" prefix
        if (id.startsWith('elem_')) {
          elementId = id.replace('elem_', '');
          break;
        }

        // Direct element ID (for some diagram types)
        elementId = id;
        break;
      }

      element = element.parentElement;
    }

    if (elementId) {
      console.log('Clicked element:', elementId);
      onElementClick(elementId);
    }
  }, [onElementClick, isClickable]);

  const generateDiagram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setZoom(1);

      if (!content || !content.includes('@startuml')) {
        throw new Error('Invalid PlantUML content');
      }

      // Try local generation first (requires Java)
      if (useLocalGeneration) {
        try {
          const hasJava = await window.reef.plantuml.checkJava();
          if (hasJava) {
            const svg = await window.reef.plantuml.generateSVG(content);
            setSvgContent(svg);
            setLoading(false);
            return;
          } else {
            console.log('Java not installed, falling back to server mode');
            setUseLocalGeneration(false);
            // Notify user about fallback
            setFallbackNotification('⚠️ Java not detected - attempting server-based rendering');
            console.warn('⚠️ Java not detected - falling back to server-based rendering');
          }
        } catch (error) {
          console.error('Local PlantUML generation failed:', error);
          setUseLocalGeneration(false);
          setFallbackNotification('⚠️ Local generation failed - attempting server-based rendering');
          console.warn('⚠️ Local generation failed - falling back to server-based rendering');
        }
      }

      // Fallback to server-based rendering
      const encoded = plantumlEncoder.encode(content);
      
      // Check for configured server - try secure storage first, fallback to localStorage
      let serverUrl = localStorage.getItem('plantUmlServerUrl');
      
      // Try to get from secure storage if not in localStorage
      if (!serverUrl) {
        try {
          const settings = await window.reef.diagramSettings.get();
          serverUrl = settings.plantUmlServerUrl;
        } catch (error) {
          console.error('Failed to load diagram settings:', error);
        }
      }
      
      if (!serverUrl) {
        setError(
          'PlantUML rendering requires either:\n' +
          '1. Java installed for local rendering (recommended)\n' +
          '2. Configure a PlantUML server in settings\n' +
          '3. Use the public server (less secure)'
        );
        setLoading(false);
        return;
      }

      // Generate URL for server-based rendering
      const url = `${serverUrl}/svg/${encoded}`;
      
      // Fetch the SVG from the server
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch diagram: ${response.statusText}`);
      }
      
      const svg = await response.text();
      setSvgContent(svg);
      setLoading(false);
      
      // Clear fallback notification on successful server rendering
      if (fallbackNotification) {
        setTimeout(() => setFallbackNotification(null), 5000);
      }

    } catch (err) {
      console.error('Error generating PlantUML diagram:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate diagram');
      setLoading(false);
    }
  }, [content, useLocalGeneration, fallbackNotification]);

  useEffect(() => {
    generateDiagram();
  }, [generateDiagram]);

  // Apply SVG DOM change highlighting after SVG content is rendered
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const wrapper = containerRef.current.querySelector('.diagram-wrapper');
    if (!wrapper) return;

    applyChangeHighlighting(wrapper, directChangedIds, inheritedChangedIds);
  }, [svgContent, directChangedIds, inheritedChangedIds]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  };

  const downloadDiagram = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyPlantUMLCode = () => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('PlantUML code copied to clipboard');
    });
  };

  const usePublicServer = () => {
    const confirmed = window.confirm(
      '⚠️ Security Warning\n\n' +
      'Using the public PlantUML server will send your diagram data to plantuml.com.\n\n' +
      'This may expose your code architecture to third parties.\n\n' +
      'Are you sure you want to continue?'
    );
    
    if (confirmed) {
      localStorage.setItem('plantUmlServerUrl', 'https://www.plantuml.com/plantuml');
      setUseLocalGeneration(false);
      generateDiagram();
    }
  };

  const installJava = () => {
    window.open('https://www.java.com/download/', '_blank');
  };

  return (
    <div className={`plantuml-renderer flex flex-col h-full ${className}`}>
      {fallbackNotification && (
        <div className="notification-bar px-3 py-2 bg-yellow-600/20 border-b border-yellow-600/30 flex items-center justify-between">
          <span className="text-xs text-yellow-400">{fallbackNotification}</span>
          <button
            onClick={() => setFallbackNotification(null)}
            className="text-yellow-400 hover:text-yellow-300 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="toolbar flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 ml-2">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          {metadata?.tokensUsed && (
            <span className="text-xs text-gray-400">
              Tokens: {metadata.tokensUsed.input} / {metadata.tokensUsed.output}
            </span>
          )}
          <button
            onClick={copyPlantUMLCode}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Copy Code
          </button>
          <button
            onClick={downloadDiagram}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            disabled={!svgContent || loading || !!error}
          >
            Download SVG
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="diagram-container flex-1 overflow-auto bg-white relative"
        style={{ backgroundColor: '#f8f9fa' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm text-gray-300">Generating diagram...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 p-4 max-w-md">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="text-sm text-red-400 whitespace-pre-line text-center">{error}</span>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={generateDiagram}
                  className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
                {error.includes('Java') && (
                  <button
                    onClick={installJava}
                    className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    Install Java
                  </button>
                )}
                {error.includes('Configure') && (
                  <button
                    onClick={usePublicServer}
                    className="px-3 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-700 transition-colors"
                  >
                    Use Public Server
                  </button>
                )}
              </div>
              {error.includes('Configure') && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Note: Using the public server will send your diagram data to plantuml.com
                </p>
              )}
            </div>
          </div>
        )}

        {svgContent && !error && (
          <div
            className={`diagram-wrapper p-8 ${isClickable ? 'clickable' : ''}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease',
              minHeight: '100%',
              minWidth: '100%',
              cursor: isClickable ? 'default' : undefined,  // Let CSS handle per-element
            }}
            onClick={handleSvgClick}
            data-clickable={isClickable}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {metadata?.generatedAt && (
        <div className="status-bar px-2 py-1 border-t border-gray-700 bg-gray-800">
          <span className="text-xs text-gray-400">
            Generated: {new Date(metadata.generatedAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};