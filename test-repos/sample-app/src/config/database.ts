/**
 * Database configuration and connection management.
 * Uses Sequelize ORM with PostgreSQL.
 */

import { Sequelize, Options } from 'sequelize';
import config from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('DatabaseConfig');

export class DatabaseConfig {
  private sequelize: Sequelize | null = null;
  private isConnected = false;
  private retryAttempts = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 3000;

  /**
   * Get Sequelize connection options based on environment.
   */
  private getOptions(): Options {
    const baseOptions: Options = {
      dialect: 'postgres',
      logging: config.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
      },
    };

    if (config.nodeEnv === 'production') {
      baseOptions.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }

    return baseOptions;
  }

  /**
   * Initialize and connect to the database.
   * Includes retry logic for transient connection failures.
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.sequelize) {
      logger.info('Database already connected');
      return;
    }

    const options = this.getOptions();
    this.sequelize = new Sequelize(config.databaseUrl, options);

    while (this.retryAttempts < this.maxRetries) {
      try {
        await this.sequelize.authenticate();
        this.isConnected = true;
        this.retryAttempts = 0;
        logger.info('Database connection established successfully');
        return;
      } catch (error) {
        this.retryAttempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          `Database connection attempt ${this.retryAttempts}/${this.maxRetries} failed: ${errorMessage}`
        );

        if (this.retryAttempts >= this.maxRetries) {
          throw new Error(
            `Failed to connect to database after ${this.maxRetries} attempts: ${errorMessage}`
          );
        }

        logger.info(`Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Gracefully disconnect from the database.
   */
  async disconnect(): Promise<void> {
    if (this.sequelize) {
      try {
        await this.sequelize.close();
        this.isConnected = false;
        this.sequelize = null;
        logger.info('Database connection closed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error closing database connection: ${errorMessage}`);
        throw error;
      }
    }
  }

  /**
   * Get the Sequelize instance. Throws if not connected.
   */
  getInstance(): Sequelize {
    if (!this.sequelize || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.sequelize;
  }

  /**
   * Check if the database connection is healthy.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.sequelize || !this.isConnected) {
      return false;
    }
    try {
      await this.sequelize.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run pending migrations.
   */
  async runMigrations(): Promise<void> {
    logger.info('Running database migrations...');
    const sequelize = this.getInstance();
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    logger.info('Database migrations complete');
  }
}

/** Singleton database instance */
const database = new DatabaseConfig();
export default database;
