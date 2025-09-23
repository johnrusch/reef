import { vi } from 'vitest';

// Mock Git status response
export const mockGitStatus = {
  not_added: [],
  conflicted: [],
  created: ['new-file.ts'],
  deleted: [],
  modified: ['existing-file.ts'],
  renamed: [],
  staged: ['staged-file.ts'],
  files: [
    { path: 'new-file.ts', index: ' ', working_dir: 'A' },
    { path: 'existing-file.ts', index: ' ', working_dir: 'M' },
    { path: 'staged-file.ts', index: 'A', working_dir: ' ' },
  ],
  ahead: 2,
  behind: 1,
  current: 'main',
  tracking: 'origin/main',
  detached: false,
};

// Mock Git branch info
export const mockBranchSummary = {
  current: 'main',
  all: ['main', 'develop', 'feature/test-branch'],
  branches: {
    main: {
      current: true,
      name: 'main',
      commit: 'abc123def456',
      label: 'main',
      linkedWorkTree: false,
    },
    develop: {
      current: false,
      name: 'develop',
      commit: 'def456ghi789',
      label: 'develop',
      linkedWorkTree: false,
    },
    'feature/test-branch': {
      current: false,
      name: 'feature/test-branch',
      commit: 'ghi789jkl012',
      label: 'feature/test-branch',
      linkedWorkTree: false,
    },
  },
};

// Mock Git log entries
export const mockLogEntries = [
  {
    hash: 'abc123def456',
    date: '2023-01-01T12:00:00Z',
    message: 'feat: add new feature',
    author_name: 'Test User',
    author_email: 'test@example.com',
    refs: 'HEAD -> main, origin/main',
    body: 'This is a test commit with a detailed description.',
    diff: {
      changed: 3,
      insertions: 25,
      deletions: 5,
      files: [
        {
          file: 'src/feature.ts',
          changes: 20,
          insertions: 20,
          deletions: 0,
          binary: false,
        },
        {
          file: 'src/old-feature.ts',
          changes: 5,
          insertions: 0,
          deletions: 5,
          binary: false,
        },
        {
          file: 'README.md',
          changes: 5,
          insertions: 5,
          deletions: 0,
          binary: false,
        },
      ],
    },
  },
  {
    hash: 'def456ghi789',
    date: '2022-12-31T18:00:00Z',
    message: 'fix: resolve critical bug',
    author_name: 'Another User',
    author_email: 'another@example.com',
    refs: '',
    body: 'Fixed a critical bug that was causing crashes.',
    diff: {
      changed: 1,
      insertions: 3,
      deletions: 2,
      files: [
        {
          file: 'src/buggy-component.ts',
          changes: 5,
          insertions: 3,
          deletions: 2,
          binary: false,
        },
      ],
    },
  },
];

// Mock Git remote info
export const mockRemotes = [
  {
    name: 'origin',
    refs: {
      fetch: 'https://github.com/testuser/test-repo.git',
      push: 'https://github.com/testuser/test-repo.git',
    },
  },
];

// Mock Git diff output
export const mockDiffSummary = {
  changed: 2,
  insertions: 15,
  deletions: 3,
  files: [
    {
      file: 'src/component.ts',
      changes: 12,
      insertions: 10,
      deletions: 2,
      binary: false,
    },
    {
      file: 'src/utils.ts',
      changes: 6,
      insertions: 5,
      deletions: 1,
      binary: false,
    },
  ],
};

