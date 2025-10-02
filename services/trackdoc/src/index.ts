// TrackDoc API - Documentation service entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './config/logger';
import { db, disconnectDatabase, checkDatabaseHealth } from './config/database';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { apiRateLimit } from './middleware/rateLimiter';
import productsRoutes from './routes/products';
import pagesRoutes from './routes/pages';
import eventsRoutes from './routes/events';
import propertiesRoutes from './routes/properties';
import suggestedValuesRoutes from './routes/suggestedValues';
import commentsRoutes from './routes/comments';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app and configuration
const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration - restrict to allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.BFF_URL,
].filter(Boolean); // Remove undefined values

// Log allowed origins on startup
logger.info('CORS configured with allowed origins', { allowedOrigins });

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      logger.debug('CORS request allowed', { origin });
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  maxAge: 86400 // 24 hours
};

// Security and parsing middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // Cross-origin resource sharing with restrictions
app.use(apiRateLimit); // Global rate limiting (100 req/15min per IP)
app.use(express.json({ limit: '10mb' })); // JSON body parser with size limit
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser

// Custom request logging middleware
app.use(requestLogger);

// Morgan HTTP request logger integrated with Winston
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'trackdoc-api'
  });
});

// Health check endpoint with database connectivity test (no auth required)
app.get('/api/health', async (req, res) => {
  try {
    // Use singleton database client for health check
    const isHealthy = await checkDatabaseHealth();
    if (isHealthy) {
      res.json({
        status: 'OK',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'ERROR',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Database health check failed', { error });
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// TrackDoc API routes - Documentation CRUD operations (all protected with authentication)
app.use('/api/products', authenticate, productsRoutes);
app.use('/api/pages', authenticate, pagesRoutes);
app.use('/api/events', authenticate, eventsRoutes);
app.use('/api/properties', authenticate, propertiesRoutes);
app.use('/api/suggested-values', authenticate, suggestedValuesRoutes);
app.use('/api/comments', authenticate, commentsRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Global error handler

/**
 * Start the server with proper error handling
 * Database connection is already established via singleton
 */
const startServer = async () => {
  try {
    // Verify database connection using singleton
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }

    logger.info('Database connected successfully via singleton');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown handlers using singleton disconnect function
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

startServer();