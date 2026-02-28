import { create } from 'zustand';
import type { NavigationLevel } from './navigationStore';
import type { DiagramType } from '../components/DiagramViewer/DiagramViewer';

interface DiagramNavigationReturn {
  returnStack: NavigationLevel[];
  returnLevel: DiagramType;
}

interface DiagramNavigationIntent extends DiagramNavigationReturn {
  targetFile: string;
  createdAt: number;
}

interface DiagramNavigationStore {
  intent: DiagramNavigationIntent | null;
  setIntent: (intent: DiagramNavigationIntent) => void;
  clearIntent: () => void;
}

export type { DiagramNavigationIntent, DiagramNavigationReturn };

// No persist middleware — intent is consumed once and must not survive app restart
// (consistent with toastStore pattern)
export const useDiagramNavigationStore = create<DiagramNavigationStore>()((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  clearIntent: () => set({ intent: null }),
}));
