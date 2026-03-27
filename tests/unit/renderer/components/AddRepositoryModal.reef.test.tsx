/**
 * AddRepositoryModal.reef.test.tsx
 *
 * Tests for the .reef/ detection branch added in 19-02:
 *   - Complete .reef/ → info toast "Loaded N diagrams from .reef/", modal closes, no GenerationPromptModal
 *   - Partial .reef/ → info toast with counts, missing levels queued, modal closes
 *   - Empty .reef/ (no importedLevels) → falls through to existing generation prompt flow
 *   - Import throws → falls through to existing generation prompt flow (non-fatal, D-11)
 *
 * Requirements: READ-01, READ-02, READ-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks — must be defined before any module imports
// ---------------------------------------------------------------------------

const mockAddRepository = vi.fn().mockResolvedValue(undefined);
const mockAddJob = vi.fn();
const mockAddToast = vi.fn().mockReturnValue('toast-id');
const mockScanAndImport = vi.fn();
const mockGetSettings = vi.fn();
const mockEnqueue = vi.fn().mockResolvedValue({ queued: true });

vi.mock('@renderer/stores/repositoryStore', () => ({
  useRepositoryStore: vi.fn(() => ({
    addRepository: mockAddRepository,
    repositories: [],
  })),
}));

vi.mock('@renderer/stores/generationQueueStore', () => ({
  useGenerationQueueStore: vi.fn(() => ({
    addJob: mockAddJob,
  })),
}));

vi.mock('@renderer/stores/toastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: mockAddToast,
  })),
}));

// Mock GenerationPromptModal so we can detect if it's rendered
vi.mock('@renderer/components/GenerationPromptModal', () => ({
  default: vi.fn(({ open }: { open: boolean }) =>
    open ? <div data-testid="generation-prompt-modal" /> : null
  ),
}));

// window.reef mock — configured per test
const mockReefAPI = {
  dialog: {
    selectDirectory: vi.fn().mockResolvedValue('/test/repo'),
  },
  git: {
    getRepositoryStatus: vi.fn().mockResolvedValue({
      branch: 'main',
      modified: 0,
      staged: 0,
    }),
  },
  diagramSettings: {
    get: mockGetSettings,
    set: vi.fn().mockResolvedValue(undefined),
  },
  reefImport: {
    scanAndImport: mockScanAndImport,
  },
  c4Generation: {
    enqueue: mockEnqueue,
  },
};

Object.defineProperty(window, 'reef', {
  value: mockReefAPI,
  writable: true,
});

// ---------------------------------------------------------------------------
// Import component after mocks are set up
// ---------------------------------------------------------------------------

import AddRepositoryModal from '@renderer/components/AddRepositoryModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openAndSelectRepo() {
  const user = userEvent.setup();

  render(<AddRepositoryModal isOpen={true} onClose={vi.fn()} />);

  // Click "Browse for Repository" to trigger directory selection
  const browseButton = screen.getByText('Browse for Repository');
  await user.click(browseButton);

  // Wait for repository details to appear (git status resolved)
  await waitFor(() => {
    expect(screen.getByText('Add Repository')).toBeInTheDocument();
  });

  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddRepositoryModal — .reef/ detection (19-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: settings returns 'prompt' — would show modal if not handled by reef
    mockGetSettings.mockResolvedValue({ autoGenerateOnRepoAdd: 'prompt' });
  });

  it('complete .reef/: shows info toast, closes modal, skips GenerationPromptModal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: ['context', 'container'],
      missingLevels: [],
    });

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));

    await waitFor(() => expect(screen.queryByText('Add Repository', { selector: 'button' })).toBeInTheDocument());

    const addButton = screen.getByRole('button', { name: 'Add Repository' });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Loaded 2 diagrams from .reef/',
        duration: 4000,
      });
    });

    expect(onClose).toHaveBeenCalled();
    // GenerationPromptModal should NOT be visible
    expect(screen.queryByTestId('generation-prompt-modal')).not.toBeInTheDocument();
    // Generation should NOT be queued
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('complete .reef/ with singular count: uses singular "diagram"', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: ['context'],
      missingLevels: [],
    });

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Loaded 1 diagram from .reef/',
        duration: 4000,
      });
    });
  });

  it('partial .reef/: shows partial toast with counts, enqueues missing levels, closes modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: ['context'],
      missingLevels: ['container'],
    });

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Loaded 1 diagram from .reef/ — generating 1 missing level...',
        duration: 6000,
      });
    });

    expect(mockAddJob).toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId('generation-prompt-modal')).not.toBeInTheDocument();
  });

  it('partial .reef/ with plural counts: uses plural "diagrams" and "levels"', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: ['context', 'container'],
      missingLevels: ['component', 'code'],
    });

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Loaded 2 diagrams from .reef/ — generating 2 missing levels...',
        duration: 6000,
      });
    });
  });

  it('empty .reef/ (no SVGs): falls through to generation prompt', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: [],
      missingLevels: ['context', 'container'],
    });

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    // Should fall through — no toast for reef
    await waitFor(() => {
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    // The existing flow (settings: 'prompt') shows the GenerationPromptModal
    await waitFor(() => {
      expect(screen.getByTestId('generation-prompt-modal')).toBeInTheDocument();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('reef import throws: falls through to generation prompt (non-fatal, D-11)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    mockScanAndImport.mockRejectedValue(new Error('IPC error'));

    render(<AddRepositoryModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    // No toast, no close — falls through to generation prompt
    await waitFor(() => {
      expect(screen.getByTestId('generation-prompt-modal')).toBeInTheDocument();
    });

    expect(mockAddToast).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reefImport.scanAndImport is called with the selected repoPath', async () => {
    const user = userEvent.setup();

    mockScanAndImport.mockResolvedValue({
      importedLevels: ['context'],
      missingLevels: [],
    });

    render(<AddRepositoryModal isOpen={true} onClose={vi.fn()} />);

    await user.click(screen.getByText('Browse for Repository'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Repository' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add Repository' }));

    await waitFor(() => {
      expect(mockScanAndImport).toHaveBeenCalledWith('/test/repo');
    });
  });
});
