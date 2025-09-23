import { rest } from 'msw';

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';

// Sample user data
const mockUser = {
  login: 'testuser',
  id: 12345,
  avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
  gravatar_id: '',
  url: 'https://api.github.com/users/testuser',
  html_url: 'https://github.com/testuser',
  type: 'User',
  site_admin: false,
  name: 'Test User',
  company: 'Test Company',
  blog: 'https://testuser.dev',
  location: 'Test City',
  email: 'test@example.com',
  hireable: true,
  bio: 'A test user for testing purposes',
  twitter_username: 'testuser',
  public_repos: 25,
  public_gists: 5,
  followers: 100,
  following: 50,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// Sample repository data
const mockRepositories = [
  {
    id: 1,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: mockUser,
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
    description: 'A test repository for testing purposes',
    fork: false,
    url: 'https://api.github.com/repos/testuser/test-repo',
    clone_url: 'https://github.com/testuser/test-repo.git',
    ssh_url: 'git@github.com:testuser/test-repo.git',
    svn_url: 'https://github.com/testuser/test-repo',
    homepage: 'https://testuser.dev/test-repo',
    size: 1024,
    stargazers_count: 50,
    watchers_count: 50,
    language: 'TypeScript',
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    forks_count: 10,
    archived: false,
    disabled: false,
    open_issues_count: 2,
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
    },
    forks: 10,
    open_issues: 2,
    watchers: 50,
    default_branch: 'main',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    pushed_at: '2023-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'another-repo',
    full_name: 'testuser/another-repo',
    owner: mockUser,
    private: true,
    html_url: 'https://github.com/testuser/another-repo',
    description: 'Another test repository',
    fork: false,
    url: 'https://api.github.com/repos/testuser/another-repo',
    clone_url: 'https://github.com/testuser/another-repo.git',
    ssh_url: 'git@github.com:testuser/another-repo.git',
    svn_url: 'https://github.com/testuser/another-repo',
    homepage: null,
    size: 512,
    stargazers_count: 25,
    watchers_count: 25,
    language: 'JavaScript',
    has_issues: true,
    has_projects: false,
    has_wiki: false,
    has_pages: false,
    forks_count: 5,
    archived: false,
    disabled: false,
    open_issues_count: 1,
    license: null,
    forks: 5,
    open_issues: 1,
    watchers: 25,
    default_branch: 'main',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    created_at: '2022-06-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    pushed_at: '2023-01-02T08:00:00Z',
  },
];

