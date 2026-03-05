/**
 * C4HierarchyTree.test.tsx
 *
 * NAV-01, NAV-03: Sidebar tree for C4 hierarchy navigation.
 * - Renders all 4 C4 level labels
 * - Highlights active level from navigationStore
 * - Calls onNavigate when clicked
 * - Shows elementName suffix from navigation stack
 * - Disabled prop prevents calls
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { C4HierarchyTree } from '../../../../../src/renderer/components/DiagramViewer/C4HierarchyTree';

// ---------------------------------------------------------------------------
// Mock zustand navigationStore
// ---------------------------------------------------------------------------
const mockCurrentLevel = vi.fn(() => ({ level: 'context', elementName: 'System Context' }));
const mockStack = [{ level: 'context', elementName: 'System Context' }];

vi.mock('../../../../../src/renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn((selector?: any) => {
    const store = {
      stack: mockStack,
      currentLevel: mockCurrentLevel,
    };
    if (selector) return selector(store);
    return store;
  }),
}));

describe('C4HierarchyTree (NAV-01, NAV-03)', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentLevel.mockReturnValue({ level: 'context', elementName: 'System Context' });
  });

  test('renders all 4 C4 level labels', () => {
    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    expect(screen.getByText('System Context')).toBeInTheDocument();
    expect(screen.getByText('Containers')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  test('highlights the active level with blue styling', () => {
    mockCurrentLevel.mockReturnValue({ level: 'context', elementName: 'System Context' });

    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    // The active level button should have blue styling
    const contextButton = screen.getByRole('button', { name: /System Context/i });
    expect(contextButton.className).toContain('text-blue-300');
  });

  test('non-active levels have default gray styling', () => {
    mockCurrentLevel.mockReturnValue({ level: 'context', elementName: 'System Context' });

    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    expect(containersButton.className).toContain('text-gray-400');
  });

  test('calls onNavigate with correct level when node is clicked', () => {
    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    fireEvent.click(containersButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('container');
  });

  test('calls onNavigate with context level when System Context clicked', () => {
    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    const contextButton = screen.getByRole('button', { name: /System Context/i });
    fireEvent.click(contextButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('context');
  });

  test('disabled prop prevents onNavigate calls', () => {
    render(<C4HierarchyTree onNavigate={mockOnNavigate} disabled />);

    const containersButton = screen.getByRole('button', { name: /Containers/i });
    fireEvent.click(containersButton);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  test('collapse toggle hides labels when collapsed', () => {
    render(<C4HierarchyTree onNavigate={mockOnNavigate} />);

    // Find the collapse toggle button
    const toggleButton = screen.getByTitle(/collapse/i);
    fireEvent.click(toggleButton);

    // Labels should be hidden after collapsing
    expect(screen.queryByText('Containers')).not.toBeInTheDocument();
  });
});
