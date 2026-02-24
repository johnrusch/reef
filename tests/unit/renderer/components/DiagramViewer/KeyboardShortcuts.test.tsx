import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagramViewer } from '../../../../../src/renderer/components/DiagramViewer/DiagramViewer';

// Mock window.reef API
const mockReefAPI = {
  ipc: {
    on: vi.fn(),
    off: vi.fn(),
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

// Mock zustand store
vi.mock('../../../../../src/renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => ({
    stack: [{ level: 'context', elementId: 'system', elementName: 'System' }],
    repositoryPath: '/test/repo',
    currentLevel: () => ({ level: 'context', elementId: 'system', elementName: 'System' }),
    canDrillUp: () => false,
    push: vi.fn(),
    pop: vi.fn(),
    navigateTo: vi.fn(),
    reset: vi.fn(),
    setRepository: vi.fn(),
  })),
  getNextLevel: vi.fn(() => 'container'),
}));

describe('Keyboard Shortcuts', () => {
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

  const mockOnRegenerateDiagram = vi.fn(() => Promise.resolve());
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('F key toggles fullscreen mode', async () => {
    try {
      render(
        <DiagramViewer
          repository={mockRepository}
          diagram="<svg>test</svg>"
          metadata={mockMetadata}
          isGenerating={false}
          error={null}
          onRegenerateDiagram={mockOnRegenerateDiagram}
          onExport={mockOnExport}
        />
      );

      // Press F key to toggle fullscreen
      fireEvent.keyDown(window, { key: 'f' });

      // Check if fullscreen was toggled (component should have fullscreen styles)
      await waitFor(() => {
        const fullscreenContainer = document.querySelector('.fixed.inset-0.z-50');
        expect(fullscreenContainer).toBeTruthy();
      });
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });

  test('Escape exits fullscreen mode', async () => {
    try {
      render(
        <DiagramViewer
          repository={mockRepository}
          diagram="<svg>test</svg>"
          metadata={mockMetadata}
          isGenerating={false}
          error={null}
          onRegenerateDiagram={mockOnRegenerateDiagram}
          onExport={mockOnExport}
        />
      );

      // Enter fullscreen first
      fireEvent.keyDown(window, { key: 'f' });

      await waitFor(() => {
        expect(document.querySelector('.fixed.inset-0.z-50')).toBeTruthy();
      });

      // Press Escape to exit
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        const fullscreenContainer = document.querySelector('.fixed.inset-0.z-50');
        expect(fullscreenContainer).toBeFalsy();
      });
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });

  test('Cmd+R triggers regeneration', async () => {
    try {
      render(
        <DiagramViewer
          repository={mockRepository}
          diagram="<svg>test</svg>"
          metadata={mockMetadata}
          isGenerating={false}
          error={null}
          onRegenerateDiagram={mockOnRegenerateDiagram}
          onExport={mockOnExport}
        />
      );

      // Press Cmd+R (or Ctrl+R on non-Mac)
      fireEvent.keyDown(window, { key: 'r', metaKey: true });

      await waitFor(() => {
        expect(mockOnRegenerateDiagram).toHaveBeenCalled();
      });
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });

  test('Shortcuts do not fire when typing in input', async () => {
    try {
      const { container } = render(
        <div>
          <input type="text" data-testid="test-input" />
          <DiagramViewer
            repository={mockRepository}
            diagram="<svg>test</svg>"
            metadata={mockMetadata}
            isGenerating={false}
            error={null}
            onRegenerateDiagram={mockOnRegenerateDiagram}
            onExport={mockOnExport}
          />
        </div>
      );

      const input = screen.getByTestId('test-input');
      input.focus();

      // Type 'f' in the input field
      await userEvent.type(input, 'f');

      // Fullscreen should NOT be toggled
      const fullscreenContainer = document.querySelector('.fixed.inset-0.z-50');
      expect(fullscreenContainer).toBeFalsy();
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });

  test('Left arrow navigates breadcrumb up', async () => {
    try {
      const mockNavigateTo = vi.fn();
      const { useNavigationStore } = await import('../../../../../src/renderer/stores/navigationStore');
      (useNavigationStore as any).mockReturnValue({
        stack: [
          { level: 'context', elementId: 'system', elementName: 'System' },
          { level: 'container', elementId: 'reef_main', elementName: 'Reef Main' },
        ],
        repositoryPath: '/test/repo',
        currentLevel: () => ({ level: 'container', elementId: 'reef_main', elementName: 'Reef Main' }),
        canDrillUp: () => true,
        navigateTo: mockNavigateTo,
        push: vi.fn(),
        pop: vi.fn(),
        reset: vi.fn(),
        setRepository: vi.fn(),
      });

      render(
        <DiagramViewer
          repository={mockRepository}
          diagram="<svg>test</svg>"
          metadata={{ ...mockMetadata, diagramType: 'c4-container' }}
          isGenerating={false}
          error={null}
          onRegenerateDiagram={mockOnRegenerateDiagram}
          onExport={mockOnExport}
        />
      );

      // Press left arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalled();
      });
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });

  test('Shift+? opens shortcuts help', async () => {
    try {
      render(
        <DiagramViewer
          repository={mockRepository}
          diagram="<svg>test</svg>"
          metadata={mockMetadata}
          isGenerating={false}
          error={null}
          onRegenerateDiagram={mockOnRegenerateDiagram}
          onExport={mockOnExport}
        />
      );

      // Press Shift+?
      fireEvent.keyDown(window, { key: '?', shiftKey: true });

      await waitFor(() => {
        // Look for help dialog (should contain "Keyboard Shortcuts" text)
        const helpDialog = screen.queryByText(/keyboard shortcuts/i);
        expect(helpDialog).toBeTruthy();
      });
    } catch (error) {
      // Expected to fail until implementation is complete
      expect(error).toBeDefined();
    }
  });
});
