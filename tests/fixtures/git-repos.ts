import { vi } from 'vitest';
import path from 'path';
import { createMockGit } from '../mocks/git';

// Git repository fixture data
export interface GitRepoFixture {
  name: string;
  path: string;
  branch: string;
  status: 'clean' | 'dirty' | 'conflicted' | 'detached';
  files: Array<{
    path: string;
    status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '??' | '!!';
    staged?: boolean;
  }>;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  branches: string[];
  remotes: Array<{
    name: string;
    url: string;
  }>;
  ahead: number;
  behind: number;
}

// Predefined git repository fixtures
export const gitRepoFixtures: Record<string, GitRepoFixture> = {
  cleanRepo: {
    name: 'clean-repo',
    path: '/test/repos/clean-repo',
    branch: 'main',
    status: 'clean',
    files: [],
    commits: [
      {
        hash: 'abc123def456',
        message: 'Initial commit',
        author: 'Test User <test@example.com>',
        date: '2023-01-01T12:00:00Z',
      },
    ],
    branches: ['main'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/clean-repo.git',
      },
    ],
    ahead: 0,
    behind: 0,
  },

  dirtyRepo: {
    name: 'dirty-repo',
    path: '/test/repos/dirty-repo',
    branch: 'main',
    status: 'dirty',
    files: [
      { path: 'src/component.ts', status: 'M', staged: false },
      { path: 'src/new-file.ts', status: 'A', staged: true },
      { path: 'README.md', status: 'M', staged: true },
      { path: 'temp.log', status: '??', staged: false },
    ],
    commits: [
      {
        hash: 'def456ghi789',
        message: 'Add component feature',
        author: 'Test User <test@example.com>',
        date: '2023-01-02T10:00:00Z',
      },
      {
        hash: 'abc123def456',
        message: 'Initial commit',
        author: 'Test User <test@example.com>',
        date: '2023-01-01T12:00:00Z',
      },
    ],
    branches: ['main', 'develop'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/dirty-repo.git',
      },
    ],
    ahead: 2,
    behind: 1,
  },

  conflictedRepo: {
    name: 'conflicted-repo',
    path: '/test/repos/conflicted-repo',
    branch: 'main',
    status: 'conflicted',
    files: [
      { path: 'src/conflicted.ts', status: 'U', staged: false },
      { path: 'package.json', status: 'M', staged: true },
    ],
    commits: [
      {
        hash: 'ghi789jkl012',
        message: 'Merge conflict resolution',
        author: 'Test User <test@example.com>',
        date: '2023-01-03T14:00:00Z',
      },
      {
        hash: 'def456ghi789',
        message: 'Feature branch commit',
        author: 'Another User <another@example.com>',
        date: '2023-01-02T16:00:00Z',
      },
    ],
    branches: ['main', 'develop', 'feature/conflict-test'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/conflicted-repo.git',
      },
      {
        name: 'upstream',
        url: 'https://github.com/upstream/conflicted-repo.git',
      },
    ],
    ahead: 0,
    behind: 0,
  },

  detachedRepo: {
    name: 'detached-repo',
    path: '/test/repos/detached-repo',
    branch: 'abc123def456',
    status: 'detached',
    files: [
      { path: 'src/old-feature.ts', status: 'M', staged: false },
    ],
    commits: [
      {
        hash: 'abc123def456',
        message: 'Historical commit',
        author: 'Historical User <history@example.com>',
        date: '2022-12-01T09:00:00Z',
      },
      {
        hash: 'xyz789abc123',
        message: 'Even older commit',
        author: 'Historical User <history@example.com>',
        date: '2022-11-15T15:30:00Z',
      },
    ],
    branches: ['main', 'develop'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/detached-repo.git',
      },
    ],
    ahead: 0,
    behind: 5,
  },

  multiRemoteRepo: {
    name: 'multi-remote-repo',
    path: '/test/repos/multi-remote-repo',
    branch: 'develop',
    status: 'clean',
    files: [],
    commits: [
      {
        hash: 'mno345pqr678',
        message: 'Latest develop commit',
        author: 'Dev User <dev@example.com>',
        date: '2023-01-05T11:00:00Z',
      },
      {
        hash: 'jkl012mno345',
        message: 'Previous commit',
        author: 'Dev User <dev@example.com>',
        date: '2023-01-04T09:30:00Z',
      },
    ],
    branches: ['main', 'develop', 'feature/multi-remote', 'hotfix/urgent'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/multi-remote-repo.git',
      },
      {
        name: 'upstream',
        url: 'https://github.com/upstream/multi-remote-repo.git',
      },
      {
        name: 'fork',
        url: 'https://github.com/fork/multi-remote-repo.git',
      },
    ],
    ahead: 3,
    behind: 2,
  },

  largeRepo: {
    name: 'large-repo',
    path: '/test/repos/large-repo',
    branch: 'main',
    status: 'dirty',
    files: Array.from({ length: 50 }, (_, i) => ({
      path: `src/component-${i + 1}.ts`,
      status: (i % 4 === 0 ? 'M' : i % 4 === 1 ? 'A' : i % 4 === 2 ? 'D' : '??') as any,
      staged: i % 3 === 0,
    })),
    commits: Array.from({ length: 100 }, (_, i) => ({
      hash: `commit${i.toString().padStart(3, '0')}hash`,
      message: `Commit ${i + 1}: ${i % 5 === 0 ? 'feat' : i % 5 === 1 ? 'fix' : i % 5 === 2 ? 'docs' : i % 5 === 3 ? 'refactor' : 'test'}: update components`,
      author: `User${(i % 3) + 1} <user${(i % 3) + 1}@example.com>`,
      date: new Date(2023, 0, 1 + Math.floor(i / 2), 12 + (i % 12)).toISOString(),
    })),
    branches: ['main', 'develop', 'release/v1.0', 'release/v2.0', 'hotfix/critical'],
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/testuser/large-repo.git',
      },
    ],
    ahead: 15,
    behind: 3,
  },
};

