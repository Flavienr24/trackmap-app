// Custom request logging middleware with performance tracking
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Request logging middleware that tracks HTTP requests
 * Measures response time and logs request metadata (sanitized)
 * Does not log request/response bodies to prevent PII leakage
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override the response send method to capture timing
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;

    // Log request details with performance metrics (no body data)
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
      // Note: Request/response bodies removed to prevent logging of sensitive data
    });

    // Call the original send method
    return originalSend.call(this, body);
  };

  next();
};