import { ipcMain, shell } from 'electron';
import { Octokit } from '@octokit/rest';
import Store from 'electron-store';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import { OAuthCallbackServer } from './oauthCallbackServer';

interface OAuthState {
  codeVerifier: string;
  state: string;
  timestamp: number;
}

class GitHubService {
  private octokit: Octokit | null = null;
  private store: Store;
  private oauthState: OAuthState | null = null;
  private callbackServer: OAuthCallbackServer;
  private readonly CLIENT_ID = 'Ov23liCgCTZWtAJfCdRw';
  private readonly REDIRECT_URI = 'http://localhost:3001/auth/github/callback';
  private readonly SCOPES = ['repo', 'user:email', 'workflow'];

  constructor() {
    this.store = new Store();
    this.callbackServer = new OAuthCallbackServer();
    this.registerHandlers();
    this.initializeFromStore();
  }

  private async initializeFromStore() {
    const token = this.store.get('github-token') as string | undefined;
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  private generateCodeVerifier(): string {
    return CryptoJS.lib.WordArray.random(64).toString(CryptoJS.enc.Base64url);
  }

  private generateCodeChallenge(verifier: string): string {
    return CryptoJS.SHA256(verifier).toString(CryptoJS.enc.Base64url);
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private startOAuthFlow(): string {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    this.oauthState = {
      codeVerifier,
      state,
      timestamp: Date.now(),
    };

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('scope', this.SCOPES.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return authUrl.toString();
  }

  private async exchangeCodeForToken(code: string, state: string): Promise<string> {
    if (!this.oauthState) {
      throw new Error('No OAuth state found');
    }

    if (state !== this.oauthState.state) {
      throw new Error('Invalid state parameter');
    }

    const tokenUrl = 'https://github.com/login/oauth/access_token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        code,
        redirect_uri: this.REDIRECT_URI,
        code_verifier: this.oauthState.codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }

    this.oauthState = null;
    return data.access_token;
  }

  private registerHandlers() {
    ipcMain.handle('github-auth', async (_, token: string) => {
      try {
        this.octokit = new Octokit({ auth: token });
        
        const { data: user } = await this.octokit.users.getAuthenticated();
        
        this.store.set('github-token', token);
        this.store.set('github-user', user);
        this.store.set('github-auth-method', 'token');
        
        return true;
      } catch (error) {
        this.octokit = null;
        throw new Error(`GitHub authentication failed: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-user', async () => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const cachedUser = this.store.get('github-user');
        if (cachedUser) {
          return cachedUser;
        }

        const { data: user } = await this.octokit.users.getAuthenticated();
        this.store.set('github-user', user);
        return user;
      } catch (error) {
        throw new Error(`Failed to get user: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-repos', async () => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
          sort: 'updated',
          per_page: 100,
        });
        
        return repos;
      } catch (error) {
        throw new Error(`Failed to get repositories: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-pull-requests', async (_, owner: string, repo: string) => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const { data: pullRequests } = await this.octokit.pulls.list({
          owner,
          repo,
          state: 'open',
        });
        
        return pullRequests;
      } catch (error) {
        throw new Error(`Failed to get pull requests: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-issues', async (_, owner: string, repo: string) => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const { data: issues } = await this.octokit.issues.listForRepo({
          owner,
          repo,
          state: 'open',
        });
        
        return issues;
      } catch (error) {
        throw new Error(`Failed to get issues: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-create-pr', async (_, params: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      head: string;
      base: string;
    }) => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const { data: pr } = await this.octokit.pulls.create(params);
        return pr;
      } catch (error) {
        throw new Error(`Failed to create pull request: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-workflow-runs', async (_, owner: string, repo: string) => {
      if (!this.octokit) {
        throw new Error('Not authenticated with GitHub');
      }

      try {
        const { data: workflowRuns } = await this.octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          per_page: 10,
        });
        
        return workflowRuns;
      } catch (error) {
        throw new Error(`Failed to get workflow runs: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('github-logout', async () => {
      this.octokit = null;
      this.store.delete('github-token');
      this.store.delete('github-user');
      return true;
    });

    ipcMain.handle('github-oauth-start', async () => {
      try {
        const authUrl = this.startOAuthFlow();
        await shell.openExternal(authUrl);
        
        const result = await this.callbackServer.start();
        
        if (result.error) {
          throw new Error(`OAuth failed: ${result.error}`);
        }
        
        if (result.code && result.state) {
          const token = await this.exchangeCodeForToken(result.code, result.state);
          
          this.octokit = new Octokit({ auth: token });
          
          const { data: user } = await this.octokit.users.getAuthenticated();
          
          this.store.set('github-token', token);
          this.store.set('github-user', user);
          this.store.set('github-auth-method', 'oauth');
          
          return user;
        }
        
        throw new Error('OAuth flow incomplete');
      } catch (error) {
        this.callbackServer.stop();
        throw new Error(`Failed to complete OAuth flow: ${(error as Error).message}`);
      }
    });

  }
}

export default GitHubService;