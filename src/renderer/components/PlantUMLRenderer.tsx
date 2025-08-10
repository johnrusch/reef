import React, { useEffect, useState, useRef, useCallback } from 'react';
import plantumlEncoder from 'plantuml-encoder';
import { AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const generateDiagramUrl = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      if (!content || !content.includes('@startuml')) {
        throw new Error('Invalid PlantUML content');
      }

      const encoded = plantumlEncoder.encode(content);
      // Use local server if configured, otherwise use self-hosted or public server
      // Users should set PLANTUML_SERVER_URL to their own server for security
      const serverUrl = localStorage.getItem('plantUmlServerUrl') || 
                       process.env.PLANTUML_SERVER_URL || 
                       'https://www.plantuml.com/plantuml';
      
      // Validate server URL to prevent injection attacks
      try {
        const urlObj = new URL(serverUrl);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          throw new Error('Invalid PlantUML server protocol');
        }
      } catch {
        throw new Error('Invalid PlantUML server URL');
      }
      
      const url = `${serverUrl}/svg/${encoded}`;
      
      setImageUrl(url);
    } catch (err) {
      console.error('Error generating PlantUML diagram:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate diagram');
      setLoading(false);
    }
  }, [content]);

  useEffect(() => {
    generateDiagramUrl();
  }, [generateDiagramUrl]);

  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setLoading(false);
    setImageUrl(''); // Clear the image URL on error
    setError('Failed to load diagram. The PlantUML server may be unavailable.');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    if (containerRef.current && imageRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  };

  const downloadDiagram = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
  };

  const copyPlantUMLCode = () => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('PlantUML code copied to clipboard');
    });
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
            disabled={!imageUrl || loading || !!error}
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
            <div className="flex flex-col items-center gap-2 p-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="text-sm text-red-400">{error}</span>
              <button
                onClick={generateDiagramUrl}
                className="mt-2 px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {imageUrl && !error && (
          <div
            className="diagram-wrapper p-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease',
              minHeight: '100%',
              minWidth: '100%',
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="PlantUML Diagram"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="max-w-none"
              style={{ display: loading ? 'none' : 'block' }}
            />
          </div>
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