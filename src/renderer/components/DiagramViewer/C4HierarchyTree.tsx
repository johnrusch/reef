import React, { useState } from 'react';
import { Globe, Layers, Box, Code2, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

export const C4HierarchyTree: React.FC<C4HierarchyTreeProps> = ({
  onNavigate,
  disabled = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { stack, currentLevel } = useNavigationStore();
  const activeLevel = currentLevel().level;

  const handleLevelClick = (level: C4Level) => {
    if (disabled) return;
    onNavigate(level);
  };

  // Find element name for a given level from the navigation stack
  const getStackElementName = (level: C4Level): string | undefined => {
    const entry = stack.find(s => s.level === level);
    return entry?.elementId ? entry.elementName : undefined;
  };

  if (isCollapsed) {
    return (
      <aside className="w-10 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col items-center pt-2 gap-1">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {C4_LEVELS.map(({ level, label, Icon }) => {
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              onClick={() => handleLevelClick(level)}
              disabled={disabled}
              className={`p-1.5 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className="w-56 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          C4 Levels
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
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
          const elementName = getStackElementName(level);

          return (
            <button
              key={level}
              onClick={() => handleLevelClick(level)}
              disabled={disabled}
              style={{ paddingLeft: `${12 + index * 12}px` }}
              className={`flex items-center gap-2 pr-3 py-2 text-sm text-left w-full transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {elementName && (
                <span className="truncate text-xs text-gray-500 ml-1">
                  ({elementName})
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
