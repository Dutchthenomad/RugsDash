import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from '../config/env';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Daily rotate file transport for all logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Daily rotate file transport for errors only
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat,
});

// Create logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rugsdash' },
  transports: [
    // Write all logs to daily rotate file
    dailyRotateFileTransport,
    // Write errors to separate file
    errorFileTransport,
  ],
});

// Add console transport for non-production environments
if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: env.LOG_FORMAT === 'json' ? logFormat : consoleFormat,
  }));
}

// Create child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Log unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Export main logger
export default logger;

// Convenience methods
export const loggers = {
  auth: createLogger('auth'),
  api: createLogger('api'),
  websocket: createLogger('websocket'),
  qlearning: createLogger('qlearning'),
  database: createLogger('database'),
  prediction: createLogger('prediction'),
};

// Request logging middleware
export const requestLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'rugsdash-requests' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'requests-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '7d',
    }),
  ],
});

// Performance logging
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'rugsdash-performance' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});