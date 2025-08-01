// Main application entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import productsRoutes from './routes/products';
import instancesRoutes from './routes/instances';
import pagesRoutes from './routes/pages';
import eventsRoutes from './routes/events';
import variablesRoutes from './routes/variables';
import suggestedValuesRoutes from './routes/suggestedValues';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app and configuration
const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Security and parsing middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin resource sharing
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
    service: 'trackmap-backend'
  });
});

// Health check endpoint with database connectivity test
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed', { error });
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/products', productsRoutes);
app.use('/api/instances', instancesRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/variables', variablesRoutes);
app.use('/api/suggested-values', suggestedValuesRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Global error handler

/**
 * Start the server with proper error handling
 * Ensures database connection before accepting requests
 */
const startServer = async () => {
  try {
    // Connect to database first
    await prisma.$connect();
    logger.info('Database connected successfully');
    
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

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();