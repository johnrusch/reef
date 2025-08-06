import { ipcMain } from 'electron';
import { Octokit } from '@octokit/rest';
import Store from 'electron-store';

class GitHubService {
  private octokit: Octokit | null = null;
  private store: Store;

  constructor() {
    this.store = new Store();
    this.registerHandlers();
    this.initializeFromStore();
  }

  private async initializeFromStore() {
    const token = this.store.get('github-token') as string | undefined;
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  private registerHandlers() {
    ipcMain.handle('github-auth', async (_, token: string) => {
      try {
        this.octokit = new Octokit({ auth: token });
        
        const { data: user } = await this.octokit.users.getAuthenticated();
        
        this.store.set('github-token', token);
        this.store.set('github-user', user);
        
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
  }
}

export default GitHubService;