// Mock simple-git instance
export const createMockGit = () => {
  const mockGitInstance = {
    // Status operations
    status: vi.fn().mockResolvedValue(mockGitStatus),
    checkIsRepo: vi.fn().mockResolvedValue(true),
    
    // Branch operations
    branch: vi.fn().mockResolvedValue(mockBranchSummary),
    branchLocal: vi.fn().mockResolvedValue(mockBranchSummary),
    checkout: vi.fn().mockResolvedValue('Switched to branch'),
    checkoutBranch: vi.fn().mockResolvedValue('Switched to new branch'),
    checkoutLocalBranch: vi.fn().mockResolvedValue('Created and switched to new branch'),
    deleteBranch: vi.fn().mockResolvedValue('Deleted branch'),
    
    // Commit operations
    commit: vi.fn().mockResolvedValue({
      commit: 'abc123',
      summary: {
        changes: 1,
        insertions: 1,
        deletions: 0,
      },
    }),
    log: vi.fn().mockResolvedValue({
      all: mockLogEntries,
      latest: mockLogEntries[0],
      total: mockLogEntries.length,
    }),
    
    // Remote operations
    getRemotes: vi.fn().mockResolvedValue(mockRemotes),
    addRemote: vi.fn().mockResolvedValue(undefined),
    removeRemote: vi.fn().mockResolvedValue(undefined),
    remote: vi.fn().mockResolvedValue(mockRemotes),
    
    // Fetch/Pull/Push operations
    fetch: vi.fn().mockResolvedValue({
      remote: 'origin',
      branches: ['main'],
    }),
    pull: vi.fn().mockResolvedValue({
      summary: {
        changes: 3,
        insertions: 10,
        deletions: 2,
      },
      files: ['file1.ts', 'file2.ts'],
    }),
    push: vi.fn().mockResolvedValue({
      pushed: [
        {
          local: 'main',
          remote: 'main',
          remoteName: 'origin',
        },
      ],
    }),
    
    // Staging operations
    add: vi.fn().mockResolvedValue(undefined),
    addFile: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    resetHard: vi.fn().mockResolvedValue(undefined),
    
    // Diff operations
    diff: vi.fn().mockResolvedValue('mock diff output'),
    diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
    
    // Stash operations
    stash: vi.fn().mockResolvedValue(undefined),
    stashList: vi.fn().mockResolvedValue({
      all: [],
      latest: null,
      total: 0,
    }),
    
    // Clone operations
    clone: vi.fn().mockResolvedValue(undefined),
    
    // Merge operations
    merge: vi.fn().mockResolvedValue({
      result: 'success',
      merges: ['main'],
    }),
    
    // Tag operations
    tag: vi.fn().mockResolvedValue(undefined),
    tags: vi.fn().mockResolvedValue({
      all: ['v1.0.0', 'v1.1.0'],
      latest: 'v1.1.0',
    }),
    
    // Repository initialization
    init: vi.fn().mockResolvedValue(undefined),
    
    // Configuration
    addConfig: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue('config-value'),
    listConfig: vi.fn().mockResolvedValue({
      all: {
        'user.name': 'Test User',
        'user.email': 'test@example.com',
      },
    }),
    
    // Submodule operations
    subModule: vi.fn().mockResolvedValue(undefined),
    submoduleAdd: vi.fn().mockResolvedValue(undefined),
    submoduleUpdate: vi.fn().mockResolvedValue(undefined),
    
    // Show operations
    show: vi.fn().mockResolvedValue('mock show output'),
    showResult: vi.fn().mockResolvedValue({
      hash: 'abc123',
      date: '2023-01-01',
      message: 'test commit',
      author_name: 'Test User',
      author_email: 'test@example.com',
    }),
    
    // Clean operations
    clean: vi.fn().mockResolvedValue(['removed-file.txt']),
    
    // Archive operations
    archive: vi.fn().mockResolvedValue(undefined),
    
    // Rev operations
    revparse: vi.fn().mockResolvedValue('abc123def456'),
    
    // Raw operations
    raw: vi.fn().mockResolvedValue('raw git output'),
  };

  // Add cwd method for setting working directory
  mockGitInstance.cwd = vi.fn().mockReturnValue(mockGitInstance);
  
  return mockGitInstance;
};

// Default mock implementation
export const mockGit = createMockGit();

// Mock the simple-git module
export const mockSimpleGit = vi.fn().mockImplementation((options?: any) => {
  if (options && options.baseDir) {
    return createMockGit();
  }
  return mockGit;
});

// Helper functions for test scenarios
export const createGitErrorMock = (operation: string, errorMessage: string) => {
  const errorMock = createMockGit();
  errorMock[operation as keyof typeof errorMock] = vi.fn().mockRejectedValue(
    new Error(errorMessage)
  );
  return errorMock;
};

export const createGitConflictMock = () => {
  const conflictMock = createMockGit();
  conflictMock.status = vi.fn().mockResolvedValue({
    ...mockGitStatus,
    conflicted: ['conflicted-file.ts'],
    files: [
      ...mockGitStatus.files,
      { path: 'conflicted-file.ts', index: 'U', working_dir: 'U' },
    ],
  });
  return conflictMock;
};

export const createGitCleanRepoMock = () => {
  const cleanMock = createMockGit();
  cleanMock.status = vi.fn().mockResolvedValue({
    not_added: [],
    conflicted: [],
    created: [],
    deleted: [],
    modified: [],
    renamed: [],
    staged: [],
    files: [],
    ahead: 0,
    behind: 0,
    current: 'main',
    tracking: 'origin/main',
    detached: false,
  });
  return cleanMock;
};

export const createGitDetachedHeadMock = () => {
  const detachedMock = createMockGit();
  detachedMock.status = vi.fn().mockResolvedValue({
    ...mockGitStatus,
    current: 'abc123def456',
    tracking: null,
    detached: true,
  });
  return detachedMock;
};

// Repository fixture helpers
export const createTempGitRepo = async (
  repoPath: string,
  options: {
    bare?: boolean;
    initialCommit?: boolean;
    branches?: string[];
    files?: Array<{ name: string; content: string }>;
  } = {}
) => {
  // This is a mock implementation - in real tests you might use fs-extra
  // to create actual temporary repositories
  const mockRepo = {
    path: repoPath,
    git: createMockGit(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };

  if (options.initialCommit) {
    mockRepo.git.log = vi.fn().mockResolvedValue({
      all: [mockLogEntries[0]],
      latest: mockLogEntries[0],
      total: 1,
    });
  }

  if (options.branches) {
    const branches = options.branches.reduce((acc, branchName) => {
      acc[branchName] = {
        current: branchName === 'main',
        name: branchName,
        commit: `${branchName}-commit-hash`,
        label: branchName,
        linkedWorkTree: false,
      };
      return acc;
    }, {} as any);

    mockRepo.git.branch = vi.fn().mockResolvedValue({
      current: 'main',
      all: options.branches,
      branches,
    });
  }

  return mockRepo;
};

// Reset all mocks
export const resetGitMocks = () => {
  Object.values(mockGit).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
  mockSimpleGit.mockClear();
};

// Setup function for tests
export const setupGitMocks = () => {
  vi.mock('simple-git', () => ({
    default: mockSimpleGit,
    simpleGit: mockSimpleGit,
  }));

  return {
    mockGit,
    mockSimpleGit,
    createMockGit,
    resetGitMocks,
  };
};