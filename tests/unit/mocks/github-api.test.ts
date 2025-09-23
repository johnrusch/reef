import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { server, simulateApiError, simulateRateLimit, resetHandlers } from '../../msw-setup';

describe('GitHub API Mocking with MSW', () => {
  beforeAll(() => {
    // Start MSW server before all tests
    server.listen();
  });

  afterEach(() => {
    // Reset handlers after each test
    resetHandlers();
  });

  afterAll(() => {
    // Clean up after all tests
    server.close();
  });

  test('MSW server should be running', () => {
    expect(server.listHandlers()).toHaveLength(expect.any(Number));
    expect(server.listHandlers().length).toBeGreaterThan(0);
  });

  test('should mock GitHub user API successfully', async () => {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'token fake-token' }
    });
    
    expect(response.ok).toBe(true);
    const user = await response.json();
    
    expect(user).toEqual({
      login: 'testuser',
      id: 12345,
      avatar_url: expect.any(String),
      name: 'Test User',
      email: 'test@example.com',
      public_repos: 10,
      followers: 5,
      following: 8,
    });
  });

  test('should mock GitHub repositories API', async () => {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: 'token fake-token' }
    });
    
    expect(response.ok).toBe(true);
    const repos = await response.json();
    
    expect(Array.isArray(repos)).toBe(true);
    expect(repos).toHaveLength(2);
    expect(repos[0]).toEqual(expect.objectContaining({
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      description: expect.any(String),
      private: false,
    }));
  });

  test('should handle API error simulation', async () => {
    simulateApiError('https://api.github.com/user', 500);
    
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'token fake-token' }
    });
    
    expect(response.status).toBe(500);
    const error = await response.json();
    expect(error.message).toBe('API Error');
  });

  test('should handle rate limiting simulation', async () => {
    simulateRateLimit();
    
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'token fake-token' }
    });
    
    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.message).toContain('rate limit');
  });

  test('should mock repository details API', async () => {
    const response = await fetch('https://api.github.com/repos/testuser/test-repo', {
      headers: { Authorization: 'token fake-token' }
    });
    
    expect(response.ok).toBe(true);
    const repo = await response.json();
    
    expect(repo).toEqual(expect.objectContaining({
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      stargazers_count: expect.any(Number),
      watchers_count: expect.any(Number),
      forks_count: expect.any(Number),
    }));
  });

  test('should mock authentication flow', async () => {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        code: 'test-code'
      })
    });
    
    expect(response.ok).toBe(true);
    const auth = await response.json();
    
    expect(auth).toEqual(expect.objectContaining({
      access_token: expect.stringContaining('gho_'),
      token_type: 'bearer',
      scope: expect.any(String),
    }));
  });
});