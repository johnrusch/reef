import Anthropic from '@anthropic-ai/sdk';
import { ipcMain, safeStorage } from 'electron';
import Store from 'electron-store';
import cacheService, { DiagramCacheEntry } from './cacheService';
import tokenCounterService from './tokenCounterService';
import rateLimiterService from './rateLimiterService';
import contextExtractorServiceV2 from './contextExtractorServiceV2';
import type { DiagramOptions, DiagramResult } from '../../shared/types/diagram';

export interface EnhancedDiagramResult extends DiagramResult {
  cached?: boolean;
  cacheKey?: string;
  repoType?: string;
  tokenDetails?: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  rateLimitInfo?: {
    queued: boolean;
    waitTime?: number;
  };
}

class DiagramGeneratorServiceV2 {
  private anthropic: Anthropic | null = null;
  private readonly TARGET_TOKENS = 15000;
  private store: Store;
  private readonly PROMPT_VERSION = '2.0.0'; // Track prompt version for cache invalidation
  private userId = 'default'; // In production, this would be per-user

  constructor() {
    this.store = new Store();
    this.initializeFromStorage();
  }

  private initializeFromStorage() {
    // Try to load API key from secure storage first, then environment variable
    const encryptedKey = this.store.get('anthropicApiKey') as string | undefined;
    if (encryptedKey && safeStorage.isEncryptionAvailable()) {
      try {
        const decryptedKey = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
        this.initializeClient(decryptedKey);
        // Immediately clear from local variable
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.initializeClient(process.env.ANTHROPIC_API_KEY);
    }
  }

  private initializeClient(apiKey: string) {
    if (!apiKey) {
      console.warn('Anthropic API key not found');
      return;
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
      console.log('Anthropic client initialized successfully');
      // API key is not stored, only passed to Anthropic client
    } catch (error) {
      console.error('Failed to initialize Anthropic client:', error);
      this.anthropic = null;
    }
  }

  public setApiKey(apiKey: string) {
    // Validate API key format
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid API key format');
    }
    
    // Store encrypted API key if encryption is available
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey);
      this.store.set('anthropicApiKey', encrypted.toString('base64'));
    } else {
      // Refuse to store without encryption
      throw new Error('Cannot store API key securely. Encryption is not available on this system.');
    }
    
    // Initialize client without storing the key in instance variable
    this.initializeClient(apiKey);
  }

  public isConfigured(): boolean {
    return this.anthropic !== null;
  }

  /**
   * Generate diagram with caching, rate limiting, and optimization
   */
  public async generateDiagramWithOptimization(
    repoPath: string,
    options: DiagramOptions & { 
      useCache?: boolean; 
      forceRegenerate?: boolean;
      userId?: string;
    }
  ): Promise<EnhancedDiagramResult> {
    if (!this.anthropic) {
      return {
        success: false,
        error: 'Anthropic API client not configured. Please set API key.',
      };
    }

    const userId = options.userId || this.userId;
    
    try {
      // Step 1: Extract and optimize context
      console.log('Extracting repository context...');
      const extractResult = await contextExtractorServiceV2.extractContext(repoPath, {
        maxTokens: this.TARGET_TOKENS,
        focusArea: options.focusArea,
      });

      if (!extractResult.formattedContext) {
        throw new Error('No context extracted from repository');
      }

      // Step 2: Generate repository hash for caching
      const criticalFiles = await contextExtractorServiceV2.getCriticalFiles(repoPath);
      const repoHash = await cacheService.generateRepoHash(repoPath, criticalFiles);

      // Step 3: Check cache if enabled
      if (options.useCache !== false && !options.forceRegenerate) {
        const cached = cacheService.getCachedDiagram(
          repoPath,
          repoHash,
          options.type,
          this.PROMPT_VERSION
        );

        if (cached) {
          console.log('Returning cached diagram');
          return {
            success: true,
            diagram: cached.diagram_content,
            cached: true,
            cacheKey: `${repoPath}-${repoHash}-${options.type}`,
            repoType: extractResult.repoType?.type,
            tokensUsed: cached.tokens_used ? {
              input: cached.tokens_used,
              output: 0,
            } : undefined,
          };
        }
      }

      // Step 4: Check token budget
      const contextTokens = tokenCounterService.countTokens(extractResult.formattedContext);
      const remainingDailyTokens = tokenCounterService.getRemainingDailyTokens(userId);
      
      if (contextTokens > remainingDailyTokens) {
        return {
          success: false,
          error: `Insufficient token budget. Required: ${contextTokens}, Available: ${remainingDailyTokens}`,
        };
      }

      // Step 5: Estimate cost
      const costEstimate = tokenCounterService.estimateGenerationCost(contextTokens);
      console.log(`Estimated cost: $${costEstimate.estimatedCost} (${costEstimate.model})`);
      
      if (costEstimate.warning) {
        console.warn(costEstimate.warning);
      }

      // Step 6: Generate diagram with rate limiting
      const result = await rateLimiterService.executeWithRateLimit(
        async () => {
          const prompt = this.buildEnhancedPrompt(extractResult.formattedContext || '', options, extractResult.repoType);
          
          const response = await this.anthropic!.messages.create({
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

          return response;
        },
        {
          id: `diagram-${repoPath}-${Date.now()}`,
          priority: 'normal',
          timeout: 30000,
        }
      );

      const content = result.content[0];
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

      // Step 7: Track token usage
      const inputTokens = result.usage.input_tokens;
      const outputTokens = result.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      
      tokenCounterService.trackUsage(userId, totalTokens);
      
      const modelName = 'claude-3-haiku';
      const cost = tokenCounterService.calculateCost(inputTokens, outputTokens, modelName);

      // Step 8: Store in cache
      const cacheEntry: DiagramCacheEntry = {
        repo_path: repoPath,
        repo_hash: repoHash,
        diagram_type: options.type,
        diagram_content: plantUMLCode,
        diagram_metadata: JSON.stringify({
          repoType: extractResult.repoType,
          options,
          timestamp: new Date().toISOString(),
        }),
        model_used: 'claude-3-haiku-20240307',
        prompt_version: this.PROMPT_VERSION,
        tokens_used: totalTokens,
        generation_cost: cost,
      };

      cacheService.storeDiagram(cacheEntry);

      // Step 9: Return enhanced result
      return {
        success: true,
        diagram: plantUMLCode,
        cached: false,
        cacheKey: `${repoPath}-${repoHash}-${options.type}`,
        repoType: extractResult.repoType?.type,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
        },
        tokenDetails: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
          cost,
        },
      };
    } catch (error) {
      console.error('Diagram generation error:', error);
      
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          // Rate limited by API
          const queueStatus = rateLimiterService.getQueueStatus();
          return {
            success: false,
            error: 'Rate limit exceeded. Request has been queued.',
            rateLimitInfo: {
              queued: true,
              waitTime: queueStatus.nextSlotIn,
            },
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

  private buildEnhancedPrompt(
    context: string, 
    options: DiagramOptions,
    repoType?: any
  ): string {
    const diagramTypeInstructions: Record<DiagramOptions['type'], string> = {
      component: 'Create a component diagram showing the high-level architecture and main components of the system.',
      class: 'Create a class diagram showing the main classes, their relationships, and key methods/properties.',
      sequence: 'Create a sequence diagram showing the flow of operations for the main use cases.',
      'c4-context': 'Create a C4 Context diagram showing the system in its environment with users and external systems.',
      'c4-container': 'Create a C4 Container diagram showing the high-level technology choices and deployable units.',
      'c4-component': 'Create a C4 Component diagram showing the logical groupings within a container.',
      'c4-code': 'Create a C4 Code diagram showing implementation-level class structures.',
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

    const repoTypeHints = {
      react: 'This is a React application. Include components, hooks, and state management.',
      node: 'This is a Node.js application. Include services, middleware, and API structure.',
      fullstack: 'This is a fullstack application. Show both frontend and backend architecture.',
      library: 'This is a library. Focus on the public API and internal structure.',
      unknown: '',
    };

    const repoHint = repoType && repoType.type in repoTypeHints ? repoTypeHints[repoType.type as keyof typeof repoTypeHints] : '';

    const prompt = `You are an expert software architect. Analyze the following codebase context and generate a PlantUML diagram.

${diagramTypeInstructions[options.type]}
${detailInstructions[options.detailLevel]}
${options.focusArea ? focusInstructions[options.focusArea] : ''}
${repoHint}

Repository Type: ${repoType?.type || 'unknown'} (confidence: ${repoType?.confidence || 0}%)
Repository Characteristics: ${repoType?.characteristics?.join(', ') || 'none detected'}

Requirements:
1. Generate ONLY valid PlantUML code
2. Start with @startuml and end with @enduml
3. Use appropriate PlantUML syntax for the diagram type
4. Include clear labels and relationships
5. Add notes or comments where helpful
6. Ensure the diagram is well-organized and readable
7. Use appropriate colors and styling for clarity
8. Group related components/classes together

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

  /**
   * Get usage statistics
   */
  public async getUsageStats() {
    const cacheStats = cacheService.getStats();
    const tokenStats = tokenCounterService.getUsageStats();
    const rateLimitStats = rateLimiterService.getStats();

    return {
      cache: cacheStats,
      tokens: tokenStats,
      rateLimit: rateLimitStats,
    };
  }
}

const diagramGeneratorServiceV2 = new DiagramGeneratorServiceV2();

// IPC handlers for the enhanced diagram generator
ipcMain.handle('diagram:generate-v2', async (_, repoPath: string, options: DiagramOptions & any) => {
  // Input validation
  if (!repoPath || typeof repoPath !== 'string') {
    return { success: false, error: 'Invalid repository path' };
  }
  if (!options || typeof options !== 'object') {
    return { success: false, error: 'Invalid options' };
  }
  if (options.type && !['component', 'class', 'sequence'].includes(options.type)) {
    return { success: false, error: 'Invalid diagram type' };
  }
  
  return diagramGeneratorServiceV2.generateDiagramWithOptimization(repoPath, options);
});

ipcMain.handle('diagram:set-api-key-v2', async (_, apiKey: string) => {
  // Input validation
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key');
  }
  
  diagramGeneratorServiceV2.setApiKey(apiKey);
  return { success: true };
});

ipcMain.handle('diagram:check-configuration-v2', async () => {
  return { configured: diagramGeneratorServiceV2.isConfigured() };
});

ipcMain.handle('diagram:get-usage-stats', async () => {
  return diagramGeneratorServiceV2.getUsageStats();
});

export default diagramGeneratorServiceV2;