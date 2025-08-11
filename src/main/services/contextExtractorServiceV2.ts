import * as fs from 'fs/promises';
import * as path from 'path';
import { ipcMain } from 'electron';
import tokenCounterService from './tokenCounterService';
import type { ExtractorOptions, ExtractionResult } from '../../shared/types/diagram';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  priority: 'critical' | 'important' | 'optional';
  tokens?: number;
}

export interface RepositoryType {
  type: 'react' | 'node' | 'fullstack' | 'library' | 'unknown';
  confidence: number;
  characteristics: string[];
}

class ContextExtractorServiceV2 {
  // Enhanced file patterns with repository-specific priorities
  private readonly FILE_PATTERNS = {
    critical: {
      common: [
        /^main\.(ts|js|tsx|jsx)$/,
        /^index\.(ts|js|tsx|jsx)$/,
        /^app\.(ts|js|tsx|jsx)$/,
      ],
      react: [
        /^App\.(tsx|jsx)$/,
        /\/routes\//,
        /\/pages\//,
        /\/store\//,
        /\/hooks\//,
      ],
      node: [
        /^server\.(ts|js)$/,
        /\/controllers\//,
        /\/routes\//,
        /\/middleware\//,
        /\/api\//,
      ],
      fullstack: [
        /\/api\//,
        /\/server\//,
        /\/client\//,
        /\/shared\//,
      ],
    },
    important: {
      common: [
        /package\.json$/,
        /tsconfig\.json$/,
        /\.config\.(ts|js)$/,
      ],
      react: [
        /\/components\//,
        /\/contexts\//,
        /\/providers\//,
      ],
      node: [
        /\/models\//,
        /\/services\//,
        /\/schemas\//,
        /\/database\//,
      ],
      all: [
        /\/interfaces\//,
        /\/types\//,
        /\/constants\//,
      ],
    },
    optional: {
      all: [
        /\/utils\//,
        /\/helpers\//,
        /\/lib\//,
        /README\.md$/,
        /\/styles\//,
        /\/assets\//,
      ],
    },
  };

