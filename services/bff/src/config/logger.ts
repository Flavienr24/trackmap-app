// BFF Logger configuration
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from './index';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service = 'bff', ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] [${service}]: ${message}${metaStr}`;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: config.nodeEnv === 'development' ? 'debug' : config.logging.level
  })
];

// File transports (only in production or when LOG_TO_FILE is set)
if (config.nodeEnv === 'production' || process.env.LOG_TO_FILE === 'true') {
  // Combined log
  transports.push(
    new DailyRotateFile({
      filename: 'logs/bff-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxFiles: config.logging.maxFiles,
      maxSize: config.logging.maxSize,
      level: config.logging.level
    })
  );

  // Error log
  transports.push(
    new DailyRotateFile({
      filename: 'logs/bff-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxFiles: config.logging.maxFiles,
      maxSize: config.logging.maxSize,
      level: 'error'
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { 
    service: 'trackmap-bff',
    environment: config.nodeEnv 
  },
  transports,
  exitOnError: false
});

export default logger;