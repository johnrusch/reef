import { ipcMain } from 'electron';

// @ts-ignore - node-plantuml doesn't have types
import plantuml from 'node-plantuml';

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