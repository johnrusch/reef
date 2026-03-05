/**
 * DiagramControls.test.tsx
 *
 * NAV-02 / GEN-02: DiagramControls toolbar must have exactly 2 controls:
 * Regenerate + Show/Hide Changes toggle. No Force Regenerate button.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagramControls } from '../../../../../src/renderer/components/DiagramViewer/DiagramControls';

describe('DiagramControls', () => {
  const mockOnRegenerate = vi.fn();
  const mockOnToggleChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does NOT render "Diagram Type" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.queryByText('Diagram Type')).not.toBeInTheDocument();
  });

  test('does NOT render "Detail Level" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.queryByText('Detail Level')).not.toBeInTheDocument();
  });

  test('does NOT render "Focus Area" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.queryByText('Focus Area')).not.toBeInTheDocument();
  });

  test('renders Regenerate button', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  test('does NOT render Force Regenerate button', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.queryByText('Force Regenerate')).not.toBeInTheDocument();
  });

  test('renders Show Changes toggle when showChanges=false', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.getByText('Show Changes')).toBeInTheDocument();
  });

  test('renders Hide Changes toggle when showChanges=true', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={true}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    expect(screen.getByText('Hide Changes')).toBeInTheDocument();
  });

  test('clicking toggle calls onToggleChanges', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    const toggleButton = screen.getByText('Show Changes');
    fireEvent.click(toggleButton);

    expect(mockOnToggleChanges).toHaveBeenCalledTimes(1);
  });

  test('shows confirm dialog when Regenerate is clicked', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        showChanges={false}
        onToggleChanges={mockOnToggleChanges}
      />
    );

    const regenerateButton = screen.getByText('Regenerate');
    fireEvent.click(regenerateButton);

    // Confirm dialog should appear
    expect(screen.getByText('Regenerate Diagram?')).toBeInTheDocument();
  });
});
