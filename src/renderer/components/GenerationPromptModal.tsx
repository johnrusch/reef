import * as Dialog from '@radix-ui/react-dialog';
import { Sparkles, SkipForward, Repeat } from 'lucide-react';

interface GenerationPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoName: string;
  repoPath: string;
  /** Called when user chooses Generate Now or Always Generate */
  onGenerate: () => void;
  /** Called when user chooses Skip */
  onSkip: () => void;
  /** Called when user chooses Always Generate for New Repos */
  onAlwaysGenerate: () => void;
}

export function GenerationPromptModal({
  open,
  onOpenChange,
  repoName,
  onGenerate,
  onSkip,
  onAlwaysGenerate,
}: GenerationPromptModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onSkip();
        onOpenChange(isOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-md p-6 focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-white">
            Generate Architecture Diagrams?
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-400 mt-2">
            Generate C4 architecture diagrams for <strong className="text-gray-200">{repoName}</strong>? This will analyze
            the codebase and create context, container, component, and code level diagrams.
          </Dialog.Description>

          <p className="mt-3 text-xs text-gray-500">Estimated: ~60k tokens (~$0.03)</p>

          <div className="flex flex-col gap-2 mt-6">
            {/* Generate Now */}
            <button
              onClick={() => {
                onGenerate();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Generate Now
            </button>

            {/* Always Generate for New Repos */}
            <button
              onClick={() => {
                onAlwaysGenerate();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <Repeat className="w-4 h-4" />
              Always Generate for New Repos
            </button>

            {/* Skip */}
            <button
              onClick={() => {
                onSkip();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <SkipForward className="w-4 h-4" />
              Skip for Now
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default GenerationPromptModal;
