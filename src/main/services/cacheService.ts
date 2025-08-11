import Database from 'better-sqlite3';
import * as path from 'path';
import * as crypto from 'crypto';
import { app, ipcMain } from 'electron';
import * as fs from 'fs';

export interface DiagramCacheEntry {
  id?: number;
  repo_path: string;
  repo_hash: string;
  diagram_type: string;
  diagram_content: string;
  diagram_metadata?: string;
  model_used: string;
  prompt_version: string;
  tokens_used?: number;
  generation_cost?: number;
  created_at?: string;
  last_accessed?: string;
  access_count?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  avgTokensUsed: number;
  totalCost: number;
}

class CacheService {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly CACHE_VERSION = '1.0.0';
  private readonly DEFAULT_CACHE_DAYS = 7;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    const userDataPath = app.getPath('userData');
    const cacheDir = path.join(userDataPath, 'cache');
    
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    this.dbPath = path.join(cacheDir, 'diagram_cache.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys and WAL mode for better concurrency
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      
      // Create the cache table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          repo_hash TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          diagram_metadata TEXT,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          tokens_used INTEGER,
          generation_cost REAL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          UNIQUE(repo_path, repo_hash, diagram_type, prompt_version)
        );
        
        CREATE INDEX IF NOT EXISTS idx_repo_hash ON diagram_cache(repo_path, repo_hash);
        CREATE INDEX IF NOT EXISTS idx_created_at ON diagram_cache(created_at);
        CREATE INDEX IF NOT EXISTS idx_last_accessed ON diagram_cache(last_accessed);
      `);
      
      // Create metadata table for tracking
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cache_metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      
      // Initialize metadata
      const stmt = this.db.prepare('INSERT OR IGNORE INTO cache_metadata (key, value) VALUES (?, ?)');
      stmt.run('version', this.CACHE_VERSION);
      stmt.run('created_at', new Date().toISOString());
      
      console.log('Cache database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cache database:', error);
      this.db = null;
    }
  }

  /**
   * Generate a hash for the repository state based on critical files
   */
  public async generateRepoHash(repoPath: string, criticalFiles: string[]): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(repoPath);
    
    // Sort files for consistent hashing
    const sortedFiles = criticalFiles.sort();
    
    for (const file of sortedFiles) {
      const filePath = path.join(repoPath, file);
      try {
        const stats = await fs.promises.stat(filePath);
        // Include file path, size, and modification time in hash
        hash.update(file);
        hash.update(stats.size.toString());
        hash.update(stats.mtime.toISOString());
      } catch (error) {
        // File doesn't exist or can't be accessed, continue
        continue;
      }
    }
    
    return hash.digest('hex').substring(0, 16); // Use first 16 chars for brevity
  }

  /**
   * Get a cached diagram if it exists and is valid
   */
  public getCachedDiagram(
    repoPath: string,
    repoHash: string,
    diagramType: string,
    promptVersion?: string
  ): DiagramCacheEntry | null {
    if (!this.db) return null;
    
    try {
      let query = `
        SELECT * FROM diagram_cache 
        WHERE repo_path = ? AND repo_hash = ? AND diagram_type = ?
      `;
      const params: any[] = [repoPath, repoHash, diagramType];
      
      if (promptVersion) {
        query += ' AND prompt_version = ?';
        params.push(promptVersion);
      }
      
      query += ' ORDER BY created_at DESC LIMIT 1';
      
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as DiagramCacheEntry | undefined;
      
      if (result) {
        // Use atomic operation to update access count and last accessed timestamp
        // This prevents race conditions by doing the update in a single atomic operation
        const updateStmt = this.db.prepare(`
          UPDATE diagram_cache 
          SET last_accessed = CURRENT_TIMESTAMP, 
              access_count = access_count + 1 
          WHERE id = ? AND repo_path = ? AND diagram_type = ?
        `);
        updateStmt.run(result.id, repoPath, diagramType);
        
        this.cacheHits++;
        console.log(`Cache hit for ${repoPath} - ${diagramType}`);
        return result;
      }
      
      this.cacheMisses++;
      console.log(`Cache miss for ${repoPath} - ${diagramType}`);
      return null;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Store a diagram in the cache
   */
  public storeDiagram(entry: DiagramCacheEntry): boolean {
    if (!this.db) return false;
    
    try {
      // Use a transaction to ensure atomicity
      const transaction = this.db.transaction(() => {
        const stmt = this.db!.prepare(`
          INSERT OR REPLACE INTO diagram_cache (
            repo_path, repo_hash, diagram_type, diagram_content,
            diagram_metadata, model_used, prompt_version, tokens_used,
            generation_cost, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(
          entry.repo_path,
          entry.repo_hash,
          entry.diagram_type,
          entry.diagram_content,
          entry.diagram_metadata || null,
          entry.model_used,
          entry.prompt_version,
          entry.tokens_used || null,
          entry.generation_cost || null
        );
      });
      
      transaction();
      console.log(`Cached diagram for ${entry.repo_path} - ${entry.diagram_type}`);
      return true;
    } catch (error) {
      console.error('Error storing in cache:', error);
      return false;
    }
  }

  /**
   * Invalidate cache entries for a specific repository
   */
  public invalidateRepo(repoPath: string): boolean {
    if (!this.db) return false;
    
    try {
      const stmt = this.db.prepare('DELETE FROM diagram_cache WHERE repo_path = ?');
      const result = stmt.run(repoPath);
      console.log(`Invalidated ${result.changes} cache entries for ${repoPath}`);
      return true;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return false;
    }
  }

  /**
   * Clean up old cache entries
   */
  public cleanupOldEntries(daysToKeep: number = this.DEFAULT_CACHE_DAYS): number {
    if (!this.db) return 0;
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const stmt = this.db.prepare(`
        DELETE FROM diagram_cache 
        WHERE last_accessed < ? AND access_count < 3
      `);
      
      const result = stmt.run(cutoffDate.toISOString());
      console.log(`Cleaned up ${result.changes} old cache entries`);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        avgTokensUsed: 0,
        totalCost: 0,
      };
    }
    
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as totalEntries,
          SUM(LENGTH(diagram_content)) as totalSize,
          AVG(tokens_used) as avgTokensUsed,
          SUM(generation_cost) as totalCost
        FROM diagram_cache
      `).get() as any;
      
      const totalRequests = this.cacheHits + this.cacheMisses;
      const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
      
      return {
        totalEntries: stats.totalEntries || 0,
        totalSize: stats.totalSize || 0,
        hitRate: Math.round(hitRate * 100) / 100,
        avgTokensUsed: Math.round(stats.avgTokensUsed || 0),
        totalCost: Math.round((stats.totalCost || 0) * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        avgTokensUsed: 0,
        totalCost: 0,
      };
    }
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): boolean {
    if (!this.db) return false;
    
    try {
      this.db.exec('DELETE FROM diagram_cache');
      this.cacheHits = 0;
      this.cacheMisses = 0;
      console.log('Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Close the database connection
   */
  public close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Cache database closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// IPC handlers for cache operations
ipcMain.handle('cache:get', async (_, repoPath: string, repoHash: string, diagramType: string, promptVersion?: string) => {
  return cacheService.getCachedDiagram(repoPath, repoHash, diagramType, promptVersion);
});

ipcMain.handle('cache:store', async (_, entry: DiagramCacheEntry) => {
  return cacheService.storeDiagram(entry);
});

ipcMain.handle('cache:invalidate', async (_, repoPath: string) => {
  return cacheService.invalidateRepo(repoPath);
});

ipcMain.handle('cache:cleanup', async (_, daysToKeep?: number) => {
  return cacheService.cleanupOldEntries(daysToKeep);
});

ipcMain.handle('cache:stats', async () => {
  return cacheService.getStats();
});

ipcMain.handle('cache:clear', async () => {
  return cacheService.clearCache();
});

ipcMain.handle('cache:generate-hash', async (_, repoPath: string, criticalFiles: string[]) => {
  return cacheService.generateRepoHash(repoPath, criticalFiles);
});

// Cleanup on app quit
app.on('before-quit', () => {
  cacheService.close();
});

// Run cleanup periodically (every 24 hours)
setInterval(() => {
  cacheService.cleanupOldEntries();
}, 24 * 60 * 60 * 1000);

export default cacheService;