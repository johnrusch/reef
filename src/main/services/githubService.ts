import { ipcMain, shell, dialog } from 'electron';
import { Octokit } from '@octokit/rest';
import Store from 'electron-store';

interface DeviceFlowState {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  timestamp: number;
}

class GitHubService {
  private octokit: Octokit | null = null;
  private store: Store;
  private deviceFlowState: DeviceFlowState | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly CLIENT_ID = '178c6fc778ccc68e1d6a';
  private readonly SCOPES = ['repo', 'user:email', 'workflow'];

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

  private async startDeviceFlow(): Promise<DeviceFlowState> {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES.join(' '),
      }),
    });

    if (!response.ok) {
      throw new Error(`Device flow initiation failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    this.deviceFlowState = {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
      timestamp: Date.now(),
    };

    return this.deviceFlowState;
  }

  private async pollForToken(): Promise<string> {
    if (!this.deviceFlowState) {
      throw new Error('No device flow state found');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        device_code: this.deviceFlowState.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token polling failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      if (data.error === 'authorization_pending') {
        return '';
      } else if (data.error === 'slow_down') {
        if (this.deviceFlowState) {
          this.deviceFlowState.interval = (this.deviceFlowState.interval || 5) + 5;
        }
        return '';
      } else {
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
      }
    }

    return data.access_token;
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.deviceFlowState = null;
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
        const deviceFlow = await this.startDeviceFlow();
        
        await shell.openExternal(`${deviceFlow.verificationUri}?user_code=${deviceFlow.userCode}`);
        
        dialog.showMessageBox({
          type: 'info',
          title: 'GitHub Authentication',
          message: `Enter this code on GitHub: ${deviceFlow.userCode}`,
          detail: 'A browser window has been opened. Please enter the code above to authorize Reef.',
          buttons: ['OK'],
        });

        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = Math.floor(deviceFlow.expiresIn / deviceFlow.interval);
          
          this.pollingInterval = setInterval(async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
              this.stopPolling();
              reject(new Error('Authorization timeout'));
              return;
            }
            
            try {
              const token = await this.pollForToken();
              
              if (token) {
                this.stopPolling();
                
                this.octokit = new Octokit({ auth: token });
                
                const { data: user } = await this.octokit.users.getAuthenticated();
                
                this.store.set('github-token', token);
                this.store.set('github-user', user);
                this.store.set('github-auth-method', 'device');
                
                resolve(user);
              }
            } catch (error) {
              this.stopPolling();
              reject(error);
            }
          }, deviceFlow.interval * 1000);
        });
      } catch (error) {
        this.stopPolling();
        throw new Error(`Failed to complete device flow: ${(error as Error).message}`);
      }
    });

  }
}

export default GitHubService;