// GitHub API response fixtures for testing

// User data fixtures
export const userFixtures = {
  validUser: {
    login: 'testuser',
    id: 12345,
    avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    followers_url: 'https://api.github.com/users/testuser/followers',
    following_url: 'https://api.github.com/users/testuser/following{/other_user}',
    gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/testuser/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/testuser/subscriptions',
    organizations_url: 'https://api.github.com/users/testuser/orgs',
    repos_url: 'https://api.github.com/users/testuser/repos',
    events_url: 'https://api.github.com/users/testuser/events{/privacy}',
    received_events_url: 'https://api.github.com/users/testuser/received_events',
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
  },

  organizationUser: {
    login: 'testorg',
    id: 67890,
    avatar_url: 'https://avatars.githubusercontent.com/u/67890?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/testorg',
    html_url: 'https://github.com/testorg',
    type: 'Organization',
    site_admin: false,
    name: 'Test Organization',
    company: null,
    blog: 'https://testorg.com',
    location: 'Everywhere',
    email: 'contact@testorg.com',
    hireable: null,
    bio: 'A test organization for testing',
    twitter_username: 'testorg',
    public_repos: 150,
    public_gists: 0,
    followers: 500,
    following: 0,
    created_at: '2019-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },

  privateUser: {
    login: 'privateuser',
    id: 54321,
    avatar_url: 'https://avatars.githubusercontent.com/u/54321?v=4',
    type: 'User',
    site_admin: false,
    name: null,
    company: null,
    blog: null,
    location: null,
    email: null,
    hireable: null,
    bio: null,
    twitter_username: null,
    public_repos: 0,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
};

// Repository data fixtures
export const repositoryFixtures = {
  publicRepo: {
    id: 1,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: userFixtures.validUser,
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
    description: 'A test repository for testing purposes',
    fork: false,
    url: 'https://api.github.com/repos/testuser/test-repo',
    archive_url: 'https://api.github.com/repos/testuser/test-repo/{archive_format}{/ref}',
    assignees_url: 'https://api.github.com/repos/testuser/test-repo/assignees{/user}',
    blobs_url: 'https://api.github.com/repos/testuser/test-repo/git/blobs{/sha}',
    branches_url: 'https://api.github.com/repos/testuser/test-repo/branches{/branch}',
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
    has_downloads: true,
    archived: false,
    disabled: false,
    open_issues_count: 2,
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZW1pdA==',
    },
    allow_forking: true,
    is_template: false,
    topics: ['typescript', 'testing', 'electron'],
    visibility: 'public',
    forks: 10,
    forks_count: 10,
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
    temp_clone_token: '',
    network_count: 10,
    subscribers_count: 25,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    pushed_at: '2023-01-01T12:00:00Z',
  },

  privateRepo: {
    id: 2,
    name: 'private-repo',
    full_name: 'testuser/private-repo',
    owner: userFixtures.validUser,
    private: true,
    html_url: 'https://github.com/testuser/private-repo',
    description: 'A private test repository',
    fork: false,
    url: 'https://api.github.com/repos/testuser/private-repo',
    clone_url: 'https://github.com/testuser/private-repo.git',
    ssh_url: 'git@github.com:testuser/private-repo.git',
    svn_url: 'https://github.com/testuser/private-repo',
    homepage: null,
    size: 512,
    stargazers_count: 0,
    watchers_count: 0,
    language: 'JavaScript',
    has_issues: true,
    has_projects: false,
    has_wiki: false,
    has_pages: false,
    has_downloads: true,
    archived: false,
    disabled: false,
    open_issues_count: 1,
    license: null,
    allow_forking: false,
    is_template: false,
    topics: [],
    visibility: 'private',
    forks: 0,
    forks_count: 0,
    open_issues: 1,
    watchers: 0,
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

  forkedRepo: {
    id: 3,
    name: 'forked-repo',
    full_name: 'testuser/forked-repo',
    owner: userFixtures.validUser,
    private: false,
    html_url: 'https://github.com/testuser/forked-repo',
    description: 'A forked repository for testing',
    fork: true,
    parent: {
      id: 999,
      name: 'original-repo',
      full_name: 'originaluser/original-repo',
      owner: {
        login: 'originaluser',
        id: 99999,
        type: 'User',
      },
      private: false,
      html_url: 'https://github.com/originaluser/original-repo',
      clone_url: 'https://github.com/originaluser/original-repo.git',
    },
    source: {
      id: 999,
      name: 'original-repo',
      full_name: 'originaluser/original-repo',
    },
    url: 'https://api.github.com/repos/testuser/forked-repo',
    clone_url: 'https://github.com/testuser/forked-repo.git',
    ssh_url: 'git@github.com:testuser/forked-repo.git',
    svn_url: 'https://github.com/testuser/forked-repo',
    homepage: 'https://originaluser.dev/original-repo',
    size: 2048,
    stargazers_count: 75,
    watchers_count: 75,
    language: 'Python',
    has_issues: false,
    has_projects: true,
    has_wiki: true,
    has_pages: true,
    archived: false,
    disabled: false,
    open_issues_count: 0,
    license: {
      key: 'apache-2.0',
      name: 'Apache License 2.0',
      spdx_id: 'Apache-2.0',
    },
    forks: 5,
    forks_count: 5,
    open_issues: 0,
    watchers: 75,
    default_branch: 'main',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    created_at: '2022-08-15T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    pushed_at: '2023-01-03T15:30:00Z',
  },

  archivedRepo: {
    id: 4,
    name: 'archived-repo',
    full_name: 'testuser/archived-repo',
    owner: userFixtures.validUser,
    private: false,
    html_url: 'https://github.com/testuser/archived-repo',
    description: 'An archived repository',
    fork: false,
    archived: true,
    disabled: false,
    clone_url: 'https://github.com/testuser/archived-repo.git',
    ssh_url: 'git@github.com:testuser/archived-repo.git',
    default_branch: 'master',
    permissions: {
      admin: true,
      maintain: false,
      push: false,
      triage: false,
      pull: true,
    },
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2021-12-31T00:00:00Z',
    pushed_at: '2021-12-31T23:59:59Z',
  },
};

// Branch data fixtures
export const branchFixtures = {
  mainBranch: {
    name: 'main',
    commit: {
      sha: 'abc123def456789',
      url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123def456789',
    },
    protected: true,
    protection: {
      enabled: true,
      required_status_checks: {
        enforcement_level: 'everyone',
        contexts: ['ci/tests', 'ci/lint'],
      },
    },
    protection_url: 'https://api.github.com/repos/testuser/test-repo/branches/main/protection',
  },

  developBranch: {
    name: 'develop',
    commit: {
      sha: 'def456ghi789abc',
      url: 'https://api.github.com/repos/testuser/test-repo/commits/def456ghi789abc',
    },
    protected: false,
    protection: {
      enabled: false,
    },
    protection_url: 'https://api.github.com/repos/testuser/test-repo/branches/develop/protection',
  },

  featureBranch: {
    name: 'feature/new-feature',
    commit: {
      sha: 'ghi789jkl012mno',
      url: 'https://api.github.com/repos/testuser/test-repo/commits/ghi789jkl012mno',
    },
    protected: false,
    protection: {
      enabled: false,
    },
  },
};

// Commit data fixtures
export const commitFixtures = {
  recentCommit: {
    sha: 'abc123def456789',
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
      message: 'feat: add new feature\n\nThis commit adds a new feature to the application.\n\nCloses #123',
      tree: {
        sha: 'tree123456789',
        url: 'https://api.github.com/repos/testuser/test-repo/git/trees/tree123456789',
      },
      url: 'https://api.github.com/repos/testuser/test-repo/git/commits/abc123def456789',
      comment_count: 0,
      verification: {
        verified: true,
        reason: 'valid',
        signature: '-----BEGIN PGP SIGNATURE-----',
        payload: 'commit payload',
      },
    },
    url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123def456789',
    html_url: 'https://github.com/testuser/test-repo/commit/abc123def456789',
    comments_url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123def456789/comments',
    author: userFixtures.validUser,
    committer: userFixtures.validUser,
    parents: [
      {
        sha: 'parent123456789',
        url: 'https://api.github.com/repos/testuser/test-repo/commits/parent123456789',
        html_url: 'https://github.com/testuser/test-repo/commit/parent123456789',
      },
    ],
    stats: {
      total: 25,
      additions: 20,
      deletions: 5,
    },
    files: [
      {
        sha: 'file123456789',
        filename: 'src/feature.ts',
        status: 'added',
        additions: 15,
        deletions: 0,
        changes: 15,
        blob_url: 'https://github.com/testuser/test-repo/blob/abc123def456789/src/feature.ts',
        raw_url: 'https://github.com/testuser/test-repo/raw/abc123def456789/src/feature.ts',
        contents_url: 'https://api.github.com/repos/testuser/test-repo/contents/src/feature.ts?ref=abc123def456789',
        patch: '@@ -0,0 +1,15 @@\n+export class Feature {\n+  // Feature implementation\n+}',
      },
      {
        sha: 'file987654321',
        filename: 'README.md',
        status: 'modified',
        additions: 5,
        deletions: 5,
        changes: 10,
        blob_url: 'https://github.com/testuser/test-repo/blob/abc123def456789/README.md',
        raw_url: 'https://github.com/testuser/test-repo/raw/abc123def456789/README.md',
        contents_url: 'https://api.github.com/repos/testuser/test-repo/contents/README.md?ref=abc123def456789',
        patch: '@@ -1,5 +1,5 @@\n # Test Repo\n-Old description\n+New description with feature',
      },
    ],
  },

  mergeCommit: {
    sha: 'merge123456789',
    commit: {
      author: {
        name: 'Test User',
        email: 'test@example.com',
        date: '2023-01-02T14:30:00Z',
      },
      committer: {
        name: 'GitHub',
        email: 'noreply@github.com',
        date: '2023-01-02T14:30:00Z',
      },
      message: 'Merge pull request #456 from testuser/feature-branch\n\nAdd awesome new feature',
      tree: {
        sha: 'tree987654321',
        url: 'https://api.github.com/repos/testuser/test-repo/git/trees/tree987654321',
      },
    },
    parents: [
      {
        sha: 'parent1123456789',
        url: 'https://api.github.com/repos/testuser/test-repo/commits/parent1123456789',
      },
      {
        sha: 'parent2123456789',
        url: 'https://api.github.com/repos/testuser/test-repo/commits/parent2123456789',
      },
    ],
    author: userFixtures.validUser,
    committer: {
      login: 'web-flow',
      id: 19864447,
      type: 'User',
    },
  },
};

// Rate limit fixtures
export const rateLimitFixtures = {
  normal: {
    rate: {
      limit: 5000,
      remaining: 4500,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 500,
      resource: 'core',
    },
    search: {
      limit: 30,
      remaining: 25,
      reset: Math.floor(Date.now() / 1000) + 60,
      used: 5,
      resource: 'search',
    },
    graphql: {
      limit: 5000,
      remaining: 5000,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 0,
      resource: 'graphql',
    },
  },

  nearLimit: {
    rate: {
      limit: 5000,
      remaining: 100,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 4900,
      resource: 'core',
    },
    search: {
      limit: 30,
      remaining: 2,
      reset: Math.floor(Date.now() / 1000) + 60,
      used: 28,
      resource: 'search',
    },
  },

  exceeded: {
    rate: {
      limit: 5000,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 5000,
      resource: 'core',
    },
    search: {
      limit: 30,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
      used: 30,
      resource: 'search',
    },
  },
};

// Error response fixtures
export const errorFixtures = {
  unauthorized: {
    message: 'Requires authentication',
    documentation_url: 'https://docs.github.com/rest/reference/users#get-the-authenticated-user',
  },

  forbidden: {
    message: 'Forbidden',
    documentation_url: 'https://docs.github.com/rest',
  },

  notFound: {
    message: 'Not Found',
    documentation_url: 'https://docs.github.com/rest',
  },

  rateLimitExceeded: {
    message: 'API rate limit exceeded for user ID 12345.',
    documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
  },

  serverError: {
    message: 'Server Error',
    documentation_url: 'https://docs.github.com/rest',
  },

  validationFailed: {
    message: 'Validation Failed',
    errors: [
      {
        resource: 'Issue',
        field: 'title',
        code: 'missing_field',
      },
    ],
    documentation_url: 'https://docs.github.com/rest/reference/issues#create-an-issue',
  },
};

// Authentication fixtures
export const authFixtures = {
  personalAccessToken: {
    access_token: 'gho_16C7e42F292c6912E7710c838347Ae178B4a',
    token_type: 'bearer',
    scope: 'repo,user,workflow',
  },

  oauthToken: {
    access_token: 'gho_16C7e42F292c6912E7710c838347Ae178B4a',
    token_type: 'bearer',
    scope: 'repo,user',
    refresh_token: 'ghr_1B4a2e77838347a253B36E72D251A2063A46',
    refresh_token_expires_in: 15777000,
    expires_in: 28800,
  },

  appToken: {
    token: 'ghs_16C7e42F292c6912E7710c838347Ae178B4a',
    expires_at: '2023-01-01T13:00:00Z',
    permissions: {
      contents: 'read',
      metadata: 'read',
      pull_requests: 'write',
    },
    repository_selection: 'selected',
  },
};

// Pagination fixtures
export const paginationFixtures = {
  firstPage: {
    data: repositoryFixtures,
    headers: {
      link: '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=10>; rel="last"',
      'x-total-count': '100',
    },
  },

  middlePage: {
    data: repositoryFixtures,
    headers: {
      link: '<https://api.github.com/user/repos?page=1>; rel="first", <https://api.github.com/user/repos?page=4>; rel="prev", <https://api.github.com/user/repos?page=6>; rel="next", <https://api.github.com/user/repos?page=10>; rel="last"',
      'x-total-count': '100',
    },
  },

  lastPage: {
    data: [repositoryFixtures.archivedRepo],
    headers: {
      link: '<https://api.github.com/user/repos?page=1>; rel="first", <https://api.github.com/user/repos?page=9>; rel="prev"',
      'x-total-count': '100',
    },
  },
};

// Helper functions
export const createUserResponse = (overrides: Partial<typeof userFixtures.validUser> = {}) => ({
  ...userFixtures.validUser,
  ...overrides,
});

export const createRepoResponse = (overrides: Partial<typeof repositoryFixtures.publicRepo> = {}) => ({
  ...repositoryFixtures.publicRepo,
  ...overrides,
});

export const createErrorResponse = (status: number, type: keyof typeof errorFixtures) => ({
  status,
  data: errorFixtures[type],
});

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  perPage: number,
  total: number
) => {
  const totalPages = Math.ceil(total / perPage);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  let link = '';
  if (page === 1 && hasNext) {
    link = `<https://api.github.com/user/repos?page=${page + 1}>; rel="next", <https://api.github.com/user/repos?page=${totalPages}>; rel="last"`;
  } else if (page > 1 && hasNext) {
    link = `<https://api.github.com/user/repos?page=1>; rel="first", <https://api.github.com/user/repos?page=${page - 1}>; rel="prev", <https://api.github.com/user/repos?page=${page + 1}>; rel="next", <https://api.github.com/user/repos?page=${totalPages}>; rel="last"`;
  } else if (page === totalPages && hasPrev) {
    link = `<https://api.github.com/user/repos?page=1>; rel="first", <https://api.github.com/user/repos?page=${page - 1}>; rel="prev"`;
  }

  return {
    data,
    headers: {
      link,
      'x-total-count': total.toString(),
    },
  };
};

// Export all fixtures
export {
  userFixtures,
  repositoryFixtures,
  branchFixtures,
  commitFixtures,
  rateLimitFixtures,
  errorFixtures,
  authFixtures,
  paginationFixtures,
};