// GitHub API handlers
export const githubHandlers = [
  // Authentication endpoints
  rest.post('https://github.com/login/oauth/access_token', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'gho_test_token_12345',
        token_type: 'bearer',
        scope: 'repo,user',
      })
    );
  }),

  // User endpoints
  rest.get(`${GITHUB_API_BASE}/user`, (req, res, ctx) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('token ')) {
      return res(
        ctx.status(401),
        ctx.json({
          message: 'Requires authentication',
          documentation_url: 'https://docs.github.com/rest/reference/users#get-the-authenticated-user',
        })
      );
    }

    return res(ctx.status(200), ctx.json(mockUser));
  }),

  rest.get(`${GITHUB_API_BASE}/users/:username`, (req, res, ctx) => {
    const { username } = req.params;
    
    if (username === 'testuser') {
      return res(ctx.status(200), ctx.json(mockUser));
    }
    
    return res(
      ctx.status(404),
      ctx.json({
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest/reference/users#get-a-user',
      })
    );
  }),

  // Repository endpoints
  rest.get(`${GITHUB_API_BASE}/user/repos`, (req, res, ctx) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('token ')) {
      return res(
        ctx.status(401),
        ctx.json({ message: 'Requires authentication' })
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '30', 10);
    const sort = url.searchParams.get('sort') || 'created';
    const direction = url.searchParams.get('direction') || 'desc';
    const type = url.searchParams.get('type') || 'owner';

    let repos = [...mockRepositories];

    // Filter by type
    if (type === 'private') {
      repos = repos.filter(repo => repo.private);
    } else if (type === 'public') {
      repos = repos.filter(repo => !repo.private);
    }

    // Sort repositories
    repos.sort((a, b) => {
      let aValue, bValue;
      switch (sort) {
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'pushed':
          aValue = new Date(a.pushed_at).getTime();
          bValue = new Date(b.pushed_at).getTime();
          break;
        case 'full_name':
          aValue = a.full_name;
          bValue = b.full_name;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (direction === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Paginate
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedRepos = repos.slice(startIndex, endIndex);

    return res(ctx.status(200), ctx.json(paginatedRepos));
  }),

  rest.get(`${GITHUB_API_BASE}/repos/:owner/:repo`, (req, res, ctx) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;
    
    const repository = mockRepositories.find(r => r.full_name === fullName);
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({
          message: 'Not Found',
          documentation_url: 'https://docs.github.com/rest/reference/repos#get-a-repository',
        })
      );
    }

    return res(ctx.status(200), ctx.json(repository));
  }),

  // Branch endpoints
  rest.get(`${GITHUB_API_BASE}/repos/:owner/:repo/branches`, (req, res, ctx) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;
    
    const repository = mockRepositories.find(r => r.full_name === fullName);
    
    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
    }

    const branches = [
      {
        name: 'main',
        commit: {
          sha: 'abc123def456',
          url: `${GITHUB_API_BASE}/repos/${fullName}/commits/abc123def456`,
        },
        protected: true,
        protection: {
          enabled: true,
          required_status_checks: {
            enforcement_level: 'everyone',
            contexts: ['ci/tests'],
          },
        },
        protection_url: `${GITHUB_API_BASE}/repos/${fullName}/branches/main/protection`,
      },
      {
        name: 'develop',
        commit: {
          sha: 'def456ghi789',
          url: `${GITHUB_API_BASE}/repos/${fullName}/commits/def456ghi789`,
        },
        protected: false,
        protection: {
          enabled: false,
        },
        protection_url: `${GITHUB_API_BASE}/repos/${fullName}/branches/develop/protection`,
      },
    ];

    return res(ctx.status(200), ctx.json(branches));
  }),

  rest.get(`${GITHUB_API_BASE}/repos/:owner/:repo/branches/:branch`, (req, res, ctx) => {
    const { owner, repo, branch } = req.params;
    const fullName = `${owner}/${repo}`;
    
    const repository = mockRepositories.find(r => r.full_name === fullName);
    
    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
    }

    if (branch === 'main' || branch === 'develop') {
      const branchData = {
        name: branch,
        commit: {
          sha: branch === 'main' ? 'abc123def456' : 'def456ghi789',
          url: `${GITHUB_API_BASE}/repos/${fullName}/commits/${branch === 'main' ? 'abc123def456' : 'def456ghi789'}`,
        },
        protected: branch === 'main',
      };

      return res(ctx.status(200), ctx.json(branchData));
    }

    return res(ctx.status(404), ctx.json({ message: 'Branch not found' }));
  }),

  // Commits endpoints
  rest.get(`${GITHUB_API_BASE}/repos/:owner/:repo/commits`, (req, res, ctx) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;
    
    const repository = mockRepositories.find(r => r.full_name === fullName);
    
    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
    }

    const commits = [
      {
        sha: 'abc123def456',
        commit: {
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2023-01-01T12:00:00Z',
          },
          committer: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2023-01-01T12:00:00Z',
          },
          message: 'Initial commit',
          tree: {
            sha: 'tree123',
            url: `${GITHUB_API_BASE}/repos/${fullName}/git/trees/tree123`,
          },
        },
        url: `${GITHUB_API_BASE}/repos/${fullName}/commits/abc123def456`,
        html_url: `https://github.com/${fullName}/commit/abc123def456`,
        author: mockUser,
        committer: mockUser,
      },
      {
        sha: 'def456ghi789',
        commit: {
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2023-01-02T08:00:00Z',
          },
          committer: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2023-01-02T08:00:00Z',
          },
          message: 'Add new feature',
          tree: {
            sha: 'tree456',
            url: `${GITHUB_API_BASE}/repos/${fullName}/git/trees/tree456`,
          },
        },
        url: `${GITHUB_API_BASE}/repos/${fullName}/commits/def456ghi789`,
        html_url: `https://github.com/${fullName}/commit/def456ghi789`,
        author: mockUser,
        committer: mockUser,
      },
    ];

    return res(ctx.status(200), ctx.json(commits));
  }),

  // Rate limit endpoint
  rest.get(`${GITHUB_API_BASE}/rate_limit`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: Math.floor(Date.now() / 1000) + 3600,
          used: 1,
          resource: 'core',
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: Math.floor(Date.now() / 1000) + 60,
          used: 0,
          resource: 'search',
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
          used: 0,
          resource: 'graphql',
        },
        integration_manifest: {
          limit: 5000,
          remaining: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
          used: 0,
          resource: 'integration_manifest',
        },
      })
    );
  }),

  // Error simulation handlers
  rest.get(`${GITHUB_API_BASE}/error/unauthorized`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        message: 'Bad credentials',
        documentation_url: 'https://docs.github.com/rest',
      })
    );
  }),

  rest.get(`${GITHUB_API_BASE}/error/forbidden`, (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({
        message: 'Forbidden',
        documentation_url: 'https://docs.github.com/rest',
      })
    );
  }),

  rest.get(`${GITHUB_API_BASE}/error/rate-limit`, (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
      }),
      ctx.set('X-RateLimit-Limit', '5000'),
      ctx.set('X-RateLimit-Remaining', '0'),
      ctx.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600))
    );
  }),

  rest.get(`${GITHUB_API_BASE}/error/server`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        message: 'Internal Server Error',
        documentation_url: 'https://docs.github.com/rest',
      })
    );
  }),
];

// Helper functions for test scenarios
export const createCustomUserHandler = (userData: Partial<typeof mockUser>) => {
  return rest.get(`${GITHUB_API_BASE}/user`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...mockUser, ...userData }));
  });
};

export const createCustomRepoHandler = (repoData: Partial<typeof mockRepositories[0]>) => {
  return rest.get(`${GITHUB_API_BASE}/repos/:owner/:repo`, (req, res, ctx) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;
    
    if (fullName === repoData.full_name || repo === repoData.name) {
      return res(ctx.status(200), ctx.json({ ...mockRepositories[0], ...repoData }));
    }
    
    return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
  });
};

export const createErrorHandler = (endpoint: string, status: number, message: string) => {
  return rest.get(`${GITHUB_API_BASE}${endpoint}`, (req, res, ctx) => {
    return res(ctx.status(status), ctx.json({ message }));
  });
};

export const createRateLimitHandler = () => {
  return rest.get(`${GITHUB_API_BASE}/*`, (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
      }),
      ctx.set('X-RateLimit-Limit', '5000'),
      ctx.set('X-RateLimit-Remaining', '0'),
      ctx.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600))
    );
  });
};

export { mockUser, mockRepositories };