// Helper functions to create mock Git instances from fixtures
export const createGitFromFixture = (fixtureName: keyof typeof gitRepoFixtures) => {
  const fixture = gitRepoFixtures[fixtureName];
  const mockGit = createMockGit();

  // Configure status based on fixture
  const statusFiles = fixture.files.map(file => ({
    path: file.path,
    index: file.staged ? file.status : ' ',
    working_dir: !file.staged ? file.status : ' ',
  }));

  mockGit.status = vi.fn().mockResolvedValue({
    not_added: fixture.files.filter(f => f.status === '??').map(f => f.path),
    conflicted: fixture.files.filter(f => f.status === 'U').map(f => f.path),
    created: fixture.files.filter(f => f.status === 'A').map(f => f.path),
    deleted: fixture.files.filter(f => f.status === 'D').map(f => f.path),
    modified: fixture.files.filter(f => f.status === 'M').map(f => f.path),
    renamed: fixture.files.filter(f => f.status === 'R').map(f => f.path),
    staged: fixture.files.filter(f => f.staged).map(f => f.path),
    files: statusFiles,
    ahead: fixture.ahead,
    behind: fixture.behind,
    current: fixture.branch,
    tracking: fixture.remotes.length > 0 ? `${fixture.remotes[0].name}/${fixture.branch}` : null,
    detached: fixture.status === 'detached',
  });

  // Configure branches
  const branches = fixture.branches.reduce((acc, branchName) => {
    acc[branchName] = {
      current: branchName === fixture.branch,
      name: branchName,
      commit: fixture.commits[0]?.hash || 'abc123',
      label: branchName,
      linkedWorkTree: false,
    };
    return acc;
  }, {} as any);

  mockGit.branch = vi.fn().mockResolvedValue({
    current: fixture.branch,
    all: fixture.branches,
    branches,
  });

  // Configure remotes
  const remotes = fixture.remotes.map(remote => ({
    name: remote.name,
    refs: {
      fetch: remote.url,
      push: remote.url,
    },
  }));

  mockGit.getRemotes = vi.fn().mockResolvedValue(remotes);

  // Configure log
  mockGit.log = vi.fn().mockResolvedValue({
    all: fixture.commits.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author_name: commit.author.split(' <')[0],
      author_email: commit.author.match(/<(.+)>/)?.[1] || '',
      refs: commit === fixture.commits[0] ? `HEAD -> ${fixture.branch}` : '',
      body: '',
    })),
    latest: fixture.commits[0] ? {
      hash: fixture.commits[0].hash,
      date: fixture.commits[0].date,
      message: fixture.commits[0].message,
      author_name: fixture.commits[0].author.split(' <')[0],
      author_email: fixture.commits[0].author.match(/<(.+)>/)?.[1] || '',
      refs: `HEAD -> ${fixture.branch}`,
      body: '',
    } : null,
    total: fixture.commits.length,
  });

  return mockGit;
};

