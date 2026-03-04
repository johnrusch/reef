/**
 * DiagramControls.test.tsx
 *
 * UICL-02: DiagramControls toolbar must NOT render legacy type buttons,
 * detail-level slider, or focus-area toggles. Only Regenerate +
 * Force Regenerate buttons and their confirm dialog must remain.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagramControls } from '../../../../../src/renderer/components/DiagramViewer/DiagramControls';

describe('DiagramControls (UICL-02)', () => {
  const mockOnRegenerate = vi.fn();
  const mockOnForceRegenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does NOT render "Diagram Type" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.queryByText('Diagram Type')).not.toBeInTheDocument();
  });

  test('does NOT render "Detail Level" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.queryByText('Detail Level')).not.toBeInTheDocument();
  });

  test('does NOT render "Focus Area" label', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.queryByText('Focus Area')).not.toBeInTheDocument();
  });

  test('renders Regenerate button', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  test('renders Force Regenerate button when onForceRegenerate provided', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
        onForceRegenerate={mockOnForceRegenerate}
      />
    );

    expect(screen.getByText('Force Regenerate')).toBeInTheDocument();
  });

  test('shows confirm dialog when Regenerate is clicked', () => {
    render(
      <DiagramControls
        isGenerating={false}
        onRegenerate={mockOnRegenerate}
      />
    );

    const regenerateButton = screen.getByText('Regenerate');
    fireEvent.click(regenerateButton);

    // Confirm dialog should appear
    expect(screen.getByText('Regenerate Diagram?')).toBeInTheDocument();
  });
});
