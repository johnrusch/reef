import Anthropic from '@anthropic-ai/sdk';
import { ipcMain } from 'electron';

export interface DiagramOptions {
  type: 'component' | 'class' | 'sequence';
  detailLevel: 'overview' | 'detailed';
  focusArea?: 'api' | 'database' | 'business-logic';
}

export interface DiagramResult {
  success: boolean;
  diagram?: string;
  error?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

class DiagramGeneratorService {
  private anthropic: Anthropic | null = null;
  private apiKey: string | undefined;
  // private readonly MAX_TOKENS = 40000;
  private readonly TARGET_TOKENS = 15000;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    if (this.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient() {
    if (!this.apiKey) {
      console.warn('Anthropic API key not found in environment variables');
      return;
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
      });
      console.log('Anthropic client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Anthropic client:', error);
      this.anthropic = null;
    }
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.initializeClient();
  }

  public isConfigured(): boolean {
    return this.anthropic !== null;
  }

  public async generateDiagram(
    context: string,
    options: DiagramOptions
  ): Promise<DiagramResult> {
    if (!this.anthropic) {
      return {
        success: false,
        error: 'Anthropic API client not configured. Please set ANTHROPIC_API_KEY.',
      };
    }

    try {
      const prompt = this.buildPrompt(context, options);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const plantUMLCode = this.extractPlantUMLCode(content.text);
      
      if (!plantUMLCode) {
        throw new Error('No valid PlantUML code found in response');
      }

      const validationResult = this.validatePlantUMLSyntax(plantUMLCode);
      if (!validationResult.valid) {
        throw new Error(`Invalid PlantUML syntax: ${validationResult.error}`);
      }

      return {
        success: true,
        diagram: plantUMLCode,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Diagram generation error:', error);
      
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again in a few moments.',
          };
        }
        if (error.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your Anthropic API key.',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildPrompt(context: string, options: DiagramOptions): string {
    const diagramTypeInstructions = {
      component: 'Create a component diagram showing the high-level architecture and main components of the system.',
      class: 'Create a class diagram showing the main classes, their relationships, and key methods/properties.',
      sequence: 'Create a sequence diagram showing the flow of operations for the main use cases.',
    };

    const detailInstructions = {
      overview: 'Keep the diagram at a high level with only the most important elements.',
      detailed: 'Include detailed information about components, methods, properties, and relationships.',
    };

    const focusInstructions = {
      api: 'Focus on API endpoints, controllers, and request/response flow.',
      database: 'Focus on data models, database connections, and data access patterns.',
      'business-logic': 'Focus on business logic, services, and domain models.',
    };

    const prompt = `You are an expert software architect. Analyze the following codebase context and generate a PlantUML diagram.

${diagramTypeInstructions[options.type]}
${detailInstructions[options.detailLevel]}
${options.focusArea ? focusInstructions[options.focusArea] : ''}

Requirements:
1. Generate ONLY valid PlantUML code
2. Start with @startuml and end with @enduml
3. Use appropriate PlantUML syntax for the diagram type
4. Include clear labels and relationships
5. Add notes or comments where helpful
6. Ensure the diagram is well-organized and readable

Codebase Context:
${context}

Generate the PlantUML diagram code:`;

    return prompt;
  }

  private extractPlantUMLCode(text: string): string | null {
    const plantUMLRegex = /@startuml[\s\S]*?@enduml/;
    const match = text.match(plantUMLRegex);
    
    if (match) {
      return match[0];
    }

    if (text.includes('@startuml') && text.includes('@enduml')) {
      const start = text.indexOf('@startuml');
      const end = text.indexOf('@enduml') + '@enduml'.length;
      return text.substring(start, end);
    }

    return null;
  }

  private validatePlantUMLSyntax(code: string): { valid: boolean; error?: string } {
    if (!code.startsWith('@startuml') || !code.endsWith('@enduml')) {
      return { valid: false, error: 'Missing @startuml or @enduml tags' };
    }

    const lines = code.split('\n');
    let braceCount = 0;
    let inComment = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("/'")) {
        inComment = true;
      }
      if (trimmed.endsWith("'/")) {
        inComment = false;
      }
      if (inComment || trimmed.startsWith("'")) {
        continue;
      }

      braceCount += (trimmed.match(/{/g) || []).length;
      braceCount -= (trimmed.match(/}/g) || []).length;
    }

    if (braceCount !== 0) {
      return { valid: false, error: 'Unmatched braces in diagram' };
    }

    return { valid: true };
  }

  public estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  public isWithinTokenBudget(text: string): boolean {
    const estimated = this.estimateTokenCount(text);
    return estimated <= this.TARGET_TOKENS;
  }
}

const diagramGeneratorService = new DiagramGeneratorService();

ipcMain.handle('diagram:generate', async (_, context: string, options: DiagramOptions) => {
  return diagramGeneratorService.generateDiagram(context, options);
});

ipcMain.handle('diagram:set-api-key', async (_, apiKey: string) => {
  diagramGeneratorService.setApiKey(apiKey);
  return { success: true };
});

ipcMain.handle('diagram:check-configuration', async () => {
  return { configured: diagramGeneratorService.isConfigured() };
});

export default diagramGeneratorService;