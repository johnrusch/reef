/**
 * VisualMapTab.test.tsx
 *
 * UICL-01: VisualMapTab must NOT render the settings configuration landing page.
 * Specifically: no "Diagram Settings" heading, no "AI Model" label,
 * and no "Traditional File Tree" button.
 *
 * NAV-01/NAV-02: loadDiagram function is read-only (never generates/writes),
 * and the skipLoadEffect ref prevents double-load race condition.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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
  c4Generation: {
    enqueue: vi.fn(() => Promise.resolve({ queued: true })),
    cancel: vi.fn(() => Promise.resolve({ cancelled: true })),
    getCostEstimate: vi.fn(() => Promise.resolve({ totalTokens: 0, estimatedCost: 0, levels: 4, summary: '' })),
    onProgress: vi.fn(() => () => {}),
    onComplete: vi.fn(() => () => {}),
    onCancelled: vi.fn(() => () => {}),
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
// Mock DiagramViewer — capture onLoadDiagram prop for testing
// ---------------------------------------------------------------------------
let capturedOnLoadDiagram: ((options: { type: string; elementId?: string }) => Promise<boolean>) | undefined;

vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramViewer', () => ({
  DiagramViewer: (props: any) => {
    capturedOnLoadDiagram = props.onLoadDiagram;
    return <div data-testid="diagram-viewer">DiagramViewer</div>;
  },
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

// ---------------------------------------------------------------------------
// NAV-01 / NAV-02: loadDiagram read-only invariants
// ---------------------------------------------------------------------------
describe('VisualMapTab loadDiagram (NAV-01, NAV-02)', () => {
  const mockRepository = {
    path: '/test/repo',
    name: 'test-repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnLoadDiagram = undefined;
    mockReefAPI.diagram.checkConfiguration.mockResolvedValue({ configured: true });
    mockReefAPI.c4Storage.getDiagram.mockResolvedValue(null);
    mockReefAPI.c4Storage.getSvg.mockResolvedValue(null);
    mockReefAPI.c4Storage.getRepoStates.mockResolvedValue([]);
    mockReefAPI.c4Storage.onStateChanged.mockReturnValue(() => {});
    // Return a cached SVG so DiagramViewer renders (exposing onLoadDiagram)
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');
  });

  test('loadDiagram returns true when getSvg returns cached SVG', async () => {
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await capturedOnLoadDiagram!({ type: 'c4-container', elementId: undefined });
    });

    expect(result).toBe(true);
    expect(mockReefAPI.c4Storage.getSvg).toHaveBeenCalledWith('/test/repo', 'container', undefined);
  });

  test('loadDiagram falls back to getDiagram when getSvg returns null, returns true on PlantUML hit', async () => {
    mockReefAPI.c4Storage.getSvg
      // First call: on-mount effect (returns SVG so DiagramViewer renders)
      .mockResolvedValueOnce('<svg>mount</svg>')
      // Subsequent calls: cache miss for loadDiagram
      .mockResolvedValue(null);
    mockReefAPI.c4Storage.getDiagram.mockResolvedValue({
      diagramContent: '@startuml\ntest\n@enduml',
      tokensUsed: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelUsed: 'haiku',
      generationCost: 0.001,
    });

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await capturedOnLoadDiagram!({ type: 'c4-context', elementId: undefined });
    });

    expect(result).toBe(true);
    expect(mockReefAPI.c4Storage.getDiagram).toHaveBeenCalled();
  });

  test('loadDiagram returns false when both getSvg and getDiagram return null (cache miss)', async () => {
    mockReefAPI.c4Storage.getSvg
      .mockResolvedValueOnce('<svg>mount</svg>')
      .mockResolvedValue(null);
    mockReefAPI.c4Storage.getDiagram.mockResolvedValue(null);

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await capturedOnLoadDiagram!({ type: 'c4-context', elementId: undefined });
    });

    expect(result).toBe(false);
  });

  test('loadDiagram NEVER calls window.reef.diagram.generate (NAV-02 read-only invariant)', async () => {
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');
    mockReefAPI.diagram.generate.mockClear();

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    await act(async () => {
      await capturedOnLoadDiagram!({ type: 'c4-container', elementId: undefined });
    });

    expect(mockReefAPI.diagram.generate).not.toHaveBeenCalled();
  });

  test('loadDiagram NEVER calls window.reef.c4Storage.updateState (NAV-02 no state transitions)', async () => {
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');
    mockReefAPI.c4Storage.updateState.mockClear();

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    await act(async () => {
      await capturedOnLoadDiagram!({ type: 'c4-container', elementId: undefined });
    });

    expect(mockReefAPI.c4Storage.updateState).not.toHaveBeenCalled();
  });

  test('loadDiagram NEVER calls window.reef.c4Storage.storeSvg (NAV-02 no writes during navigation)', async () => {
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');
    mockReefAPI.c4Storage.storeSvg.mockClear();

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
    });

    await act(async () => {
      await capturedOnLoadDiagram!({ type: 'c4-container', elementId: undefined });
    });

    expect(mockReefAPI.c4Storage.storeSvg).not.toHaveBeenCalled();
  });

  test('VisualMapTab passes onLoadDiagram prop to DiagramViewer', async () => {
    mockReefAPI.c4Storage.getSvg.mockResolvedValue('<svg>cached</svg>');

    render(<VisualMapTab repository={mockRepository} />);

    await waitFor(() => {
      expect(capturedOnLoadDiagram).toBeDefined();
      expect(typeof capturedOnLoadDiagram).toBe('function');
    });
  });
});
