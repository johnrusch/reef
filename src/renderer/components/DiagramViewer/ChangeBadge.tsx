import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ChangeBadgeProps {
  /** Count of directly changed elements at current level */
  directCount: number;
  /** Count of elements with changed children (inherited) */
  inheritedCount: number;
  /** File paths that changed (for tooltip display) */
  changedFiles: string[];
}

/**
 * ChangeBadge Component
 *
 * Displays a count badge showing how many diagram elements are directly changed
 * vs inherited (affected by child changes). On hover, a tooltip portal lists the
 * specific file paths that caused the changes.
 *
 * Uses position:fixed tooltip via ReactDOM.createPortal to escape the DiagramPanel's
 * overflow-hidden container.
 */
export const ChangeBadge: React.FC<ChangeBadgeProps> = ({
  directCount,
  inheritedCount,
  changedFiles,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  // Return null if no changes to display
  if (directCount + inheritedCount === 0) {
    return null;
  }

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const tooltipElement = (
    <div
      style={{
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        zIndex: 60,
      }}
      className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[320px]"
    >
      {changedFiles.length > 0 ? (
        <>
          <p className="text-xs text-gray-400 font-medium mb-2">
            {changedFiles.length} file(s) changed:
          </p>
          <ul className="space-y-0.5 max-h-48 overflow-y-auto">
            {changedFiles.map((file, index) => (
              <li
                key={index}
                className="text-xs text-gray-300 font-mono truncate"
                title={file}
              >
                {file.split('/').pop()}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-gray-500 italic">No file details available</p>
      )}
    </div>
  );

  return (
    <div
      ref={badgeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-md cursor-help">
        {directCount > 0 && (
          <span className="text-xs font-medium text-amber-300">
            {directCount} changed
          </span>
        )}
        {directCount > 0 && inheritedCount > 0 && (
          <span className="text-xs text-amber-500/70">·</span>
        )}
        {inheritedCount > 0 && (
          <span className="text-xs font-medium text-amber-400/70">
            {inheritedCount} affected
          </span>
        )}
      </div>
      {showTooltip && ReactDOM.createPortal(tooltipElement, document.body)}
    </div>
  );
};
