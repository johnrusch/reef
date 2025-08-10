import { EventEmitter } from 'events';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

class RateLimiterService extends EventEmitter {
  private readonly config: RateLimitConfig = {
    maxRequests: 10,      // 10 requests
    windowMs: 60 * 1000,  // per minute
  };

  private requestHistory: number[] = [];
  private requestQueue: QueuedRequest[] = [];
  private processing = false;
  private requestCounts: Map<string, number> = new Map();

  constructor() {
    super();
    // Process queue periodically
    setInterval(() => this.processQueue(), 1000);
  }

  /**
   * Check if a request can be made immediately
   */
  public canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requestHistory.length < this.config.maxRequests;
  }

  /**
   * Get time until next available request slot (in ms)
   */
  public getTimeUntilNextSlot(): number {
    this.cleanupOldRequests();
    
    if (this.canMakeRequest()) {
      return 0;
    }

    // Find the oldest request in the current window
    if (this.requestHistory.length > 0) {
      const oldestRequest = this.requestHistory[0];
      const timeElapsed = Date.now() - oldestRequest;
      const timeRemaining = this.config.windowMs - timeElapsed;
      return Math.max(0, timeRemaining);
    }

    return 0;
  }

  /**
   * Execute a request with rate limiting
   */
  public async executeWithRateLimit<T>(
    execute: () => Promise<T>,
    options: {
      id?: string;
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { 
      id = this.generateRequestId(), 
      priority = 'normal',
      timeout = 30000 
    } = options;

    // Check if we can execute immediately
    if (this.canMakeRequest()) {
      return this.executeRequest(execute, id);
    }

    // Otherwise, queue the request
    return this.queueRequest(execute, id, priority, timeout);
  }

  /**
   * Execute request immediately and track it
   */
  private async executeRequest<T>(execute: () => Promise<T>, id: string): Promise<T> {
    try {
      this.requestHistory.push(Date.now());
      this.incrementRequestCount(id);
      this.emit('request:start', { id, timestamp: Date.now() });
      
      const result = await execute();
      
      this.emit('request:success', { id, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.emit('request:error', { id, error, timestamp: Date.now() });
      throw error;
    }
  }

  /**
   * Queue a request for later execution
   */
  private queueRequest<T>(
    execute: () => Promise<T>,
    id: string,
    priority: 'high' | 'normal' | 'low',
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        execute,
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
      };

      // Add to queue based on priority
      this.addToQueue(queuedRequest);
      this.emit('request:queued', { 
        id, 
        queuePosition: this.requestQueue.length,
        estimatedWait: this.getTimeUntilNextSlot() 
      });

      // Set timeout
      setTimeout(() => {
        const index = this.requestQueue.findIndex(r => r.id === id);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error(`Request ${id} timed out after ${timeout}ms`));
          this.emit('request:timeout', { id });
        }
      }, timeout);
    });
  }

  /**
   * Add request to queue based on priority
   */
  private addToQueue(request: QueuedRequest) {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    // Find the right position based on priority
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      if (priorityOrder[request.priority] < priorityOrder[this.requestQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0 && this.canMakeRequest()) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        const result = await this.executeRequest(request.execute, request.id);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Clean up old requests outside the time window
   */
  private cleanupOldRequests() {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;
    
    this.requestHistory = this.requestHistory.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track request counts per endpoint/user
   */
  private incrementRequestCount(id: string) {
    const current = this.requestCounts.get(id) || 0;
    this.requestCounts.set(id, current + 1);
  }

  /**
   * Get current queue status
   */
  public getQueueStatus(): {
    queueLength: number;
    currentRequests: number;
    availableSlots: number;
    nextSlotIn: number;
  } {
    this.cleanupOldRequests();
    
    return {
      queueLength: this.requestQueue.length,
      currentRequests: this.requestHistory.length,
      availableSlots: Math.max(0, this.config.maxRequests - this.requestHistory.length),
      nextSlotIn: this.getTimeUntilNextSlot(),
    };
  }

  /**
   * Clear the request queue
   */
  public clearQueue() {
    const cleared = this.requestQueue.length;
    
    // Reject all queued requests
    for (const request of this.requestQueue) {
      request.reject(new Error('Queue cleared'));
    }
    
    this.requestQueue = [];
    this.emit('queue:cleared', { clearedCount: cleared });
  }

  /**
   * Get request statistics
   */
  public getStats(): {
    totalRequests: number;
    queuedRequests: number;
    requestsPerMinute: number;
    topRequesters: Array<{ id: string; count: number }>;
  } {
    this.cleanupOldRequests();
    
    const topRequesters = Array.from(this.requestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));
    
    return {
      totalRequests: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0),
      queuedRequests: this.requestQueue.length,
      requestsPerMinute: this.requestHistory.length,
      topRequesters,
    };
  }

  /**
   * Update rate limit configuration
   */
  public updateConfig(config: Partial<RateLimitConfig>) {
    Object.assign(this.config, config);
    this.emit('config:updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

// Create singleton instance
const rateLimiterService = new RateLimiterService();

// Listen for rate limit events (for logging/monitoring)
rateLimiterService.on('request:queued', (data) => {
  console.log(`Request queued: ${data.id}, position: ${data.queuePosition}, wait: ${data.estimatedWait}ms`);
});

rateLimiterService.on('request:timeout', (data) => {
  console.warn(`Request timed out: ${data.id}`);
});

rateLimiterService.on('request:error', (data) => {
  console.error(`Request error: ${data.id}`, data.error);
});

export default rateLimiterService;