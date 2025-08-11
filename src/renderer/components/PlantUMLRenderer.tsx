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
}

export const PlantUMLRenderer: React.FC<PlantUMLRendererProps> = ({
  content,
  metadata,
  className = '',
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [useLocalGeneration, setUseLocalGeneration] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
          }
        } catch (error) {
          console.error('Local PlantUML generation failed:', error);
          setUseLocalGeneration(false);
        }
      }

      // Fallback to server-based rendering
      const encoded = plantumlEncoder.encode(content);
      
      // Check for configured server
      let serverUrl = localStorage.getItem('plantUmlServerUrl');
      
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

    } catch (err) {
      console.error('Error generating PlantUML diagram:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate diagram');
      setLoading(false);
    }
  }, [content, useLocalGeneration]);

  useEffect(() => {
    generateDiagram();
  }, [generateDiagram]);

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
    localStorage.setItem('plantUmlServerUrl', 'https://www.plantuml.com/plantuml');
    setUseLocalGeneration(false);
    generateDiagram();
  };

  const installJava = () => {
    window.open('https://www.java.com/download/', '_blank');
  };

  return (
    <div className={`plantuml-renderer flex flex-col h-full ${className}`}>
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
            className="diagram-wrapper p-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease',
              minHeight: '100%',
              minWidth: '100%',
            }}
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