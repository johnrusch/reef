/**
 * VisualMapTab.test.tsx
 *
 * UICL-01: VisualMapTab must NOT render the settings configuration landing page.
 * Specifically: no "Diagram Settings" heading, no "AI Model" label,
 * and no "Traditional File Tree" button.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VisualMapTab } from '../../../../../src/renderer/components/tabs/VisualMapTab';

// ---------------------------------------------------------------------------
// Mock window.reef API
// ---------------------------------------------------------------------------
const mockReefAPI = {
  diagram: {
    checkConfiguration: vi.fn(() => Promise.resolve({ configured: true })),
    setApiKey: vi.fn(() => Promise.resolve({ success: true })),
    getAvailableContainers: vi.fn(() => Promise.resolve({ success: false, containers: [] })),
    getAvailableComponents: vi.fn(() => Promise.resolve({ success: false, components: [] })),
    generate: vi.fn(() => Promise.resolve({ success: false, error: 'not called' })),
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
// Mock GeneratePromptCard
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/GeneratePromptCard', () => ({
  GeneratePromptCard: ({ repoName }: { repoName: string }) => (
    <div data-testid="generate-prompt-card">Generate for {repoName}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock DiagramStateBadge
// ---------------------------------------------------------------------------
vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramStateBadge', () => ({
  DiagramStateBadge: () => <div data-testid="diagram-state-badge">DiagramStateBadge</div>,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('VisualMapTab (UICL-01)', () => {
  const mockRepository = {
    path: '/test/repo',
    name: 'test-repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: configured, no stored diagram, never_generated state
    mockReefAPI.diagram.checkConfiguration.mockResolvedValue({ configured: true });
    mockReefAPI.c4Storage.getDiagram.mockResolvedValue(null);
    mockReefAPI.c4Storage.getSvg.mockResolvedValue(null);
    mockReefAPI.c4Storage.getRepoStates.mockResolvedValue([]);
    mockReefAPI.c4Storage.onStateChanged.mockReturnValue(() => {});
  });

  test('does NOT render "Diagram Settings" heading', async () => {
    render(<VisualMapTab repository={mockRepository} />);

    // Wait for async configuration check to complete
    await waitFor(() => {
      expect(screen.queryByText('Diagram Settings')).not.toBeInTheDocument();
    });
  });

  test('does NOT render "AI Model" label text', async () => {
    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.queryByText('AI Model')).not.toBeInTheDocument();
    });
  });

  test('does NOT render "Traditional File Tree" button text', async () => {
    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.queryByText('Traditional File Tree')).not.toBeInTheDocument();
    });
  });
});
