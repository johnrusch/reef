/**
 * Rate limiting middleware using an in-memory sliding window.
 * In production, this would use Redis for distributed rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('RateLimiter');

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
}

export class RateLimiter {
  /**
   * In-memory store for rate limit tracking.
   * In production: replaced with Redis for cross-instance consistency.
   * See: ioredis connection in config/env.ts (redisUrl)
   */
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Create rate limiting middleware with configurable window and max requests.
   */
  limit(
    windowMs: number = 15 * 60 * 1000,
    maxRequests: number = 100
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || now - entry.windowStart > windowMs) {
        // New window or expired window — reset
        this.store.set(key, {
          count: 1,
          windowStart: now,
          blocked: false,
        });
        this.setRateLimitHeaders(res, maxRequests, maxRequests - 1, windowMs);
        next();
        return;
      }

      entry.count++;

      if (entry.count > maxRequests) {
        // Rate limit exceeded
        entry.blocked = true;
        const retryAfterMs = windowMs - (now - entry.windowStart);
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);

        logger.warn('Rate limit exceeded', {
          key,
          count: entry.count,
          maxRequests,
          retryAfterSec,
        });

        this.setRateLimitHeaders(res, maxRequests, 0, windowMs);
        res.setHeader('Retry-After', retryAfterSec.toString());

        const response: ApiResponse<null> = {
          success: false,
          error: 'Too many requests. Please try again later.',
        };
        res.status(429).json(response);
        return;
      }

      const remaining = maxRequests - entry.count;
      this.setRateLimitHeaders(res, maxRequests, remaining, windowMs);
      next();
    };
  }

  /**
   * Reset the rate limit for a specific key.
   * Useful after successful authentication or admin override.
   */
  resetLimit(key: string): void {
    this.store.delete(key);
    logger.debug('Rate limit reset', { key });
  }

  /**
   * Create a stricter rate limiter for sensitive endpoints (login, register).
   */
  strictLimit(
    windowMs: number = 15 * 60 * 1000,
    maxRequests: number = 5
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.limit(windowMs, maxRequests);
  }

  /**
   * Extract a rate limit key from the request.
   * Uses IP address, falling back to a generic key.
   */
  private getKey(req: Request): string {
    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    return `rate_limit:${ip}`;
  }

  /**
   * Set standard rate limit response headers.
   */
  private setRateLimitHeaders(
    res: Response,
    limit: number,
    remaining: number,
    windowMs: number
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + windowMs).toISOString()
    );
  }

  /**
   * Remove expired entries from the in-memory store.
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 60 * 60 * 1000) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { removed: cleaned, remaining: this.store.size });
    }
  }

  /**
   * Destroy the rate limiter and clean up resources.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

/** Singleton rate limiter instance */
export default new RateLimiter();
