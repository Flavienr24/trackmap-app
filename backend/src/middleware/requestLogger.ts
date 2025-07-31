import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ...(res.statusCode >= 400 && { responseBody: body })
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};