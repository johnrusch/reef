import { encoding_for_model, TiktokenModel } from 'tiktoken';

export interface TokenCountResult {
  tokens: number;
  estimatedCost: {
    input: number;
    output: number;
  };
}

export interface TokenBudget {
  maxPerRequest: number;
  targetOptimal: number;
  minimumViable: number;
  maxPerUserPerDay: number;
}

export interface ModelConfig {
  name: string;
  model: TiktokenModel;
  maxTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

class TokenCounterService {
  private readonly tokenBudget: TokenBudget = {
    maxPerRequest: 20000,
    targetOptimal: 12000,
    minimumViable: 5000,
    maxPerUserPerDay: 100000,
  };

  private readonly models: Record<string, ModelConfig> = {
    'claude-3-haiku': {
      name: 'claude-3-haiku-20240307',
      model: 'gpt-3.5-turbo', // Use similar tokenizer
      maxTokens: 200000,
      inputCostPer1M: 0.25,
      outputCostPer1M: 1.25,
    },
    'claude-3-sonnet': {
      name: 'claude-3-sonnet-20240229',
      model: 'gpt-4', // Use similar tokenizer
      maxTokens: 200000,
      inputCostPer1M: 3.00,
      outputCostPer1M: 15.00,
    },
  };

  private userTokenUsage: Map<string, { daily: number; lastReset: Date }> = new Map();
  private currentModel: ModelConfig;

  constructor() {
    // Default to Haiku model
    this.currentModel = this.models['claude-3-haiku'];
    
    // Reset daily usage at midnight
    this.scheduleDailyReset();
  }

  /**
   * Count tokens in a text string
   */
  public countTokens(text: string, model?: string): number {
    try {
      const modelConfig = model ? this.models[model] : this.currentModel;
      const encoder = encoding_for_model(modelConfig.model);
      const tokens = encoder.encode(text);
      const count = tokens.length;
      encoder.free(); // Free memory
      return count;
    } catch (error) {
      // Fallback to approximation if tiktoken fails
      console.warn('Token counting failed, using approximation:', error);
      return this.approximateTokens(text);
    }
  }

  /**
   * Approximate token count (fallback method)
   */
  private approximateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for a given number of tokens
   */
  public calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const modelConfig = model ? this.models[model] : this.currentModel;
    
    const inputCost = (inputTokens / 1_000_000) * modelConfig.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * modelConfig.outputCostPer1M;
    
