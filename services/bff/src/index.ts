// TrackMap BFF - Backend For Frontend entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import config from './config';
import logger from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import dashboardRoutes from './routes/dashboard';
import proxyRoutes from './routes/proxy';
import { trackdocClient } from './services/trackdocClient';
import { trackauditClient } from './services/trackauditClient';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Security and parsing middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin resource sharing
app.use(express.json({ limit: config.api.requestLimit })); // JSON body parser
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
app.get('/health', async (req, res) => {
  try {
    const [trackdocHealth, trackauditHealth] = await Promise.all([
      trackdocClient.healthCheck(),
      trackauditClient.healthCheck()
    ]);
    
    const allHealthy = trackdocHealth && trackauditHealth;
    
    res.status(allHealthy ? 200 : 503).json({ 
      status: allHealthy ? 'OK' : 'DEGRADED', 
      service: 'trackmap-bff',
      timestamp: new Date().toISOString(),
      dependencies: {
        trackdoc: trackdocHealth ? 'healthy' : 'unhealthy',
        trackaudit: trackauditHealth ? 'healthy' : 'unhealthy'
      },
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({
      status: 'ERROR',
      service: 'trackmap-bff',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// BFF API routes - optimized for frontend consumption  
app.use(`${config.api.prefix}/dashboard`, dashboardRoutes);

// Proxy routes - Forward all other /api requests to TrackDoc (must be after specific routes)
app.use(`${config.api.prefix}`, proxyRoutes);

// Future routes (commented for now)
// app.use(`${config.api.prefix}/search`, searchRoutes);
// app.use(`${config.api.prefix}/analytics`, analyticsRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Global error handler

/**
 * Start the BFF server with dependency checks
 */
const startServer = async () => {
  try {
    // Check services availability
    const [trackdocHealthy, trackauditHealthy] = await Promise.all([
      trackdocClient.healthCheck(),
      trackauditClient.healthCheck()
    ]);
    
    if (!trackdocHealthy) {
      logger.warn('TrackDoc service is not available - starting BFF anyway', {
        trackdocUrl: config.services.trackdoc.baseUrl
      });
    } else {
      logger.info('TrackDoc service is healthy', {
        trackdocUrl: config.services.trackdoc.baseUrl
      });
    }

    if (!trackauditHealthy) {
      logger.warn('TrackAudit service is not available - starting BFF anyway', {
        trackauditUrl: config.services.trackaudit.baseUrl
      });
    } else {
      logger.info('TrackAudit service is healthy', {
        trackauditUrl: config.services.trackaudit.baseUrl
      });
    }
    
    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`BFF server running on port ${config.port}`, {
        port: config.port,
        environment: config.nodeEnv,
        apiPrefix: config.api.prefix,
        trackdocUrl: config.services.trackdoc.baseUrl,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start BFF server', { error: (error as Error).message });
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down BFF gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down BFF gracefully');
  process.exit(0);
});

startServer();