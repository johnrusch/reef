/**
 * VisualMapTab.gen01.test.tsx
 *
 * GEN-01: GeneratePromptCard's onGenerate should trigger generation for all 4 C4 levels.
 * Tests that generateAllDiagrams calls the diagram API for all 4 levels.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VisualMapTab } from '../../../../../src/renderer/components/tabs/VisualMapTab';

// ---------------------------------------------------------------------------
// Mock window.reef API
// ---------------------------------------------------------------------------
const mockGenerate = vi.fn(() => Promise.resolve({ success: false, error: 'not called' }));

const mockReefAPI = {
  diagram: {
    checkConfiguration: vi.fn(() => Promise.resolve({ configured: true })),
    setApiKey: vi.fn(() => Promise.resolve({ success: true })),
    getAvailableContainers: vi.fn(() => Promise.resolve({ success: false, containers: [] })),
    getAvailableComponents: vi.fn(() => Promise.resolve({ success: false, components: [] })),
    generate: mockGenerate,
  },
  c4Storage: {
    initialize: vi.fn(() => Promise.resolve()),
    getDiagram: vi.fn(() => Promise.resolve(null)),
    getSvg: vi.fn(() => Promise.resolve(null)),
    getRepoStates: vi.fn(() => Promise.resolve([])),
    onStateChanged: vi.fn(() => () => {}),
    updateState: vi.fn(() => Promise.resolve()),
    storeSvg: vi.fn(() => Promise.resolve()),
  },
  git: {
    getRepositoryStatus: vi.fn(() => Promise.resolve({ files: [] })),
  },
  context: {
    extract: vi.fn(() => Promise.resolve({ formattedContext: '' })),
  },
  cache: {
    clearAll: vi.fn(() => Promise.resolve({ success: true })),
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
// Mock plantuml-encoder
// ---------------------------------------------------------------------------
vi.mock('plantuml-encoder', () => ({
  default: {
    encode: vi.fn(() => 'encoded'),
  },
}));

// ---------------------------------------------------------------------------
// Mock zustand stores
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/stores/diagramStateStore', () => ({
  useDiagramStateStore: vi.fn((selector?: any) => {
    const store = {
      getState: vi.fn(() => 'never_generated'),
      setState: vi.fn(),
      loadStatesFromBackend: vi.fn(),
    };
    if (selector) return selector(store);
    return store;
  }),
}));

// ---------------------------------------------------------------------------
// Mock DiagramViewer (heavy component — not under test here)
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramViewer', () => ({
  DiagramViewer: () => <div data-testid="diagram-viewer">DiagramViewer</div>,
}));

// ---------------------------------------------------------------------------
// Mock DiagramStateBadge
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramStateBadge', () => ({
  DiagramStateBadge: () => <div data-testid="diagram-state-badge">DiagramStateBadge</div>,
}));

// ---------------------------------------------------------------------------
// Mock GeneratePromptCard to expose onGenerate
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/GeneratePromptCard', () => ({
  GeneratePromptCard: ({ onGenerate, repoName }: { onGenerate: () => void; repoName: string }) => (
    <div data-testid="generate-prompt-card">
      <span>Generate for {repoName}</span>
      <button onClick={onGenerate} data-testid="generate-button">
        Generate All Diagrams
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('VisualMapTab (GEN-01)', () => {
  const mockRepository = {
    path: '/test/repo',
    name: 'test-repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReefAPI.diagram.checkConfiguration.mockResolvedValue({ configured: true });
    mockReefAPI.c4Storage.getDiagram.mockResolvedValue(null);
    mockReefAPI.c4Storage.getSvg.mockResolvedValue(null);
    mockReefAPI.c4Storage.getRepoStates.mockResolvedValue([]);
    mockReefAPI.c4Storage.onStateChanged.mockReturnValue(() => {});
  });

  test('GeneratePromptCard button text says "Generate All Diagrams"', async () => {
    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText('Generate All Diagrams')).toBeInTheDocument();
    });
  });

  test('clicking generate button triggers diagram.generate for all 4 C4 levels', async () => {
    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByTestId('generate-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('generate-button'));

    await waitFor(() => {
      // Should have called generate at least 4 times for the 4 C4 levels
      expect(mockGenerate).toHaveBeenCalledTimes(4);
    }, { timeout: 5000 });

    // Verify the 4 C4 types were requested
    // The generate API is called as generate(repoPath, { type, ... }) so type is in second argument
    const callTypes = mockGenerate.mock.calls.map(call => call[1]?.type);
    expect(callTypes).toContain('c4-context');
    expect(callTypes).toContain('c4-container');
    expect(callTypes).toContain('c4-component');
    expect(callTypes).toContain('c4-code');
  });
});
