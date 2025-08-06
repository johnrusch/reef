import { ipcMain } from 'electron';
import simpleGit, { SimpleGit } from 'simple-git';

class GitService {
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private getGitInstance(repoPath: string): SimpleGit {
    if (!this.gitInstances.has(repoPath)) {
      this.gitInstances.set(repoPath, simpleGit(repoPath));
    }
    return this.gitInstances.get(repoPath)!;
  }

  private registerHandlers() {
    ipcMain.handle('git-execute', async (_, repoPath: string, command: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.raw(command);
        return result;
      } catch (error) {
        throw new Error(`Git command failed: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-status', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const status = await git.status();
        
        return {
          ahead: status.ahead,
          behind: status.behind,
          modified: status.modified.length,
          staged: status.staged.length,
          untracked: status.not_added.length,
          currentBranch: status.current,
          tracking: status.tracking,
          files: status.files,
        };
      } catch (error) {
        throw new Error(`Failed to get repository status: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-fetch', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.fetch();
        return true;
      } catch (error) {
        throw new Error(`Failed to fetch: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-pull', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.pull();
        return result;
      } catch (error) {
        throw new Error(`Failed to pull: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-push', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.push();
        return result;
      } catch (error) {
        throw new Error(`Failed to push: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-commit', async (_, repoPath: string, message: string, files?: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        
        if (files && files.length > 0) {
          await git.add(files);
        } else {
          await git.add('.');
        }
        
        const result = await git.commit(message);
        return result;
      } catch (error) {
        throw new Error(`Failed to commit: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-branches', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const branches = await git.branchLocal();
        return branches;
      } catch (error) {
        throw new Error(`Failed to get branches: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-checkout', async (_, repoPath: string, branch: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.checkout(branch);
        return true;
      } catch (error) {
        throw new Error(`Failed to checkout branch: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-log', async (_, repoPath: string, options?: any) => {
      try {
        const git = this.getGitInstance(repoPath);
        const log = await git.log(options);
        return log;
      } catch (error) {
        throw new Error(`Failed to get log: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-clone', async (_, url: string, localPath: string) => {
      try {
        await simpleGit().clone(url, localPath);
        return true;
      } catch (error) {
        throw new Error(`Failed to clone repository: ${(error as Error).message}`);
      }
    });
  }
}

export default GitService;