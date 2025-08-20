// Custom request logging middleware with performance tracking
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Request logging middleware that tracks HTTP requests
 * Measures response time and logs comprehensive request/response information
 * Includes response body for error responses (4xx/5xx) for debugging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override the response send method to capture timing
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    // Log request details with performance metrics
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      // Include response body only for error responses
      ...(res.statusCode >= 400 && { responseBody: body })
    });
    
    // Call the original send method
    return originalSend.call(this, body);
  };
  
  next();
};