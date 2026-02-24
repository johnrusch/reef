import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock scrollIntoView for jsdom
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock window.reef
vi.mock('@renderer/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => ({
    allDiagrams: () => [
      { id: 'c4-context', name: 'System Context', level: 'context', path: [] },
      { id: 'c4-container', name: 'Container Diagram', level: 'container', path: ['System Context'] },
      { id: 'reef_main', name: 'Reef Main', level: 'container', path: ['System Context'] },
    ],
    push: vi.fn(),
    reset: vi.fn(),
  })),
}));

describe('CommandPalette', () => {
  const mockOnNavigate = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders when open is true', async () => {
    const { CommandPalette } = await import('@renderer/components/DiagramViewer/CommandPalette');
    render(
      <CommandPalette
        open={true}
        onOpenChange={mockOnOpenChange}
        onNavigate={mockOnNavigate}
      />
    );

    expect(screen.getByPlaceholderText(/search diagrams/i)).toBeInTheDocument();
  });

  test('shows all diagrams when search is empty', async () => {
    const { CommandPalette } = await import('@renderer/components/DiagramViewer/CommandPalette');
    render(
      <CommandPalette
        open={true}
        onOpenChange={mockOnOpenChange}
        onNavigate={mockOnNavigate}
      />
    );

    expect(screen.getAllByText('System Context').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Container Diagram').length).toBeGreaterThan(0);
  });

  test('calls onNavigate when item selected', async () => {
    const { CommandPalette } = await import('@renderer/components/DiagramViewer/CommandPalette');
    const user = userEvent.setup();

    render(
      <CommandPalette
        open={true}
        onOpenChange={mockOnOpenChange}
        onNavigate={mockOnNavigate}
      />
    );

    const items = screen.getAllByText('System Context');
    await user.click(items[0]);

    expect(mockOnNavigate).toHaveBeenCalled();
  });

  test('closes on Escape key', async () => {
    const { CommandPalette } = await import('@renderer/components/DiagramViewer/CommandPalette');
    render(
      <CommandPalette
        open={true}
        onOpenChange={mockOnOpenChange}
        onNavigate={mockOnNavigate}
      />
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('filters results as user types', async () => {
    const { CommandPalette } = await import('@renderer/components/DiagramViewer/CommandPalette');
    const user = userEvent.setup();

    render(
      <CommandPalette
        open={true}
        onOpenChange={mockOnOpenChange}
        onNavigate={mockOnNavigate}
      />
    );

    const input = screen.getByPlaceholderText(/search diagrams/i);
    await user.type(input, 'reef');

    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByText('Reef Main')).toBeInTheDocument();
    }, { timeout: 500 });
  });
});
