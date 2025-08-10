import { ipcMain } from 'electron';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

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

    ipcMain.handle('git-add', async (_, repoPath: string, files: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.add(files);
        return true;
      } catch (error) {
        throw new Error(`Failed to add files: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-reset', async (_, repoPath: string, files: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.reset(files);
        return true;
      } catch (error) {
        throw new Error(`Failed to reset files: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-diff', async (_, repoPath: string, file?: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const args = file ? ['--', file] : [];
        const diff = await git.diff(args);
        return diff;
      } catch (error) {
        throw new Error(`Failed to get diff: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-create-branch', async (_, repoPath: string, branchName: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.checkoutLocalBranch(branchName);
        return true;
      } catch (error) {
        throw new Error(`Failed to create branch: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-delete-branch', async (_, repoPath: string, branchName: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.deleteLocalBranch(branchName);
        return true;
      } catch (error) {
        throw new Error(`Failed to delete branch: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-get-remotes', async (_, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const remotes = await git.getRemotes(true);
        return remotes;
      } catch (error) {
        throw new Error(`Failed to get remotes: ${(error as Error).message}`);
      }
    });

    ipcMain.handle('git-revert-lines', async (_, repoPath: string, fileName: string, lineChanges: any) => {
      try {
        // Validate fileName to prevent path traversal attacks
        const normalizedFileName = path.normalize(fileName);
        if (normalizedFileName.includes('..') || path.isAbsolute(normalizedFileName)) {
          throw new Error('Invalid file name: path traversal attempt detected');
        }
        
        const filePath = path.join(repoPath, normalizedFileName);
        
        // Ensure the resulting path is within the repository
        const resolvedPath = path.resolve(filePath);
        const resolvedRepoPath = path.resolve(repoPath);
        if (!resolvedPath.startsWith(resolvedRepoPath)) {
          throw new Error('Invalid file path: file is outside repository');
        }
        
        const fileContent = await fs.readFile(resolvedPath, 'utf-8');
        const lines = fileContent.split('\n');
        
        // Group changes by type to handle them in the correct order
        const additions = lineChanges.lines.filter((c: any) => c.type === 'add');
        const removals = lineChanges.lines.filter((c: any) => c.type === 'remove');
        
        // First, remove all additions (in reverse order to maintain line numbers)
        const sortedAdditions = [...additions].sort((a, b) => b.lineNumber - a.lineNumber);
        for (const change of sortedAdditions) {
          const lineIndex = change.lineNumber - 1;
          // Check exact match first (including whitespace)
          if (lines[lineIndex] === change.content) {
            lines.splice(lineIndex, 1);
          } else if (lines[lineIndex]?.trim() === change.content.trim()) {
            // Fall back to trimmed comparison if exact match fails
            lines.splice(lineIndex, 1);
          } else {
            // Last resort: search for the line (exact match)
            const foundIndex = lines.findIndex(line => line === change.content);
            if (foundIndex !== -1) {
              lines.splice(foundIndex, 1);
            } else {
              // If still not found, try trimmed search as final fallback
              const trimmedIndex = lines.findIndex(line => line.trim() === change.content.trim());
              if (trimmedIndex !== -1) {
                lines.splice(trimmedIndex, 1);
              }
            }
          }
        }
        
        // Then, restore all removals (in original order)
        const sortedRemovals = [...removals].sort((a, b) => a.lineNumber - b.lineNumber);
        for (const change of sortedRemovals) {
          // For removals, we need to find the right position after additions have been removed
          const lineIndex = Math.min(lines.length, Math.max(0, change.lineNumber - 1));
          lines.splice(lineIndex, 0, change.content);
        }
        
        // Write the modified content back to the file
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
        
        return true;
      } catch (error) {
        throw new Error(`Failed to revert lines: ${(error as Error).message}`);
      }
    });
  }
}

export default GitService;