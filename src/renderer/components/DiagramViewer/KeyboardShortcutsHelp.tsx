import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'F', action: 'Toggle fullscreen mode' },
  { key: 'Escape', action: 'Exit fullscreen mode' },
  { key: 'Cmd/Ctrl + R', action: 'Regenerate diagram' },
  { key: 'Cmd/Ctrl + K', action: 'Open quick navigation (coming soon)' },
  { key: 'Arrow Left', action: 'Navigate to parent breadcrumb' },
  { key: 'Shift + ?', action: 'Show this help dialog' },
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg p-6 max-w-md w-full z-50 border border-gray-700 shadow-xl"
          aria-describedby="shortcuts-description"
        >
          <Dialog.Title className="text-lg font-semibold text-gray-100 flex items-center gap-2 mb-4">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </Dialog.Title>

          <p id="shortcuts-description" className="sr-only">
            List of keyboard shortcuts available in the diagram viewer
          </p>

          <div className="space-y-3">
            {shortcuts.map(({ key, action }) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <kbd className="px-2 py-1 bg-gray-900 rounded text-sm font-mono text-gray-300 border border-gray-600">
                  {key}
                </kbd>
                <span className="text-gray-400 text-sm">{action}</span>
              </div>
            ))}
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1 bg-gray-900 rounded text-xs">Escape</kbd> or click outside to close
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
