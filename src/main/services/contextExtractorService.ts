import * as fs from 'fs/promises';
import * as path from 'path';
import { ipcMain } from 'electron';
import type { ExtractorOptions, ExtractionResult } from '../../shared/types/diagram';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  priority: 'critical' | 'important' | 'optional';
}

class ContextExtractorService {
  private readonly FILE_PATTERNS = {
    critical: [
      /^main\.(ts|js|tsx|jsx)$/,
      /^index\.(ts|js|tsx|jsx)$/,
      /^app\.(ts|js|tsx|jsx)$/,
      /\/routes\//,
      /\/controllers\//,
      /\/api\//,
    ],
    important: [
      /package\.json$/,
      /\.config\.(ts|js)$/,
      /\/models\//,
      /\/services\//,
      /\/interfaces\//,
      /\/types\//,
      /\/schemas\//,
    ],
    optional: [
      /\/utils\//,
      /\/helpers\//,
      /\/lib\//,
      /README\.md$/,
      /\/components\//,
    ],
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
    /\.env/,
    /\.DS_Store/,
  ];

  private readonly MAX_FILE_SIZE = 100000; // 100KB per file
  private readonly CHUNK_SIZE = 10000; // 10KB chunks for reading
  private readonly DEFAULT_MAX_TOKENS = 15000;

  public async extractContext(
    repoPath: string,
    options: ExtractorOptions = {}
  ): Promise<ExtractionResult> {
    const maxTokens = options.maxTokens || this.DEFAULT_MAX_TOKENS;
    const includeTests = options.includeTests || false;
    
    try {
      const allFiles = await this.getAllFiles(repoPath);
      const filteredFiles = this.filterFiles(allFiles, includeTests);
      const prioritizedFiles = await this.prioritizeFiles(repoPath, filteredFiles);
      const selectedFiles = await this.selectFilesWithinBudget(
        repoPath,
        prioritizedFiles,
        maxTokens,
        options.focusArea
      );

      const fileContents: FileContent[] = [];
      let totalSize = 0;

      for (const file of selectedFiles) {
        const fullPath = path.join(repoPath, file.path);
        const content = await this.readFileContent(fullPath, repoPath);
        if (content) {
          fileContents.push(content);
          totalSize += content.size;
        }
      }

      const estimatedTokens = this.estimateTokenCount(
        fileContents.map(f => f.content).join('\n')
      );

      return {
        files: fileContents,
        totalSize,
        estimatedTokens,
        truncated: estimatedTokens >= maxTokens,
      };
    } catch (error) {
      console.error('Context extraction error:', error);
      throw error;
    }
  }

  private async getAllFiles(dirPath: string, relativePath = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Validate entry name to prevent path traversal
        if (entry.name.includes('..') || entry.name.includes('~')) {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        // Ensure the resolved path is still within the repository
        const resolvedPath = path.resolve(fullPath);
        const resolvedBase = path.resolve(dirPath);
        if (!resolvedPath.startsWith(resolvedBase)) {
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
      const isCodeFile = ['.ts', '.js', '.tsx', '.jsx', '.json', '.md'].includes(ext);
      
      if (!isCodeFile) return false;
      
      if (!includeTests && (file.includes('.test.') || file.includes('.spec.'))) {
        return false;
      }
      
      return true;
    });
  }

  private async prioritizeFiles(
    _repoPath: string,
    files: string[]
  ): Promise<Array<{ path: string; priority: 'critical' | 'important' | 'optional' }>> {
    const prioritized: Array<{ path: string; priority: 'critical' | 'important' | 'optional' }> = [];
    
    for (const file of files) {
      let priority: 'critical' | 'important' | 'optional' = 'optional';
      
      if (this.FILE_PATTERNS.critical.some(pattern => pattern.test(file))) {
        priority = 'critical';
      } else if (this.FILE_PATTERNS.important.some(pattern => pattern.test(file))) {
        priority = 'important';
      }
      
      prioritized.push({ path: file, priority });
    }
    
    prioritized.sort((a, b) => {
      const priorityOrder = { critical: 0, important: 1, optional: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return prioritized;
  }

  private async selectFilesWithinBudget(
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
        
        // Estimate tokens based on file size (rough approximation: 1 char ≈ 0.25 tokens)
        const estimatedTokens = Math.ceil(stat.size / 4);
        
        if (currentTokens + estimatedTokens > maxTokens) {
          if (file.priority === 'critical' && selected.length > 0) {
            const lastOptional = selected.findIndex(f => f.priority === 'optional');
            if (lastOptional !== -1) {
              selected.splice(lastOptional, 1);
              selected.push(file);
            }
          }
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
      api: [/\/routes\//, /\/controllers\//, /\/api\//, /\/endpoints\//],
      database: [/\/models\//, /\/schemas\//, /\/migrations\//, /\/db\//],
      'business-logic': [/\/services\//, /\/domain\//, /\/business\//, /\/core\//],
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
      
      // Calculate relative path from base (repository root) or directory
      const relativePath = basePath 
        ? path.relative(basePath, filePath)
        : path.basename(filePath);
      
      // Skip files that are too large
      if (stat.size > this.MAX_FILE_SIZE) {
        // Read only the first chunk for large files
        const fileHandle = await fs.open(filePath, 'r');
        const buffer = Buffer.allocUnsafe(this.CHUNK_SIZE);
        await fileHandle.read(buffer, 0, this.CHUNK_SIZE, 0);
        await fileHandle.close();
        
        const content = buffer.toString('utf-8');
        return {
          path: relativePath,
          content: content + '\n// ... file truncated (too large) ...',
          size: this.CHUNK_SIZE,
          priority: 'optional',
        };
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

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
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
    
    if (sections.critical.length > 0) {
      formatted += '=== CRITICAL FILES ===\n\n';
      for (const file of sections.critical) {
        formatted += `--- ${file.path} ---\n${file.content}\n\n`;
      }
    }
    
    if (sections.important.length > 0) {
      formatted += '=== IMPORTANT FILES ===\n\n';
      for (const file of sections.important) {
        formatted += `--- ${file.path} ---\n${file.content}\n\n`;
      }
    }
    
    if (sections.optional.length > 0) {
      formatted += '=== ADDITIONAL CONTEXT ===\n\n';
      for (const file of sections.optional) {
        formatted += `--- ${file.path} ---\n${file.content}\n\n`;
      }
    }
    
    return formatted;
  }
}

const contextExtractorService = new ContextExtractorService();

ipcMain.handle('context:extract', async (_, repoPath: string, options: ExtractorOptions) => {
  const result = await contextExtractorService.extractContext(repoPath, options);
  const formatted = contextExtractorService.formatContextForPrompt(result.files);
  
  return {
    ...result,
    formattedContext: formatted,
  };
});

export default contextExtractorService;