  private readonly EXCLUDE_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /coverage/,
    /\.test\.(ts|js|tsx|jsx)$/,
    /\.spec\.(ts|js|tsx|jsx)$/,
    /\.d\.ts$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.env/,
    /\.DS_Store/,
    /\.cache/,
    /\.next/,
    /\.nuxt/,
    /\.vscode/,
    /\.idea/,
  ];

  private readonly MAX_FILE_SIZE = 100000; // 100KB per file
  private readonly CHUNK_SIZE = 10000; // 10KB chunks for reading

  /**
   * Detect repository type based on file structure and dependencies
   */
  public async detectRepositoryType(repoPath: string): Promise<RepositoryType> {
    const characteristics: string[] = [];
    let type: RepositoryType['type'] = 'unknown';
    let confidence = 0;

    try {
      // Check package.json for clues
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageJson = await this.readJsonFile(packageJsonPath);
      
      if (packageJson) {
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // React indicators
        if (deps.react || deps['react-dom']) {
          characteristics.push('react');
          confidence += 30;
        }
        if (deps.next || deps.gatsby) {
          characteristics.push('react-framework');
          confidence += 20;
        }

        // Node/Express indicators
        if (deps.express || deps.fastify || deps.koa) {
          characteristics.push('node-server');
          confidence += 30;
        }

        // Database indicators
        if (deps.mongoose || deps.sequelize || deps.prisma) {
          characteristics.push('database');
          confidence += 10;
        }

        // Check scripts
        if (packageJson.scripts) {
          if (packageJson.scripts.dev?.includes('vite') || packageJson.scripts.dev?.includes('webpack')) {
            characteristics.push('frontend-build');
            confidence += 10;
          }
          if (packageJson.scripts.start?.includes('node') || packageJson.scripts.start?.includes('ts-node')) {
            characteristics.push('node-runtime');
            confidence += 10;
          }
        }
      }

      // Check file structure
      const files = await this.getAllFiles(repoPath);
      
      // Look for specific directories
      if (files.some(f => f.includes('/components/') || f.includes('/pages/'))) {
        characteristics.push('frontend-structure');
        confidence += 15;
      }
      if (files.some(f => f.includes('/api/') || f.includes('/routes/') || f.includes('/controllers/'))) {
        characteristics.push('backend-structure');
        confidence += 15;
      }
      if (files.some(f => f.includes('/server/') && f.includes('/client/'))) {
        characteristics.push('monorepo');
        confidence += 20;
      }

      // Determine type based on characteristics
      const hasReact = characteristics.some(c => c.includes('react'));
      const hasNode = characteristics.some(c => c.includes('node') || c === 'backend-structure');
      const hasFrontend = characteristics.some(c => c.includes('frontend'));
      const hasBackend = characteristics.some(c => c.includes('backend') || c === 'database');

      if (hasReact && hasNode) {
        type = 'fullstack';
      } else if (hasReact || hasFrontend) {
        type = 'react';
      } else if (hasNode || hasBackend) {
        type = 'node';
      } else if (files.length < 20 && packageJson?.main) {
        type = 'library';
      }

      confidence = Math.min(100, confidence);
    } catch (error) {
      console.error('Error detecting repository type:', error);
    }

    return { type, confidence, characteristics };
  }

  /**
   * Extract context with token optimization
   */
  public async extractContext(
    repoPath: string,
    options: ExtractorOptions = {}
  ): Promise<ExtractionResult & { repoType?: RepositoryType; tokenDetails?: any }> {
    const tokenBudget = tokenCounterService.getTokenBudget();
    const maxTokens = options.maxTokens || tokenBudget.targetOptimal;
    const includeTests = options.includeTests || false;
    
    try {
      // Detect repository type for better file selection
      const repoType = await this.detectRepositoryType(repoPath);
      console.log(`Detected repository type: ${repoType.type} (confidence: ${repoType.confidence}%)`);

      // Get all files
      const allFiles = await this.getAllFiles(repoPath);
      const filteredFiles = this.filterFiles(allFiles, includeTests);
      
      // Prioritize files based on repository type
      const prioritizedFiles = await this.prioritizeFilesByType(
        repoPath,
        filteredFiles,
        repoType.type
      );

      // Select files within token budget
      const selectedFiles = await this.selectFilesWithTokenBudget(
        repoPath,
        prioritizedFiles,
        maxTokens,
        options.focusArea
      );

      // Read and process files
      const fileContents: FileContent[] = [];
      let totalSize = 0;
      let totalTokens = 0;

      for (const file of selectedFiles) {
        const fullPath = path.join(repoPath, file.path);
        const content = await this.readFileContent(fullPath, repoPath);
        
        if (content) {
          const tokens = tokenCounterService.countTokens(content.content);
          fileContents.push({
            ...content,
            priority: file.priority,
            tokens,
          });
          totalSize += content.size;
          totalTokens += tokens;
        }
      }

      // If we're over budget, use token counter to reduce
      if (totalTokens > maxTokens) {
        const reduced = tokenCounterService.reduceContext(
          fileContents,
          maxTokens
        );
        const newTotalTokens = reduced.reduce((sum, f) => {
          const tokens = tokenCounterService.countTokens(f.content);
          return sum + tokens;
        }, 0);

        return {
          files: reduced.map(f => ({
            ...f,
            size: f.size || f.content.length,
          })),
          totalSize: reduced.reduce((sum, f) => sum + f.content.length, 0),
          estimatedTokens: newTotalTokens,
          truncated: true,
          repoType,
          tokenDetails: {
            original: totalTokens,
            reduced: newTotalTokens,
            saved: totalTokens - newTotalTokens,
          },
        };
      }

      return {
        files: fileContents,
        totalSize,
        estimatedTokens: totalTokens,
        truncated: false,
        repoType,
        tokenDetails: {
          used: totalTokens,
          budget: maxTokens,
          remaining: maxTokens - totalTokens,
        },
      };
    } catch (error) {
      console.error('Context extraction error:', error);
      throw error;
    }
  }

  /**
   * Get critical files for cache invalidation tracking
   */
  public async getCriticalFiles(repoPath: string): Promise<string[]> {
    const repoType = await this.detectRepositoryType(repoPath);
    const criticalPatterns = [
      ...this.FILE_PATTERNS.critical.common,
      ...(this.FILE_PATTERNS.critical[repoType.type as keyof typeof this.FILE_PATTERNS.critical] || []),
    ];

    const allFiles = await this.getAllFiles(repoPath);
    return allFiles.filter(file => 
      criticalPatterns.some(pattern => pattern.test(file))
    );
  }

  private async getAllFiles(dirPath: string, relativePath = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Resolve base path once to establish boundary
      const resolvedBase = path.resolve(dirPath);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Security: Validate entry name to prevent path traversal
        if (entry.name.includes('..') || entry.name.includes('~') || 
            entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.env') {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        // Security: Ensure the resolved path is still within the repository
        // Use realpath to resolve symlinks and check containment
        try {
          const realFullPath = await fs.realpath(fullPath);
          const resolvedPath = path.resolve(realFullPath);
          
          // Must be within the repository root
          if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
            console.warn(`Path traversal attempt blocked: ${fullPath}`);
            continue;
          }
        } catch (err) {
          // If realpath fails (e.g., broken symlink), skip the file
          console.warn(`Skipping inaccessible path: ${fullPath}`);
          continue;
        }
        
        if (this.shouldExclude(relPath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath, relPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(relPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  }

  private shouldExclude(filePath: string): boolean {
    return this.EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
  }

  private filterFiles(files: string[], includeTests: boolean): string[] {
    return files.filter(file => {
      const ext = path.extname(file);
      const isCodeFile = ['.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.yml', '.yaml'].includes(ext);
      
      if (!isCodeFile) return false;
      
      if (!includeTests && (file.includes('.test.') || file.includes('.spec.'))) {
        return false;
      }
      
      return true;
    });
  }

  private async prioritizeFilesByType(
    _repoPath: string,
    files: string[],
    repoType: RepositoryType['type']
  ): Promise<Array<{ path: string; priority: 'critical' | 'important' | 'optional' }>> {
    const prioritized: Array<{ path: string; priority: 'critical' | 'important' | 'optional' }> = [];
    
    // Get patterns for the specific repo type
    const criticalPatterns = [
      ...this.FILE_PATTERNS.critical.common,
      ...(this.FILE_PATTERNS.critical[repoType as keyof typeof this.FILE_PATTERNS.critical] || []),
    ];
    
    const importantPatterns = [
      ...this.FILE_PATTERNS.important.common,
      ...(this.FILE_PATTERNS.important[repoType as keyof typeof this.FILE_PATTERNS.important] || []),
      ...this.FILE_PATTERNS.important.all,
    ];
    
    const optionalPatterns = this.FILE_PATTERNS.optional.all;
    
    for (const file of files) {
      let priority: 'critical' | 'important' | 'optional' = 'optional';
      
      if (criticalPatterns.some(pattern => pattern.test(file))) {
        priority = 'critical';
      } else if (importantPatterns.some(pattern => pattern.test(file))) {
        priority = 'important';
      } else if (optionalPatterns.some(pattern => pattern.test(file))) {
        priority = 'optional';
      }
      
      prioritized.push({ path: file, priority });
    }
    
    // Sort by priority
    prioritized.sort((a, b) => {
      const priorityOrder = { critical: 0, important: 1, optional: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return prioritized;
  }

  private async selectFilesWithTokenBudget(
    repoPath: string,
    files: Array<{ path: string; priority: 'critical' | 'important' | 'optional' }>,
    maxTokens: number,
    focusArea?: 'api' | 'database' | 'business-logic'
  ): Promise<Array<{ path: string; priority: 'critical' | 'important' | 'optional' }>> {
    const selected: Array<{ path: string; priority: 'critical' | 'important' | 'optional' }> = [];
    let currentTokens = 0;
    
    if (focusArea) {
      files = this.reorderByFocusArea(files, focusArea);
    }
    
    for (const file of files) {
      const fullPath = path.join(repoPath, file.path);
      
      try {
        const stat = await fs.stat(fullPath);
        
        if (stat.size > this.MAX_FILE_SIZE) {
          continue;
        }
        
        // More accurate token estimation
        const estimatedTokens = Math.ceil(stat.size / 3.5); // Conservative estimate
        
        if (currentTokens + estimatedTokens > maxTokens) {
          // Strict enforcement - no bypassing for critical files
          break;
        }
        
        selected.push(file);
        currentTokens += estimatedTokens;
      } catch (error) {
        console.error(`Error accessing file ${fullPath}:`, error);
      }
    }
    
    return selected;
  }

  private reorderByFocusArea(
    files: Array<{ path: string; priority: 'critical' | 'important' | 'optional' }>,
    focusArea: 'api' | 'database' | 'business-logic'
  ): Array<{ path: string; priority: 'critical' | 'important' | 'optional' }> {
    const focusPatterns = {
      api: [/\/routes\//, /\/controllers\//, /\/api\//, /\/endpoints\//, /\/middleware\//],
      database: [/\/models\//, /\/schemas\//, /\/migrations\//, /\/db\//, /\/entities\//],
      'business-logic': [/\/services\//, /\/domain\//, /\/business\//, /\/core\//, /\/lib\//],
    };
    
    const patterns = focusPatterns[focusArea];
    
    return files.sort((a, b) => {
      const aMatches = patterns.some(p => p.test(a.path));
      const bMatches = patterns.some(p => p.test(b.path));
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      
      const priorityOrder = { critical: 0, important: 1, optional: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private async readFileContent(filePath: string, basePath?: string): Promise<FileContent | null> {
    try {
      const stat = await fs.stat(filePath);
      
      // Calculate relative path from base (repository root)
      const effectiveBasePath = basePath || path.dirname(filePath);
      const relativePath = path.relative(effectiveBasePath, filePath) || path.basename(filePath);
      
      // Handle large files with chunking
      if (stat.size > this.MAX_FILE_SIZE) {
        let fileHandle: fs.FileHandle | undefined;
        try {
          fileHandle = await fs.open(filePath, 'r');
          const buffer = Buffer.allocUnsafe(Math.min(this.CHUNK_SIZE, stat.size));
          const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
          
          const content = buffer.slice(0, bytesRead).toString('utf-8', 0, bytesRead);
          
          // Ensure file handle is closed before returning
          await fileHandle.close();
          fileHandle = undefined;
          
          return {
            path: relativePath,
            content: content + '\n// ... file truncated (too large) ...',
            size: bytesRead,
            priority: 'optional',
          };
        } catch (bufferError) {
          console.error(`Error reading chunk from ${filePath}:`, bufferError);
          // Ensure file handle is closed in error case
          if (fileHandle) {
            try {
              await fileHandle.close();
            } catch (closeError) {
              console.error(`Error closing file handle for ${filePath}:`, closeError);
            }
          }
          return null;
        } finally {
          // Double-check file handle is closed
          if (fileHandle) {
            try {
              await fileHandle.close();
            } catch (closeError) {
              console.error(`Error closing file handle in finally for ${filePath}:`, closeError);
            }
          }
        }
      }
      
      // For smaller files, read normally
      const content = await fs.readFile(filePath, 'utf-8');
      const size = Buffer.byteLength(content, 'utf-8');
      
      return {
        path: relativePath,
        content,
        size,
        priority: 'optional',
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  private async readJsonFile(filePath: string): Promise<any | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  public formatContextForPrompt(files: FileContent[]): string {
    const sections = {
      critical: [] as FileContent[],
      important: [] as FileContent[],
      optional: [] as FileContent[],
    };
    
    for (const file of files) {
      sections[file.priority].push(file);
    }
    
    let formatted = '';
    let tokenInfo = '';
    
    if (files.length > 0 && files[0].tokens) {
      const totalTokens = files.reduce((sum, f) => sum + (f.tokens || 0), 0);
      tokenInfo = `// Total context tokens: ${totalTokens}\n\n`;
    }
    
    formatted += tokenInfo;
    
    if (sections.critical.length > 0) {
      formatted += '=== CRITICAL FILES ===\n\n';
      for (const file of sections.critical) {
        const tokenInfo = file.tokens ? ` (${file.tokens} tokens)` : '';
        formatted += `--- ${file.path}${tokenInfo} ---\n${file.content}\n\n`;
      }
    }
    
    if (sections.important.length > 0) {
      formatted += '=== IMPORTANT FILES ===\n\n';
      for (const file of sections.important) {
        const tokenInfo = file.tokens ? ` (${file.tokens} tokens)` : '';
        formatted += `--- ${file.path}${tokenInfo} ---\n${file.content}\n\n`;
      }
    }
    
    if (sections.optional.length > 0) {
      formatted += '=== ADDITIONAL CONTEXT ===\n\n';
      for (const file of sections.optional) {
        const tokenInfo = file.tokens ? ` (${file.tokens} tokens)` : '';
        formatted += `--- ${file.path}${tokenInfo} ---\n${file.content}\n\n`;
      }
    }
    
    return formatted;
  }
}

const contextExtractorServiceV2 = new ContextExtractorServiceV2();

// IPC handlers for the enhanced context extractor
ipcMain.handle('context:extract-v2', async (_, repoPath: string, options: ExtractorOptions) => {
  const result = await contextExtractorServiceV2.extractContext(repoPath, options);
  const formatted = contextExtractorServiceV2.formatContextForPrompt(result.files);
  
  return {
    ...result,
    formattedContext: formatted,
  };
});

ipcMain.handle('context:detect-repo-type', async (_, repoPath: string) => {
  return contextExtractorServiceV2.detectRepositoryType(repoPath);
});

ipcMain.handle('context:get-critical-files', async (_, repoPath: string) => {
  return contextExtractorServiceV2.getCriticalFiles(repoPath);
});

export default contextExtractorServiceV2;