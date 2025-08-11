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
    return new Promise((resolve, reject) => {
      const gen = plantuml.generate(plantUmlText, { format: 'svg' });
      const chunks: Buffer[] = [];

      gen.out.on('data', (chunk: Buffer) => {
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
      javaCheck.on('error', () => resolve(false));
      javaCheck.on('exit', (code: number) => resolve(code === 0));
    });
  }
}

// Create and export instance to ensure handlers are registered
const plantUmlService = new PlantUMLService();
export { plantUmlService };