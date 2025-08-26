// BFF Configuration
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Services URLs
  services: {
    trackdoc: {
      baseUrl: process.env.TRACKDOC_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.TRACKDOC_TIMEOUT || '5000'),
    },
    // TrackAudit integration
    trackaudit: {
      baseUrl: process.env.TRACKAUDIT_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.TRACKAUDIT_TIMEOUT || '10000'),
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
  },

  // API settings
  api: {
    prefix: '/api/bff',
    requestLimit: process.env.REQUEST_LIMIT || '10mb',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
    }
  },

  // Cache settings
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
    enabled: process.env.CACHE_ENABLED !== 'false',
  }
};

export default config;