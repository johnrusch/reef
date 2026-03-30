import React, { useState, useEffect } from 'react';
import { Globe, Layers, Box, Code2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../../stores/navigationStore';

type C4Level = 'context' | 'container' | 'component' | 'code';

interface C4LevelConfig {
  level: C4Level;
  label: string;
  Icon: React.FC<{ className?: string }>;
}

const C4_LEVELS: C4LevelConfig[] = [
  { level: 'context', label: 'System Context', Icon: Globe },
  { level: 'container', label: 'Containers', Icon: Layers },
  { level: 'component', label: 'Components', Icon: Box },
  { level: 'code', label: 'Code', Icon: Code2 },
];

interface C4HierarchyTreeProps {
  onNavigate: (level: C4Level, elementId?: string) => void;
  disabled?: boolean;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  repoPath?: string;
}

export const C4HierarchyTree: React.FC<C4HierarchyTreeProps> = ({
  onNavigate,
  disabled = false,
  isCollapsed,
  onCollapseToggle,
  repoPath,
}) => {
  const stack = useNavigationStore(s => s.stack);
  const activeLevel = stack[stack.length - 1].level;

  const [elements, setElements] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingElements, setIsLoadingElements] = useState(false);
  const [elementLoadError, setElementLoadError] = useState(false);

  // Component/code levels need an elementId — only reachable via drill-down
  const isLevelReachable = (level: C4Level): boolean => {
    if (level === 'context' || level === 'container') return true;
    return stack.some(s => s.level === level);
  };

  const handleLevelClick = (level: C4Level) => {
    if (disabled || !isLevelReachable(level)) return;
    onNavigate(level);
  };

  // Find element name for a given level from the navigation stack
  const getStackElementName = (level: C4Level): string | undefined => {
    const entry = stack.find(s => s.level === level);
    return entry?.elementId ? entry.elementName : undefined;
  };

  // Load elements when active level or repo changes
  useEffect(() => {
    if (!repoPath || isCollapsed) {
      setElements([]);
      return;
    }

    // Only context and container levels have drillable children
    if (activeLevel !== 'context' && activeLevel !== 'container') {
      setElements([]);
      return;
    }

    // Get the elementId for nested levels (component/code)
    const currentEntry = stack.find(s => s.level === activeLevel);
    const elementId = currentEntry?.elementId;

    setIsLoadingElements(true);
    setElementLoadError(false);

    window.reef.c4Storage.getElements(repoPath, activeLevel, elementId)
      .then((result: Array<{id: string, name: string}>) => {
        setElements(result);
        setIsLoadingElements(false);
      })
      .catch(() => {
        setElements([]);
        setElementLoadError(true);
        setIsLoadingElements(false);
      });
  }, [activeLevel, repoPath, isCollapsed, stack]);

  if (isCollapsed) {
    return (
      <aside className="w-10 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col items-center pt-2 gap-1">
        <button
          onClick={onCollapseToggle}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {C4_LEVELS.map(({ level, label, Icon }) => {
          const isActive = activeLevel === level;
          const reachable = isLevelReachable(level);
          return (
            <button
              key={level}
              onClick={() => handleLevelClick(level)}
              disabled={disabled || !reachable}
              className={`p-1.5 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300'
                  : reachable
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    : 'text-gray-600 cursor-default'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : reachable ? 'cursor-pointer' : ''}`}
              title={reachable ? label : `${label} (drill into a diagram element to reach this level)`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className="h-full bg-gray-850 border-r border-gray-700 flex flex-col">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          C4 Levels
        </span>
        <button
          onClick={onCollapseToggle}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Level list */}
      <nav className="flex flex-col py-2">
        {C4_LEVELS.map(({ level, label, Icon }, index) => {
          const isActive = activeLevel === level;
          const reachable = isLevelReachable(level);
          const elementName = getStackElementName(level);

          return (
            <React.Fragment key={level}>
              <button
                onClick={() => handleLevelClick(level)}
                disabled={disabled || !reachable}
                style={{ paddingLeft: `${12 + index * 12}px` }}
                className={`flex items-center gap-2 pr-3 py-2 text-sm text-left w-full transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 font-medium border-l-2 border-blue-500'
                    : reachable
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      : 'text-gray-600 cursor-default'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : reachable ? 'cursor-pointer' : ''}`}
                title={!reachable ? 'Drill into a diagram element to reach this level' : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
                {elementName && (
                  <span className="truncate text-xs text-gray-500 ml-1">
                    ({elementName})
                  </span>
                )}
              </button>

              {/* Element tree under active level (SIDE-03, D-07, D-08, D-09, D-10) */}
              {isActive && !isCollapsed && activeLevel === level && (
                <div className="flex flex-col">
                  {isLoadingElements && (
                    <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${12 + (index + 1) * 12}px` }}>
                      <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                    </div>
                  )}
                  {!isLoadingElements && elementLoadError && (
                    <div className="py-1 text-gray-600 text-xs italic" style={{ paddingLeft: `${12 + (index + 1) * 12}px` }}>
                      Could not load elements
                    </div>
                  )}
                  {!isLoadingElements && !elementLoadError && elements.length === 0 && (
                    <div className="py-1 text-gray-600 text-xs italic" style={{ paddingLeft: `${12 + (index + 1) * 12}px` }}>
                      No elements cached
                    </div>
                  )}
                  {!isLoadingElements && elements.map(el => (
                    <button
                      key={el.id}
                      onClick={() => onNavigate(level, el.id)}
                      disabled={disabled}
                      className="flex items-center gap-2 pr-3 py-2 text-sm text-left w-full text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors cursor-pointer"
                      style={{ paddingLeft: `${12 + (index + 1) * 12}px` }}
                      title={el.name}
                    >
                      <span className="truncate">{el.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};
