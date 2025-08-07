import React, { useMemo } from 'react';
import { X, Copy, FileText } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  fileName?: string;
  onClose?: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, fileName, onClose }) => {
  const parsedDiff = useMemo(() => {
    const lines = diff.split('\n');
    const result: Array<{
      type: 'header' | 'hunk' | 'add' | 'remove' | 'context';
      content: string;
      lineNumber?: { old?: number; new?: number };
    }> = [];

    let oldLineNum = 0;
    let newLineNum = 0;

    lines.forEach((line) => {
      if (line.startsWith('diff --git')) {
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('@@')) {
        result.push({ type: 'hunk', content: line });
        // Parse line numbers from hunk header
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10);
          newLineNum = parseInt(match[2], 10);
        }
      } else if (line.startsWith('+')) {
        result.push({
          type: 'add',
          content: line.substring(1),
          lineNumber: { new: newLineNum++ },
        });
      } else if (line.startsWith('-')) {
        result.push({
          type: 'remove',
          content: line.substring(1),
          lineNumber: { old: oldLineNum++ },
        });
      } else {
        result.push({
          type: 'context',
          content: line,
          lineNumber: { old: oldLineNum++, new: newLineNum++ },
        });
      }
    });

    return result;
  }, [diff]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
  };

  const getLineClassName = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-900/20 text-green-300';
      case 'remove':
        return 'bg-red-900/20 text-red-300';
      case 'hunk':
        return 'bg-blue-900/20 text-blue-300';
      case 'header':
        return 'bg-gray-800 text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'add':
        return '+';
      case 'remove':
        return '-';
      default:
        return ' ';
    }
  };

  if (!diff) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-500">No changes to display</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-white font-medium">
            {fileName || 'Diff View'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Copy diff"
          >
            <Copy className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-x-auto">
        <pre className="text-xs font-mono">
          {parsedDiff.map((line, index) => (
            <div
              key={index}
              className={`${getLineClassName(line.type)} ${
                line.type === 'header' || line.type === 'hunk' ? 'px-4 py-1' : ''
              }`}
            >
              {line.type !== 'header' && line.type !== 'hunk' ? (
                <div className="flex">
                  {/* Line Numbers */}
                  <div className="flex-shrink-0 w-20 text-gray-600 select-none">
                    <span className="inline-block w-10 text-right pr-2">
                      {line.lineNumber?.old || ''}
                    </span>
                    <span className="inline-block w-10 text-right pr-2">
                      {line.lineNumber?.new || ''}
                    </span>
                  </div>
                  {/* Line Content */}
                  <div className="flex-1">
                    <span className="select-none text-gray-600 pr-2">
                      {getLinePrefix(line.type)}
                    </span>
                    <span>{line.content}</span>
                  </div>
                </div>
              ) : (
                <div>{line.content}</div>
              )}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};