    return Math.round((inputCost + outputCost) * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Check if content fits within token budget
   */
  public isWithinBudget(text: string, budget?: number): boolean {
    const tokens = this.countTokens(text);
    const maxTokens = budget || this.tokenBudget.targetOptimal;
    return tokens <= maxTokens;
  }

  /**
   * Reduce context to fit within token budget
   */
  public reduceContext(
    files: Array<{ path: string; content: string; priority: 'critical' | 'important' | 'optional'; size?: number }>,
    maxTokens?: number
  ): Array<{ path: string; content: string; priority: 'critical' | 'important' | 'optional'; size?: number }> {
    const budget = maxTokens || this.tokenBudget.targetOptimal;
    const selected: typeof files = [];
    let currentTokens = 0;

    // Sort by priority
    const sorted = [...files].sort((a, b) => {
      const priorityOrder = { critical: 0, important: 1, optional: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const file of sorted) {
      const fileTokens = this.countTokens(file.content);
      
      if (currentTokens + fileTokens <= budget) {
        selected.push(file);
        currentTokens += fileTokens;
      } else if (file.priority === 'critical') {
        // For critical files, try to include at least part of it
        const remainingBudget = budget - currentTokens;
        if (remainingBudget > this.tokenBudget.minimumViable / 10) {
          // Truncate the file content to fit
          const truncatedContent = this.truncateToTokenLimit(file.content, remainingBudget);
          selected.push({
            ...file,
            content: truncatedContent + '\n// ... truncated to fit token budget ...',
          });
          break;
        }
      }
    }

    return selected;
  }

  /**
   * Truncate text to fit within token limit
   */
  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const lines = text.split('\n');
    let result = '';
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = this.countTokens(line);
      if (currentTokens + lineTokens <= maxTokens) {
        result += line + '\n';
        currentTokens += lineTokens;
      } else {
        break;
      }
    }

    return result.trim();
  }

  /**
   * Track user token usage
   */
  public trackUsage(userId: string, tokens: number): boolean {
    const now = new Date();
    let usage = this.userTokenUsage.get(userId);

    if (!usage || this.isNewDay(usage.lastReset, now)) {
      // Reset daily usage
      usage = { daily: 0, lastReset: now };
    }

    if (usage.daily + tokens > this.tokenBudget.maxPerUserPerDay) {
      console.warn(`User ${userId} exceeded daily token limit`);
      return false; // Exceeded daily limit
    }

    usage.daily += tokens;
    this.userTokenUsage.set(userId, usage);
    return true;
  }

  /**
   * Get remaining tokens for a user
   */
  public getRemainingDailyTokens(userId: string): number {
    const usage = this.userTokenUsage.get(userId);
    if (!usage || this.isNewDay(usage.lastReset, new Date())) {
      return this.tokenBudget.maxPerUserPerDay;
    }
    return Math.max(0, this.tokenBudget.maxPerUserPerDay - usage.daily);
  }

  /**
   * Select optimal model based on repository size
   */
  public selectOptimalModel(fileCount: number): string {
    // For Phase 2, we'll stick with Haiku for cost optimization
    // In the future, this could be more sophisticated
    if (fileCount < 50) {
      return 'claude-3-haiku';
    } else if (fileCount < 200) {
      return 'claude-3-haiku'; // With sampling
    } else {
      return 'claude-3-haiku'; // With aggressive filtering
    }
  }

  /**
   * Estimate cost before generation
   */
  public estimateGenerationCost(contextTokens: number, expectedOutputTokens: number = 2000): {
    model: string;
    estimatedCost: number;
    warning?: string;
  } {
    const model = this.currentModel;
    const cost = this.calculateCost(contextTokens, expectedOutputTokens);
    
    const result: any = {
      model: model.name,
      estimatedCost: cost,
    };

    if (contextTokens > this.tokenBudget.maxPerRequest) {
      result.warning = 'Context exceeds maximum token limit for a single request';
    } else if (contextTokens > this.tokenBudget.targetOptimal) {
      result.warning = 'Context exceeds optimal token limit, consider reducing';
    }

    return result;
  }

  /**
   * Get token budget configuration
   */
  public getTokenBudget(): TokenBudget {
    return { ...this.tokenBudget };
  }

  /**
   * Check if it's a new day (for resetting daily limits)
   */
  private isNewDay(lastReset: Date, now: Date): boolean {
    return lastReset.toDateString() !== now.toDateString();
  }

  /**
   * Schedule daily reset of user token usage
   */
  private scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.userTokenUsage.clear();
      this.scheduleDailyReset(); // Schedule next reset
    }, msUntilMidnight);
  }

  /**
   * Get usage statistics
   */
  public getUsageStats(): {
    totalUsers: number;
    totalTokensToday: number;
    averagePerUser: number;
  } {
    let totalTokens = 0;
    const now = new Date();
    
    for (const [_, usage] of this.userTokenUsage) {
      if (!this.isNewDay(usage.lastReset, now)) {
        totalTokens += usage.daily;
      }
    }
    
    const activeUsers = Array.from(this.userTokenUsage.values()).filter(
      u => !this.isNewDay(u.lastReset, now)
    ).length;
    
    return {
      totalUsers: activeUsers,
      totalTokensToday: totalTokens,
      averagePerUser: activeUsers > 0 ? Math.round(totalTokens / activeUsers) : 0,
    };
  }
}

// Create singleton instance
const tokenCounterService = new TokenCounterService();

export default tokenCounterService;