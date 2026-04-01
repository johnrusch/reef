/**
 * DiagramViewer.uicl.test.tsx
 *
 * UICL-03: DiagramViewer must NOT render the DiagramInfo sidebar.
 * Validates that "Diagram Information" heading is absent from the render tree.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramViewer } from '../../../../../src/renderer/components/DiagramViewer/DiagramViewer';

// ---------------------------------------------------------------------------
// Mock window.reef API
// ---------------------------------------------------------------------------
const mockReefAPI = {
  c4Storage: {
    initialize: vi.fn(() => Promise.resolve()),
    getRepoStates: vi.fn(() => Promise.resolve([])),
    onStateChanged: vi.fn(() => () => {}),
    getChangeTracking: vi.fn(() => Promise.resolve(null)),
    updateState: vi.fn(() => Promise.resolve()),
    getSvg: vi.fn(() => Promise.resolve(null)),
    getElements: vi.fn(() => Promise.resolve([])),
  },
  fileWatcher: {
    start: vi.fn(),
    stop: vi.fn(),
    checkStaleness: vi.fn(() => Promise.resolve(false)),
  },
};

Object.defineProperty(window, 'reef', {
  value: mockReefAPI,
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock zustand stores
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn((selector?: any) => {
    const store = {
      stack: [{ level: 'context', elementId: 'system', elementName: 'System' }],
      repositoryPath: '/test/repo',
      currentLevel: () => ({ level: 'context', elementId: 'system', elementName: 'System' }),
      canDrillUp: () => false,
      push: vi.fn(),
      pop: vi.fn(),
      navigateTo: vi.fn(),
      reset: vi.fn(),
      setRepository: vi.fn(),
    };
    if (selector) return selector(store);
    return store;
  }),
  getNextLevel: vi.fn(() => 'container'),
}));

vi.mock('../../../../../src/renderer/stores/diagramStateStore', () => ({
  useDiagramStateStore: vi.fn((selector?: any) => {
    const store = {
      getState: vi.fn(() => 'fresh'),
      setState: vi.fn(),
      loadStatesFromBackend: vi.fn(),
      getEntry: vi.fn(() => null),
      getAffectedElements: vi.fn(() => []),
      getChangedFiles: vi.fn(() => []),
      setAffectedElements: vi.fn(),
      setChangedFiles: vi.fn(),
    };
    if (selector) return selector(store);
    return store;
  }),
}));

vi.mock('../../../../../src/renderer/stores/diagramNavigationStore', () => ({
  useDiagramNavigationStore: Object.assign(vi.fn(() => ({})), {
    getState: vi.fn(() => ({ setIntent: vi.fn() })),
  }),
}));

vi.mock('../../../../../src/renderer/stores/repositoryStore', () => ({
  useRepositoryStore: Object.assign(vi.fn(() => ({})), {
    getState: vi.fn(() => ({ setActiveTab: vi.fn() })),
  }),
}));

// ---------------------------------------------------------------------------
// Mock react-hotkeys-hook
// ---------------------------------------------------------------------------
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock heavy child components
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramPanel', () => ({
  DiagramPanel: () => <div data-testid="diagram-panel">DiagramPanel</div>,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramBreadcrumbs', () => ({
  DiagramBreadcrumbs: () => <div data-testid="diagram-breadcrumbs">DiagramBreadcrumbs</div>,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/StalenessBadge', () => ({
  StalenessBadge: () => null,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: () => null,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/CommandPalette', () => ({
  CommandPalette: () => null,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/GeneratePromptCard', () => ({
  GeneratePromptCard: () => <div data-testid="generate-prompt-card">GeneratePromptCard</div>,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/C4HierarchyTree', () => ({
  C4HierarchyTree: () => <div data-testid="c4-hierarchy-tree">C4HierarchyTree</div>,
}));

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DiagramViewer (UICL-03)', () => {
  const mockMetadata = {
    generatedAt: '2024-01-01T00:00:00Z',
    diagramType: 'c4-context' as const,
    detailLevel: 'architectural' as const,
    repository: 'test-repo',
    model: 'haiku' as const,
    generationTime: 1000,
    estimatedCost: 0.01,
    cached: false,
    lastUpdated: '2024-01-01T00:00:00Z',
  };

  const mockRepository = {
    path: '/test/repo',
    name: 'test-repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReefAPI.c4Storage.initialize.mockResolvedValue(undefined);
    mockReefAPI.c4Storage.getRepoStates.mockResolvedValue([]);
    mockReefAPI.c4Storage.onStateChanged.mockReturnValue(() => {});
    mockReefAPI.c4Storage.getChangeTracking.mockResolvedValue(null);
    mockReefAPI.fileWatcher.checkStaleness.mockResolvedValue(false);
  });

  test('does NOT render "Diagram Information" heading', () => {
    render(
      <DiagramViewer
        repository={mockRepository}
        diagram="@startuml\nAlice -> Bob\n@enduml"
        metadata={mockMetadata}
        isGenerating={false}
        error={null}
        onRegenerateDiagram={vi.fn(() => Promise.resolve())}
        onExport={vi.fn()}
      />
    );

    // UICL-03: DiagramInfo sidebar heading must not be present
    expect(screen.queryByText('Diagram Information')).not.toBeInTheDocument();
  });
});
