import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangeBadge } from '@renderer/components/DiagramViewer/ChangeBadge';

// Mock ReactDOM.createPortal to render directly into the document body in tests
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode, _container: Element) => node,
  };
});

describe('ChangeBadge', () => {
  // VISU-02 — renders count when directCount > 0
  it('VISU-02 — renders count when directCount > 0', () => {
    const { container } = render(
      <ChangeBadge directCount={3} inheritedCount={0} changedFiles={[]} />
    );
    expect(screen.getByText('3 changed')).toBeTruthy();
    expect(container.firstChild).not.toBeNull();
  });

  // VISU-02 — renders count when inheritedCount > 0
  it('VISU-02 — renders count when inheritedCount > 0', () => {
    render(
      <ChangeBadge directCount={0} inheritedCount={5} changedFiles={[]} />
    );
    expect(screen.getByText('5 affected')).toBeTruthy();
  });

  // VISU-02 — renders both counts with separator
  it('VISU-02 — renders both counts with separator', () => {
    render(
      <ChangeBadge directCount={2} inheritedCount={4} changedFiles={[]} />
    );
    expect(screen.getByText('2 changed')).toBeTruthy();
    expect(screen.getByText('4 affected')).toBeTruthy();
  });

  // VISU-02 — renders null when both counts zero
  it('VISU-02 — renders null when both counts zero', () => {
    const { container } = render(
      <ChangeBadge directCount={0} inheritedCount={0} changedFiles={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  // VISU-03 — tooltip shows file names on hover
  it('VISU-03 — tooltip shows file names on hover', () => {
    const { getByText } = render(
      <ChangeBadge
        directCount={2}
        inheritedCount={0}
        changedFiles={['src/services/auth.ts', 'src/components/Login.tsx']}
      />
    );

    // Find the badge element and fire mouseenter
    const badgeContainer = getByText('2 changed').closest('div[class]')!.parentElement!;
    fireEvent.mouseEnter(badgeContainer);

    // Tooltip should show filename (basename only)
    expect(screen.getByText('auth.ts')).toBeTruthy();
    expect(screen.getByText('Login.tsx')).toBeTruthy();
  });

  // VISU-03 — tooltip shows file count header
  it('VISU-03 — tooltip shows file count header', () => {
    const { getByText } = render(
      <ChangeBadge
        directCount={2}
        inheritedCount={0}
        changedFiles={['src/services/auth.ts', 'src/components/Login.tsx']}
      />
    );

    const badgeContainer = getByText('2 changed').closest('div[class]')!.parentElement!;
    fireEvent.mouseEnter(badgeContainer);

    // Tooltip header should mention the count
    expect(screen.getByText('2 file(s) changed:')).toBeTruthy();
  });

  // VISU-03 — tooltip not visible before hover
  it('VISU-03 — tooltip not visible before hover', () => {
    render(
      <ChangeBadge
        directCount={2}
        inheritedCount={0}
        changedFiles={['src/services/auth.ts', 'src/components/Login.tsx']}
      />
    );

    // Before hover, tooltip content should NOT be in the document
    expect(screen.queryByText('auth.ts')).toBeNull();
    expect(screen.queryByText('Login.tsx')).toBeNull();
    expect(screen.queryByText('2 file(s) changed:')).toBeNull();
  });
});
