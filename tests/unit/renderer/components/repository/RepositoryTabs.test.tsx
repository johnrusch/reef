/**
 * RepositoryTabs.test.tsx
 *
 * UICL-04: Visual Map tab must not render any Beta badge text.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepositoryTabs } from '../../../../../src/renderer/components/repository/RepositoryTabs';

describe('RepositoryTabs (UICL-04)', () => {
  const mockOnTabChange = vi.fn();

  test('renders all three tab labels', () => {
    render(
      <RepositoryTabs activeTab="visualmap" onTabChange={mockOnTabChange}>
        <div>content</div>
      </RepositoryTabs>
    );

    expect(screen.getByText('Commit Workflow')).toBeInTheDocument();
    expect(screen.getByText('Repository')).toBeInTheDocument();
    expect(screen.getByText('Visual Map')).toBeInTheDocument();
  });

  test('does NOT render Beta badge text on Visual Map tab', () => {
    render(
      <RepositoryTabs activeTab="visualmap" onTabChange={mockOnTabChange}>
        <div>content</div>
      </RepositoryTabs>
    );

    // After UICL-04 cleanup, "Beta" badge must be gone
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
