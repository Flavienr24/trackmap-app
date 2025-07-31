// Winston logger configuration with daily rotation
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Directory for log files
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Main logger instance with structured logging
 * Uses JSON format for production environments
 * Includes automatic log rotation by day
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Configurable log level
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Include stack traces for errors
    winston.format.json() // Structured JSON logging
  ),
  defaultMeta: {
    service: 'trackmap-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error-only log file with 30-day retention
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d', // Keep 30 days of error logs
      maxSize: '20m', // Rotate when file reaches 20MB
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Combined log file with 7-day retention
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d', // Keep 7 days of combined logs
      maxSize: '20m', // Rotate when file reaches 20MB
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console logging for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(), // Add colors for better readability
      winston.format.simple() // Human-readable format
    )
  }));
}

export default logger;