import React, { useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { Search, FileCode, Box, Boxes, Code } from 'lucide-react';
import { useNavigationStore, DiagramSearchItem } from '../../stores/navigationStore';
import { useFuzzySearch } from '../../hooks/useFuzzySearch';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (item: DiagramSearchItem) => void;
}

const levelIcons = {
  context: FileCode,
  container: Box,
  component: Boxes,
  code: Code,
};

const levelColors = {
  context: 'text-blue-400',
  container: 'text-green-400',
  component: 'text-yellow-400',
  code: 'text-purple-400',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const navigationStore = useNavigationStore();
  const diagrams = navigationStore.allDiagrams();
  const filteredDiagrams = useFuzzySearch(diagrams, search);

  const handleSelect = useCallback((item: DiagramSearchItem) => {
    onNavigate(item);
    onOpenChange(false);
    setSearch('');
  }, [onNavigate, onOpenChange]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-60 overflow-hidden"
      label="Navigate to diagram"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
        <Search className="w-5 h-5 text-gray-400" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search diagrams..."
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
        />
      </div>

      <Command.List className="max-h-[300px] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-gray-500 text-sm">
          No diagrams found.
        </Command.Empty>

        <Command.Group heading="Diagram Levels" className="text-xs text-gray-500 px-2 py-1">
          {filteredDiagrams.map((item) => {
            const Icon = levelIcons[item.level];
            const colorClass = levelColors[item.level];

            return (
              <Command.Item
                key={item.id}
                value={item.name}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer text-gray-300 hover:bg-gray-700 data-[selected=true]:bg-gray-700 aria-selected:bg-gray-700"
              >
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  {item.path.length > 0 && (
                    <div className="text-xs text-gray-500 truncate">
                      {item.path.join(' > ')}
                    </div>
                  )}
                </div>
                <span className={`text-xs ${colorClass} capitalize`}>
                  {item.level}
                </span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>

      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
        <span>
          <kbd className="px-1 bg-gray-900 rounded">Enter</kbd> to select
        </span>
        <span>
          <kbd className="px-1 bg-gray-900 rounded">Esc</kbd> to close
        </span>
      </div>
    </Command.Dialog>
  );
};
