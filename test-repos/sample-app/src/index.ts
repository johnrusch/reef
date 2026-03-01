/**
 * Application entry point.
 * Creates and starts the Express server with graceful shutdown handling.
 */

import Server from './server';
import config from './config/env';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

async function main(): Promise<void> {
  const server = new Server();

  // Handle graceful shutdown signals
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await server.stop();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', reason as Error);
    shutdown('unhandledRejection');
  });

  try {
    await server.start(config.port);
    logger.info(`Sample App API running on port ${config.port}`, {
      env: config.nodeEnv,
      pid: process.pid,
    });
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

main();
