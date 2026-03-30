import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { NavigationLevel } from '../../stores/navigationStore';

interface DiagramBreadcrumbsProps {
  stack: NavigationLevel[];
  onNavigate: (index: number) => void;
  disabled?: boolean;
}

export const DiagramBreadcrumbs: React.FC<DiagramBreadcrumbsProps> = ({
  stack,
  onNavigate,
  disabled = false
}) => {
  return (
    <nav
      aria-label="C4 diagram breadcrumb"
      className={`px-4 py-2 bg-gray-800/90 border-b border-gray-700/50 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <ol className="flex items-center gap-1 list-none">
        {stack.map((level, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-gray-500 mx-1" aria-hidden="true" />
            )}
            {index < stack.length - 1 ? (
              <button
                onClick={() => onNavigate(index)}
                className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                type="button"
              >
                {level.elementName}
                <span className="text-xs text-gray-500 opacity-75 ml-1">({level.level})</span>
              </button>
            ) : (
              <span
                aria-current="page"
                className="text-gray-200 font-medium text-sm"
              >
                {level.elementName}
                <span className="text-xs text-gray-500 opacity-75 ml-1">({level.level})</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
