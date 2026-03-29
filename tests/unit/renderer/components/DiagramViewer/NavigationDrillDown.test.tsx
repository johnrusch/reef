/**
 * NavigationDrillDown.test.tsx
 *
 * Tests for SVG click handler traversal logic and CSS interception patch.
 * Covers NAV-04: extractElementIdFromClick handles transparent overlay elements
 * and PlantUML link wrappers (<a> elements) without elem_ prefix.
 *
 * Also covers NAV-01: DiagramViewer navigation handlers call onLoadDiagram
 * instead of onRegenerateDiagram (breadcrumb, tree, element click, command palette).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { DiagramViewer } from '../../../../../src/renderer/components/DiagramViewer/DiagramViewer';
import { extractElementIdFromClick, patchSvgClickInterception } from '../../../../../src/renderer/components/PlantUMLRenderer';

// Helper: create an SVG namespace element
function svgEl(tag: string, attrs: Record<string, string> = {}): Element {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// Helper: create a plain HTML element
function htmlEl(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// Build a DOM tree and return [root, target].
// root acts as the click boundary (event.currentTarget).
// Call tree: root -> ... -> target (click starts at target, traverses to root).
function buildTree(...elements: Element[]): [Element, Element] {
  // elements[0] = root (boundary), elements[last] = target (click origin)
  for (let i = 0; i < elements.length - 1; i++) {
    elements[i].appendChild(elements[i + 1]);
  }
  return [elements[0], elements[elements.length - 1]];
}

describe('extractElementIdFromClick', () => {
  it('Test 1: extracts elem_ id when click originates inside transparent <a> wrapper', () => {
    // PlantUML structure: <g id="elem_Main_Process"> > <a href="" id="link_1"> > <rect> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Main_Process' });
    const aLink = svgEl('a', { href: '', id: 'link_1' });
    const rect = svgEl('rect', { fill: '#dde', width: '100', height: '50' });
    boundary.appendChild(group);
    group.appendChild(aLink);
    aLink.appendChild(rect);

    const result = extractElementIdFromClick(rect, boundary);
    expect(result).toBe('Main_Process');
  });

  it('Test 2: traverses up from transparent <rect fill="none" pointer-events="all"> to find parent elem_ group', () => {
    // Structure: <g id="elem_Renderer"> > <rect fill="none" pointer-events="all"> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Renderer' });
    const overlayRect = svgEl('rect', { fill: 'none', 'pointer-events': 'all' });
    boundary.appendChild(group);
    group.appendChild(overlayRect);

    const result = extractElementIdFromClick(overlayRect, boundary);
    expect(result).toBe('Renderer');
  });

  it('Test 3: extracts id from element with id="elem_Renderer" directly (baseline — no regression)', () => {
    // Structure: <g id="elem_Renderer"> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Renderer' });
    boundary.appendChild(group);

    const result = extractElementIdFromClick(group, boundary);
    expect(result).toBe('Renderer');
  });

  it('Test 4: skips <a> without elem_ prefix and finds elem_ parent', () => {
    // Structure: <g id="elem_APIServer"> > <a href="" id="link_2"> (no elem_ prefix — click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_APIServer' });
    const aLink = svgEl('a', { href: '', id: 'link_2' });
    boundary.appendChild(group);
    group.appendChild(aLink);

    const result = extractElementIdFromClick(aLink, boundary);
    expect(result).toBe('APIServer');
  });

  it('returns null when no elem_ group found (click on diagram background)', () => {
    const boundary = svgEl('svg');
    const bgRect = svgEl('rect', { id: 'svg_root', fill: '#fff' });
    boundary.appendChild(bgRect);

    const result = extractElementIdFromClick(bgRect, boundary);
    expect(result).toBeNull();
  });

  it('skips elements with ids starting with _ (internal PlantUML IDs)', () => {
    // Structure: <g id="_internal_1"> > <g id="elem_Container1">
    const boundary = svgEl('svg');
    const internalGroup = svgEl('g', { id: '_internal_1' });
    const targetGroup = svgEl('g', { id: 'elem_Container1' });
    boundary.appendChild(internalGroup);
    internalGroup.appendChild(targetGroup);

    const result = extractElementIdFromClick(targetGroup, boundary);
    expect(result).toBe('Container1');
  });
});

describe('patchSvgClickInterception', () => {
  it('Test 5: sets pointer-events:none on <a href=""> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const aEmpty = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    aEmpty.setAttribute('href', '');
    svg.appendChild(aEmpty);

    patchSvgClickInterception(svg);

    expect((aEmpty as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('Test 6: sets pointer-events:none on <rect fill="none" pointer-events="all"> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlay.setAttribute('fill', 'none');
    overlay.setAttribute('pointer-events', 'all');
    svg.appendChild(overlay);

    patchSvgClickInterception(svg);

    expect((overlay as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('does NOT patch <rect fill="none"> without pointer-events="all" or "painted"', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const normalRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    normalRect.setAttribute('fill', 'none');
    // No pointer-events attribute
    svg.appendChild(normalRect);

    patchSvgClickInterception(svg);

    // pointer-events should be untouched (empty string means not set)
    expect((normalRect as HTMLElement).style.pointerEvents).toBe('');
  });

  it('sets pointer-events:none on <rect fill="none" pointer-events="painted"> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlay.setAttribute('fill', 'none');
    overlay.setAttribute('pointer-events', 'painted');
    svg.appendChild(overlay);

    patchSvgClickInterception(svg);

    expect((overlay as HTMLElement).style.pointerEvents).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// NAV-01: DiagramViewer navigation handlers use onLoadDiagram
// ---------------------------------------------------------------------------

// Mock setup for DiagramViewer component tests
const mockNavigationStore = {
  stack: [{ level: 'context', elementId: undefined, elementName: 'Context' }],
  repositoryPath: '/test/repo',
  currentLevel: vi.fn(() => ({ level: 'context', elementId: undefined, elementName: 'Context' })),
  canDrillUp: vi.fn(() => false),
  push: vi.fn(),
  pop: vi.fn(),
  navigateTo: vi.fn(),
  reset: vi.fn(),
  setRepository: vi.fn(),
};

vi.mock('../../../../../src/renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => mockNavigationStore),
  getNextLevel: vi.fn((level: string) => {
    const levelMap: Record<string, string | null> = {
      context: 'container',
      container: 'component',
      component: 'code',
      code: null,
    };
    return levelMap[level] ?? null;
  }),
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

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramPanel', () => ({
  DiagramPanel: () => <div data-testid="diagram-panel">DiagramPanel</div>,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/DiagramBreadcrumbs', () => ({
  DiagramBreadcrumbs: ({ onNavigate }: { onNavigate: (index: number) => void }) => (
    <div data-testid="diagram-breadcrumbs">
      <button data-testid="breadcrumb-nav-0" onClick={() => onNavigate(0)}>Context</button>
    </div>
  ),
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/StalenessBadge', () => ({
  StalenessBadge: () => null,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: () => null,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/CommandPalette', () => ({
  CommandPalette: ({ onNavigate }: { onNavigate: (item: any) => void }) => (
    <div data-testid="command-palette">
      <button
        data-testid="palette-navigate"
        onClick={() => onNavigate({ level: 'context', elementId: undefined, name: 'Context' })}
      >
        Navigate
      </button>
    </div>
  ),
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/GeneratePromptCard', () => ({
  GeneratePromptCard: () => <div data-testid="generate-prompt-card">GeneratePromptCard</div>,
}));

vi.mock('../../../../../src/renderer/components/DiagramViewer/C4HierarchyTree', () => ({
  C4HierarchyTree: ({ onNavigate }: { onNavigate: (level: string) => void }) => (
    React.createElement('div', { 'data-testid': 'c4-hierarchy-tree' },
      React.createElement('button', { 'data-testid': 'tree-nav-context', onClick: () => onNavigate('context') }, 'Context')
    )
  ),
}));

const mockReefAPINav = {
  c4Storage: {
    initialize: vi.fn(() => Promise.resolve()),
    getRepoStates: vi.fn(() => Promise.resolve([])),
    onStateChanged: vi.fn(() => () => {}),
    getChangeTracking: vi.fn(() => Promise.resolve(null)),
    updateState: vi.fn(() => Promise.resolve()),
    getSvg: vi.fn(() => Promise.resolve(null)),
  },
  fileWatcher: {
    start: vi.fn(),
    stop: vi.fn(),
    checkStaleness: vi.fn(() => Promise.resolve(false)),
  },
};

Object.defineProperty(window, 'reef', {
  value: mockReefAPINav,
  writable: true,
});

const mockMetadata = {
  generatedAt: '2024-01-01T00:00:00Z',
  diagramType: 'c4-context' as const,
  detailLevel: 'architectural' as const,
  repository: 'test-repo',
  model: 'haiku' as const,
  generationTime: 0,
  estimatedCost: 0,
  cached: true,
  lastUpdated: '2024-01-01T00:00:00Z',
};

describe('DiagramViewer navigation handlers (NAV-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigationStore.stack = [{ level: 'context', elementId: undefined, elementName: 'Context' }];
    mockNavigationStore.currentLevel.mockReturnValue({ level: 'context', elementId: undefined, elementName: 'Context' });
    mockReefAPINav.c4Storage.getRepoStates.mockResolvedValue([]);
    mockReefAPINav.c4Storage.onStateChanged.mockReturnValue(() => {});
    mockReefAPINav.c4Storage.getChangeTracking.mockResolvedValue(null);
  });

  it('handleBreadcrumbNavigate calls onLoadDiagram, NOT onRegenerateDiagram on cache hit', async () => {
    const onLoadDiagram = vi.fn(() => Promise.resolve(true));
    const onRegenerateDiagram = vi.fn(() => Promise.resolve());

    // Set up navigation store with a container level in stack
    mockNavigationStore.stack = [
      { level: 'context', elementId: undefined, elementName: 'Context' },
      { level: 'container', elementId: 'frontend', elementName: 'Frontend' },
    ];

    const { getByTestId } = render(
      <DiagramViewer
        repository={{ path: '/test/repo', name: 'test-repo' }}
        diagram="@startuml\ntest\n@enduml"
        metadata={mockMetadata}
        isGenerating={false}
        error={null}
        onRegenerateDiagram={onRegenerateDiagram}
        onLoadDiagram={onLoadDiagram}
        onExport={vi.fn()}
      />
    );

    await act(async () => {
      getByTestId('breadcrumb-nav-0').click();
    });

    expect(onLoadDiagram).toHaveBeenCalled();
    expect(onRegenerateDiagram).not.toHaveBeenCalled();
  });

  it('handleTreeNavigate calls onLoadDiagram, NOT onRegenerateDiagram', async () => {
    const onLoadDiagram = vi.fn(() => Promise.resolve(true));
    const onRegenerateDiagram = vi.fn(() => Promise.resolve());

    const { getByTestId } = render(
      <DiagramViewer
        repository={{ path: '/test/repo', name: 'test-repo' }}
        diagram="@startuml\ntest\n@enduml"
        metadata={mockMetadata}
        isGenerating={false}
        error={null}
        onRegenerateDiagram={onRegenerateDiagram}
        onLoadDiagram={onLoadDiagram}
        onExport={vi.fn()}
      />
    );

    await act(async () => {
      getByTestId('tree-nav-context').click();
    });

    expect(onLoadDiagram).toHaveBeenCalled();
    expect(onRegenerateDiagram).not.toHaveBeenCalled();
  });

  it('handleCommandPaletteNavigate calls onLoadDiagram before onRegenerateDiagram (cache hit — no generate)', async () => {
    const onLoadDiagram = vi.fn(() => Promise.resolve(true));
    const onRegenerateDiagram = vi.fn(() => Promise.resolve());

    const { getByTestId } = render(
      <DiagramViewer
        repository={{ path: '/test/repo', name: 'test-repo' }}
        diagram="@startuml\ntest\n@enduml"
        metadata={mockMetadata}
        isGenerating={false}
        error={null}
        onRegenerateDiagram={onRegenerateDiagram}
        onLoadDiagram={onLoadDiagram}
        onExport={vi.fn()}
      />
    );

    await act(async () => {
      getByTestId('palette-navigate').click();
    });

    expect(onLoadDiagram).toHaveBeenCalled();
    expect(onRegenerateDiagram).not.toHaveBeenCalled();
  });

  it('handleCommandPaletteNavigate falls back to onRegenerateDiagram when onLoadDiagram returns false (cache miss)', async () => {
    const onLoadDiagram = vi.fn(() => Promise.resolve(false));
    const onRegenerateDiagram = vi.fn(() => Promise.resolve());

    const { getByTestId } = render(
      <DiagramViewer
        repository={{ path: '/test/repo', name: 'test-repo' }}
        diagram="@startuml\ntest\n@enduml"
        metadata={mockMetadata}
        isGenerating={false}
        error={null}
        onRegenerateDiagram={onRegenerateDiagram}
        onLoadDiagram={onLoadDiagram}
        onExport={vi.fn()}
      />
    );

    await act(async () => {
      getByTestId('palette-navigate').click();
    });

    expect(onLoadDiagram).toHaveBeenCalled();
    expect(onRegenerateDiagram).toHaveBeenCalled();
  });
});
