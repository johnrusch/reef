import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Define handlers for GitHub API mocking
export const githubHandlers = [
  // Get current user
  rest.get('https://api.github.com/user', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
        name: 'Test User',
        email: 'test@example.com',
        public_repos: 10,
        followers: 5,
        following: 8,
      })
    );
  }),

  // Get user repositories
  rest.get('https://api.github.com/user/repos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          description: 'A test repository',
          private: false,
          clone_url: 'https://github.com/testuser/test-repo.git',
          ssh_url: 'git@github.com:testuser/test-repo.git',
          default_branch: 'main',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'another-repo',
          full_name: 'testuser/another-repo',
          description: 'Another test repository',
          private: true,
          clone_url: 'https://github.com/testuser/another-repo.git',
          ssh_url: 'git@github.com:testuser/another-repo.git',
          default_branch: 'main',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ])
    );
  }),

  // Get repository details
  rest.get('https://api.github.com/repos/:owner/:repo', (req, res, ctx) => {
    const { owner, repo } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        id: 1,
        name: repo,
        full_name: `${owner}/${repo}`,
        description: 'A test repository',
        private: false,
        clone_url: `https://github.com/${owner}/${repo}.git`,
        ssh_url: `git@github.com:${owner}/${repo}.git`,
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
        stargazers_count: 100,
        watchers_count: 50,
        forks_count: 25,
      })
    );
  }),

  // Get repository branches
  rest.get('https://api.github.com/repos/:owner/:repo/branches', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          name: 'main',
          commit: {
            sha: 'abc123',
            url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123',
          },
          protected: true,
        },
        {
          name: 'develop',
          commit: {
            sha: 'def456',
            url: 'https://api.github.com/repos/testuser/test-repo/commits/def456',
          },
          protected: false,
        },
      ])
    );
  }),

  // Authentication endpoint
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

  // Rate limit endpoint
  rest.get('https://api.github.com/rate_limit', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: Date.now() / 1000 + 3600,
          used: 1,
        },
      })
    );
  }),
];

// Create MSW server instance
export const server = setupServer(...githubHandlers);

// Helper function to add custom handlers for specific tests
export const addHandlers = (...handlers: any[]) => {
  server.use(...handlers);
};

// Helper function to reset handlers to defaults
export const resetHandlers = () => {
  server.resetHandlers(...githubHandlers);
};

// Helper to simulate API errors
export const simulateApiError = (endpoint: string, status: number = 500) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ message: 'API Error' }));
    })
  );
};

// Helper to simulate rate limiting
export const simulateRateLimit = () => {
  server.use(
    rest.get('https://api.github.com/*', (req, res, ctx) => {
      return res(
        ctx.status(403),
        ctx.json({
          message: 'API rate limit exceeded',
          documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
        })
      );
    })
  );
};