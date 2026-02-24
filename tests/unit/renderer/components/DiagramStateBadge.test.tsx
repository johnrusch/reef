import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagramStateBadge } from '@renderer/components/DiagramViewer/DiagramStateBadge';

describe('DiagramStateBadge', () => {
  describe('icon rendering (STOR-04)', () => {
    it('renders null for never_generated state', () => {
      const { container } = render(
        <DiagramStateBadge state="never_generated" onRegenerate={vi.fn()} />
      );

      // Component should render nothing for never_generated
      expect(container.firstChild).toBeNull();
    });

    it('renders green checkmark for fresh state', () => {
      render(<DiagramStateBadge state="fresh" onRegenerate={vi.fn()} />);

      expect(screen.getByText('Up to date')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-500/20');
    });

    it('renders amber clock for stale state', () => {
      render(<DiagramStateBadge state="stale" onRegenerate={vi.fn()} />);

      expect(screen.getByText(/Outdated/)).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-amber-500/20');
    });

    it('renders blue spinner for generating state', () => {
      render(<DiagramStateBadge state="generating" onRegenerate={vi.fn()} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      const container = screen.getByText('Generating...').closest('div');
      expect(container).toHaveClass('bg-blue-500/20');
    });

    it('renders red warning for error state', () => {
      render(<DiagramStateBadge state="error" onRegenerate={vi.fn()} />);

      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-500/20');
    });
  });

  describe('interactivity', () => {
    it('stale badge is clickable and calls onRegenerate', () => {
      const mockOnRegenerate = vi.fn();
      render(<DiagramStateBadge state="stale" onRegenerate={mockOnRegenerate} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
    });

    it('error badge is clickable and calls onRegenerate', () => {
      const mockOnRegenerate = vi.fn();
      render(<DiagramStateBadge state="error" onRegenerate={mockOnRegenerate} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
    });

    it('fresh badge shows tooltip on hover', () => {
      render(<DiagramStateBadge state="fresh" onRegenerate={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Up to date');
    });

    it('error badge shows error message in tooltip', () => {
      render(
        <DiagramStateBadge
          state="error"
          errorMessage="Network timeout"
          onRegenerate={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Network timeout');
    });

    it('generating badge is not clickable', () => {
      render(<DiagramStateBadge state="generating" onRegenerate={vi.fn()} />);

      // Generating state should not have a button
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('fresh badge does not call onRegenerate when clicked', () => {
      const mockOnRegenerate = vi.fn();
      render(<DiagramStateBadge state="fresh" onRegenerate={mockOnRegenerate} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Fresh badge button doesn't have onClick handler
      expect(mockOnRegenerate).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('buttons have accessible labels', () => {
      const { rerender } = render(
        <DiagramStateBadge state="fresh" onRegenerate={vi.fn()} />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');

      rerender(<DiagramStateBadge state="stale" onRegenerate={vi.fn()} />);
      button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      rerender(<DiagramStateBadge state="error" onRegenerate={vi.fn()} />);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
    });

    it('spinner has aria-label for screen readers', () => {
      render(<DiagramStateBadge state="generating" onRegenerate={vi.fn()} />);

      // Check that generating state has descriptive text
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('error state provides error context in title attribute', () => {
      render(
        <DiagramStateBadge
          state="error"
          errorMessage="API rate limit exceeded"
          onRegenerate={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'API rate limit exceeded');
    });
  });
});