// Create temporary test repositories (mock implementation)
export interface TempRepoOptions {
  fixture?: keyof typeof gitRepoFixtures;
  customFixture?: Partial<GitRepoFixture>;
  setupGit?: boolean;
}

export const createTempRepo = async (name: string, options: TempRepoOptions = {}) => {
  const basePath = path.join('/tmp', 'test-repos', name);
  
  let fixture: GitRepoFixture;
  
  if (options.fixture) {
    fixture = { ...gitRepoFixtures[options.fixture] };
  } else {
    fixture = { ...gitRepoFixtures.cleanRepo };
  }
  
  if (options.customFixture) {
    fixture = { ...fixture, ...options.customFixture };
  }
  
  fixture.path = basePath;
  fixture.name = name;

  const mockGit = createGitFromFixture(options.fixture || 'cleanRepo');
  
  return {
    path: basePath,
    fixture,
    git: mockGit,
    cleanup: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('file content'),
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rmdir: vi.fn().mockResolvedValue(undefined),
  };
};

// Repository state transitions for testing
export const repoStateTransitions = {
  makeClean: (repo: ReturnType<typeof createGitFromFixture>) => {
    repo.status = vi.fn().mockResolvedValue({
      ...repo.status(),
      files: [],
      not_added: [],
      modified: [],
      created: [],
      deleted: [],
      staged: [],
    });
  },

  makeDirty: (repo: ReturnType<typeof createGitFromFixture>, files: GitRepoFixture['files']) => {
    const statusFiles = files.map(file => ({
      path: file.path,
      index: file.staged ? file.status : ' ',
      working_dir: !file.staged ? file.status : ' ',
    }));

    repo.status = vi.fn().mockResolvedValue({
      not_added: files.filter(f => f.status === '??').map(f => f.path),
      conflicted: files.filter(f => f.status === 'U').map(f => f.path),
      created: files.filter(f => f.status === 'A').map(f => f.path),
      deleted: files.filter(f => f.status === 'D').map(f => f.path),
      modified: files.filter(f => f.status === 'M').map(f => f.path),
      renamed: files.filter(f => f.status === 'R').map(f => f.path),
      staged: files.filter(f => f.staged).map(f => f.path),
      files: statusFiles,
      ahead: 0,
      behind: 0,
      current: 'main',
      tracking: 'origin/main',
      detached: false,
    });
  },

  addConflicts: (repo: ReturnType<typeof createGitFromFixture>, conflictedFiles: string[]) => {
    const currentStatus = repo.status();
    repo.status = vi.fn().mockResolvedValue({
      ...currentStatus,
      conflicted: conflictedFiles,
      files: [
        ...currentStatus.files,
        ...conflictedFiles.map(path => ({ path, index: 'U', working_dir: 'U' })),
      ],
    });
  },

  switchBranch: (repo: ReturnType<typeof createGitFromFixture>, branchName: string) => {
    repo.checkout = vi.fn().mockResolvedValue(`Switched to branch '${branchName}'`);
    
    const currentBranch = repo.branch();
    const newBranches = { ...currentBranch.branches };
    
    // Update current branch
    Object.keys(newBranches).forEach(branch => {
      newBranches[branch].current = branch === branchName;
    });

    repo.branch = vi.fn().mockResolvedValue({
      ...currentBranch,
      current: branchName,
      branches: newBranches,
    });
  },
};

// Batch repository operations for testing multiple repos
export const createRepoWorkspace = async (repos: Array<{ name: string; fixture: keyof typeof gitRepoFixtures }>) => {
  const workspace = await Promise.all(
    repos.map(({ name, fixture }) => createTempRepo(name, { fixture }))
  );

  return {
    repos: workspace,
    cleanup: async () => {
      await Promise.all(workspace.map(repo => repo.cleanup()));
    },
    getRepo: (name: string) => workspace.find(repo => repo.fixture.name === name),
    getAllRepos: () => workspace,
  };
};

// Export all fixtures and utilities
export {
  type GitRepoFixture,
  type TempRepoOptions,
};