/**
 * Logging utility with context namespacing.
 * Wraps console with structured log formatting.
 * In production, this would be replaced with Winston transports.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

export class Logger {
  private readonly context: string;
  private readonly minLevel: LogLevel;

  constructor(context: string, minLevel: LogLevel = LogLevel.DEBUG) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Format a log entry with timestamp, level, and context.
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    return `[${timestamp}] [${levelName}] [${this.context}] ${message}`;
  }

  /**
   * Check if the given level should be logged.
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage(LogLevel.DEBUG, message);
    if (meta) {
      console.debug(formatted, JSON.stringify(meta));
    } else {
      console.debug(formatted);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage(LogLevel.INFO, message);
    if (meta) {
      console.info(formatted, JSON.stringify(meta));
    } else {
      console.info(formatted);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage(LogLevel.WARN, message);
    if (meta) {
      console.warn(formatted, JSON.stringify(meta));
    } else {
      console.warn(formatted);
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage(LogLevel.ERROR, message);
    const errorDetail =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    console.error(formatted, { error: errorDetail, ...meta });
  }

  /**
   * Create a child logger with additional context.
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.minLevel);
  }
}

/**
 * Factory function to create a new Logger instance.
 */
export function createLogger(context: string): Logger {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  let minLevel = LogLevel.DEBUG;
  if (envLevel === 'INFO') minLevel = LogLevel.INFO;
  if (envLevel === 'WARN') minLevel = LogLevel.WARN;
  if (envLevel === 'ERROR') minLevel = LogLevel.ERROR;
  return new Logger(context, minLevel);
}
