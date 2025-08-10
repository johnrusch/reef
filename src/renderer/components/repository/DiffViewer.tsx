import React, { useMemo, useState } from 'react';
import { X, Copy, FileText, Undo2, RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// Basic HTML entity escaping for security
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

interface DiffViewerProps {
  diff: string;
  fileName?: string;
  onClose?: () => void;
  onRevertLines?: (lineChanges: LineRevertData) => Promise<void>;
  repoPath?: string;
}

export interface LineRevertData {
  fileName: string;
  lines: Array<{
    type: 'add' | 'remove';
    content: string;
    lineNumber: number;
  }>;
  hunkHeader?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, fileName, onClose, onRevertLines }) => {
  const [confirmRevert, setConfirmRevert] = useState<{
    open: boolean;
    lines: any[];
    indices: number[];
    type: 'line' | 'hunk';
  }>({ open: false, lines: [], indices: [], type: 'line' });
  const parsedDiff = useMemo(() => {
    const lines = diff.split('\n');
    const result: Array<{
      type: 'header' | 'hunk' | 'add' | 'remove' | 'context';
      content: string;
      lineNumber?: { old?: number; new?: number };
      hunkIndex?: number;
      isPartOfModification?: boolean;
    }> = [];
    let currentHunkIndex = -1;

    let oldLineNum = 0;
    let newLineNum = 0;

    lines.forEach((line) => {
      if (line.startsWith('diff --git')) {
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('@@')) {
        currentHunkIndex++;
        result.push({ type: 'hunk', content: line, hunkIndex: currentHunkIndex });
        // Parse line numbers from hunk header
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10) || 1;
          newLineNum = parseInt(match[2], 10) || 1;
        } else {
          // Reset to defaults if parsing fails
          oldLineNum = 1;
          newLineNum = 1;
        }
      } else if (line.startsWith('+')) {
        result.push({
          type: 'add',
          content: line.substring(1),
          lineNumber: { new: newLineNum++ },
          hunkIndex: currentHunkIndex,
        });
      } else if (line.startsWith('-')) {
        result.push({
          type: 'remove',
          content: line.substring(1),
          lineNumber: { old: oldLineNum++ },
          hunkIndex: currentHunkIndex,
        });
      } else {
        result.push({
          type: 'context',
          content: line,
          lineNumber: { old: oldLineNum++, new: newLineNum++ },
          hunkIndex: currentHunkIndex,
        });
      }
    });

    // Post-process to identify modifications (adjacent remove+add pairs)
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].type === 'remove' && result[i + 1].type === 'add') {
        // This is likely a modification - mark the remove line
        result[i].isPartOfModification = true;
      }
    }

    return result;
  }, [diff]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
  };

  const handleRevertLine = (index: number, line: any) => {
    if (!onRevertLines || !fileName) return;
    
    // If this is an addition, check if there's a preceding removal (modification case)
    if (line.type === 'add' && index > 0 && parsedDiff[index - 1].type === 'remove') {
      // This is a modification - include both the remove and add
      setConfirmRevert({
        open: true,
        lines: [parsedDiff[index - 1], line],
        indices: [index - 1, index],
        type: 'line',
      });
    } else {
      // Single line change
      setConfirmRevert({
        open: true,
        lines: [line],
        indices: [index],
        type: 'line',
      });
    }
  };

  const handleRevertHunk = (hunkIndex: number) => {
    if (!onRevertLines || !fileName) return;
    const hunkLines = parsedDiff.filter(
      (line) => line.hunkIndex === hunkIndex && (line.type === 'add' || line.type === 'remove')
    );
    const indices = parsedDiff
      .map((line, idx) => (line.hunkIndex === hunkIndex && (line.type === 'add' || line.type === 'remove') ? idx : -1))
      .filter(idx => idx !== -1);
    
    if (hunkLines.length === 0) {
      console.warn('No changes to revert in this hunk');
      return;
    }
    
    setConfirmRevert({
      open: true,
      lines: hunkLines,
      indices,
      type: 'hunk',
    });
  };

  const confirmRevertAction = async () => {
    if (!onRevertLines || !fileName) {
      console.error('Missing onRevertLines handler or fileName');
      return;
    }
    
    const lineChanges: LineRevertData = {
      fileName: fileName,
      lines: confirmRevert.lines.map(line => ({
        type: line.type as 'add' | 'remove',
        content: line.content,
        lineNumber: line.type === 'add' ? line.lineNumber.new : line.lineNumber.old,
      })),
    };

    try {
      await onRevertLines(lineChanges);
      setConfirmRevert({ open: false, lines: [], indices: [], type: 'line' });
    } catch (error) {
      console.error('Failed to revert lines:', error);
    }
  };

  const getRevertDescription = () => {
    const { lines, type } = confirmRevert;
    if (type === 'hunk') {
      const addCount = lines.filter(l => l.type === 'add').length;
      const removeCount = lines.filter(l => l.type === 'remove').length;
      return `This will revert ${addCount} added line${addCount !== 1 ? 's' : ''} and restore ${removeCount} removed line${removeCount !== 1 ? 's' : ''} in this hunk.`;
    } else if (lines.length === 2 && lines[0].type === 'remove' && lines[1].type === 'add') {
      // This is a modification
      return 'This will revert this line modification, restoring the original version.';
    } else if (lines.length === 1) {
      const line = lines[0];
      if (line.type === 'add') {
        return 'This will remove the added line from the file.';
      } else {
        return 'This will restore the deleted line to the file.';
      }
    }
    return 'This will revert the selected changes.';
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
      <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 p-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">No changes to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden" style={{ contain: 'layout size' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-white font-medium truncate">
            {fileName || 'Diff View'}
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
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
      <div className="flex-1 overflow-auto min-h-0" style={{ width: '100%', contain: 'size' }}>
        <div className="w-full">
          {parsedDiff.map((line, index) => (
            <div
              key={index}
              className={`${getLineClassName(line.type)} ${
                line.type === 'header' || line.type === 'hunk' ? 'px-4 py-1' : ''
              } font-mono text-xs group relative`}
            >
              {line.type === 'hunk' && onRevertLines && (
                <button
                  onClick={() => handleRevertHunk(line.hunkIndex!)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white flex items-center space-x-1"
                  title="Revert entire hunk"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert Hunk</span>
                </button>
              )}
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
                  <div className="flex-1 overflow-x-auto relative">
                    <pre className="inline whitespace-pre">
                      <span className="select-none text-gray-600 pr-2">
                        {getLinePrefix(line.type)}
                      </span>
                      <span>{escapeHtml(line.content)}</span>
                    </pre>
                    {/* Revert button for additions and standalone deletions (not part of modifications) */}
                    {onRevertLines && (
                      (line.type === 'add') || 
                      (line.type === 'remove' && !line.isPartOfModification)
                    ) && (
                      <button
                        onClick={() => handleRevertLine(index, line)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-700 hover:bg-gray-600 rounded"
                        title={line.type === 'add' ? 'Revert this change' : 'Restore this deletion'}
                      >
                        <Undo2 className="w-3 h-3 text-gray-300 hover:text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre overflow-x-auto">{escapeHtml(line.content)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmRevert.open}
        onOpenChange={(open) => !open && setConfirmRevert({ ...confirmRevert, open: false })}
        title={confirmRevert.type === 'hunk' ? 'Revert Hunk?' : 'Revert Line Change?'}
        description={getRevertDescription()}
        confirmText="Revert"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmRevertAction}
      >
        <div className="font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
          {confirmRevert.lines.map((line, idx) => (
            <div
              key={idx}
              className={`${line.type === 'add' ? 'text-green-400' : 'text-red-400'}`}
            >
              <span className="text-gray-500 mr-2">
                {line.type === 'add' ? '+' : '-'}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      </ConfirmDialog>
    </div>
  );
};