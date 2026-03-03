import { ipcMain } from 'electron';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - node-plantuml doesn't have types
import plantuml from 'node-plantuml';

/**
 * In-process LRU cache for rendered SVG strings (PERF-02).
 * Uses Map insertion-order to track LRU — oldest entry is at the front.
 */
export class SvgLruCache {
  private readonly cache = new Map<string, string>();
  private readonly maxEntries: number;

  constructor(maxEntries = 15) {
    this.maxEntries = maxEntries;
  }

  get(key: string): string | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // Promote to MRU by re-inserting at end
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  invalidate(keyPrefix: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(keyPrefix)) this.cache.delete(key);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

/** Module-level LRU cache instance (max 15 entries) */
export const svgLruCache = new SvgLruCache(15);

class PlantUMLService {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    ipcMain.handle('plantuml:generate-svg', async (_, plantUmlText: string) => {
      try {
        return await this.generateSVG(plantUmlText);
      } catch (error) {
        console.error('Error generating PlantUML SVG:', error);
        throw error;
      }
    });

    ipcMain.handle('plantuml:check-java', async () => {
      return await this.checkJavaInstalled();
    });
  }

  private async generateSVG(plantUmlText: string): Promise<string> {
    // Validate PlantUML input
    if (!plantUmlText || typeof plantUmlText !== 'string') {
      throw new Error('Invalid PlantUML text provided');
    }
    
    if (!plantUmlText.includes('@startuml') || !plantUmlText.includes('@enduml')) {
      throw new Error('PlantUML text must contain @startuml and @enduml tags');
    }
    
    // Basic size limit to prevent memory issues (1MB)
    if (plantUmlText.length > 1024 * 1024) {
      throw new Error('PlantUML text exceeds maximum size limit (1MB)');
    }
    
    // Additional validation for common PlantUML syntax patterns
    const validPatterns = [
      '@startuml', '@enduml', 'class', 'interface', 'enum', 'abstract',
      'participant', 'actor', 'usecase', 'component', 'node', 'database',
      'entity', 'control', 'boundary', '-->', '<--', ':|', '..>', '<..',
      'title', 'note', 'package', 'namespace', 'skinparam', '!define'
    ];
    
    // Check if input contains at least one valid PlantUML keyword/pattern
    const hasValidPattern = validPatterns.some(pattern => 
      plantUmlText.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!hasValidPattern) {
      throw new Error('PlantUML text does not appear to contain valid PlantUML syntax');
    }
    
    // Sanitize against potential command injection with C4-PlantUML whitelist
    // C4-PlantUML is from the official plantuml-stdlib organization and is safe to include
    // This enables C4 Context, Container, Component, and Deployment diagrams
    const includePattern = /!(include|includeurl|import)\s+(.+)/gi;
    const matches = plantUmlText.matchAll(includePattern);

    const c4Whitelist = [
      'https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/',
      '<C4/'
    ];

    for (const match of matches) {
      const includePath = match[2].trim();
      const isWhitelisted = c4Whitelist.some(allowed => includePath.startsWith(allowed));

      if (!isWhitelisted) {
        throw new Error(`Security: PlantUML text contains non-whitelisted include: ${match[1]} ${includePath}`);
      }
    }
    
    return new Promise((resolve, reject) => {
      const gen = plantuml.generate(plantUmlText, { format: 'svg' });
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB max for generated SVG

      gen.out.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        
        // Check if output exceeds max size
        if (totalSize > maxSize) {
          gen.out.destroy();
          reject(new Error('Generated SVG exceeds maximum size limit (10MB)'));
          return;
        }
        
        chunks.push(chunk);
      });

      gen.out.on('end', () => {
        const svg = Buffer.concat(chunks).toString('utf-8');
        resolve(svg);
      });

      gen.out.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async checkJavaInstalled(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const javaCheck = spawn('java', ['-version']);
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        javaCheck.kill();
        resolve(false);
      }, 5000); // 5 second timeout
      
      javaCheck.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
      
      javaCheck.on('exit', (code: number) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });
    });
  }
}

// Create and export instance to ensure handlers are registered
const plantUmlService = new PlantUMLService();
export { plantUmlService };