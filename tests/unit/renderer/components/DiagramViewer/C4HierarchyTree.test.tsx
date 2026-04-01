/**
 * C4HierarchyTree.test.tsx
 *
 * NAV-01, NAV-03: Sidebar tree for C4 hierarchy navigation.
 * - Renders all 4 C4 level labels
 * - Highlights active level from navigationStore
 * - Calls onNavigate when clicked
 * - Disabled prop prevents calls
 * - isCollapsed prop shows icon-only view
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { C4HierarchyTree } from '../../../../../src/renderer/components/DiagramViewer/C4HierarchyTree';

// ---------------------------------------------------------------------------
// Mock zustand navigationStore — selector-aware
// ---------------------------------------------------------------------------
const mockStack = [{ level: 'context', elementName: 'System Context', elementId: 'system' }];

vi.mock('../../../../../src/renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn((selector?: any) => {
    const store = {
      stack: mockStack,
      currentLevel: () => mockStack[mockStack.length - 1],
    };
    if (selector) return selector(store);
    return store;
  }),
}));

// Mock window.reef for element loading
Object.defineProperty(window, 'reef', {
  value: {
    c4Storage: {
      getElements: vi.fn(() => Promise.resolve([])),
    },
  },
  writable: true,
});

describe('C4HierarchyTree (NAV-01, NAV-03)', () => {
  const mockOnNavigate = vi.fn();
  const mockOnCollapseToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stack to context level
    mockStack.length = 0;
    mockStack.push({ level: 'context', elementName: 'System Context', elementId: 'system' });
  });

  test('renders all 4 C4 level labels', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    expect(screen.getByText('System Context')).toBeInTheDocument();
    expect(screen.getByText('Containers')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  test('highlights the active level with blue styling', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    const contextButton = screen.getByRole('button', { name: /System Context/i });
    expect(contextButton.className).toContain('text-blue-300');
  });

  test('non-active levels have default gray styling', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    expect(containersButton.className).toContain('text-gray-400');
  });

  test('calls onNavigate with correct level when node is clicked', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    fireEvent.click(containersButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('container');
  });

  test('disabled prop prevents onNavigate calls', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        disabled
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    fireEvent.click(containersButton);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  test('collapsed view shows only icons without labels', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={true}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    // Labels should not be visible as text in collapsed mode
    expect(screen.queryByText('System Context')).not.toBeInTheDocument();
    expect(screen.queryByText('Containers')).not.toBeInTheDocument();
  });

  test('collapse toggle calls onCollapseToggle', () => {
    render(
      <C4HierarchyTree
        onNavigate={mockOnNavigate}
        isCollapsed={false}
        onCollapseToggle={mockOnCollapseToggle}
      />
    );

    const toggleButton = screen.getByTitle(/collapse/i);
    fireEvent.click(toggleButton);

    expect(mockOnCollapseToggle).toHaveBeenCalledTimes(1);
  });
});
