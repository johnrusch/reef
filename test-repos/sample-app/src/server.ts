/**
 * Express server configuration and lifecycle management.
 * Sets up middleware, routes, and graceful shutdown handling.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/userRoutes';
import orderRoutes from './routes/orderRoutes';
import database from './config/database';
import config from './config/env';
import rateLimiter from './middleware/rateLimiter';
import { ApiResponse } from './types';
import { createLogger } from './utils/logger';

const logger = createLogger('Server');

export class Server {
  private readonly app: Application;
  private server: ReturnType<Application['listen']> | null = null;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configure global middleware.
   * Order matters: security headers first, then parsing, then rate limiting.
   */
  private configureMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Global rate limiting
    this.app.use(
      rateLimiter.limit(config.rateLimitWindowMs, config.rateLimitMaxRequests)
    );

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      next();
    });
  }

  /**
   * Configure API routes.
   * All API routes are prefixed with /api.
   */
  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (_req: Request, res: Response) => {
      const dbHealthy = await database.healthCheck();
      const response: ApiResponse<{ status: string; database: boolean; uptime: number }> = {
        success: true,
        data: {
          status: 'ok',
          database: dbHealthy,
          uptime: process.uptime(),
        },
      };
      res.status(dbHealthy ? 200 : 503).json(response);
    });

    // API routes
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/orders', orderRoutes);

    // 404 handler for unmatched routes
    this.app.use((_req: Request, res: Response) => {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Route not found',
      };
      res.status(404).json(response);
    });
  }

  /**
   * Configure global error handling middleware.
   */
  private configureErrorHandling(): void {
    this.app.use(
      (err: Error, _req: Request, res: Response, _next: NextFunction) => {
        logger.error('Unhandled error', err);

        const response: ApiResponse<null> = {
          success: false,
          error:
            config.nodeEnv === 'production'
              ? 'Internal server error'
              : err.message,
        };

        res.status(500).json(response);
      }
    );
  }

  /**
   * Start the server and connect to the database.
   */
  async start(port: number): Promise<void> {
    try {
      // Connect to database
      logger.info('Connecting to database...');
      await database.connect();

      // Run migrations in development
      if (config.nodeEnv === 'development') {
        await database.runMigrations();
      }

      // Start listening
      this.server = this.app.listen(port, () => {
        logger.info(`Server started on port ${port}`, {
          env: config.nodeEnv,
          cors: config.corsOrigins,
        });
      });
    } catch (error) {
      logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * Gracefully stop the server and disconnect resources.
   */
  async stop(): Promise<void> {
    logger.info('Shutting down server...');

    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('HTTP server closed');
    }

    // Disconnect database
    await database.disconnect();

    // Clean up rate limiter
    rateLimiter.destroy();

    logger.info('Server shutdown complete');
  }

  /**
   * Get the Express application instance (for testing).
   */
  getApp(): Application {
    return this.app;
  }
}

export default Server;
