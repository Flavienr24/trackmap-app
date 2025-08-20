// Request logging middleware for BFF
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Enhanced request logging middleware with performance metrics
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Generate request ID for tracing
  const requestId = `bff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - start;
    
    // Log response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: body?.success || res.statusCode < 400,
      responseSize: JSON.stringify(body).length,
      timestamp: new Date().toISOString()
    });

    // Performance warning for slow requests
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`
      });
    }

    return originalJson.call(this, body);
  };

  next();
};