// BFF Error handling middleware
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError, ApiResponse } from '../types';
import config from '../config';

/**
 * Global error handler for BFF
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const appError = error as AppError;
  
  // Log error with context
  const errorContext = {
    message: error.message,
    stack: config.nodeEnv === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: appError.statusCode || 500,
    isOperational: appError.isOperational || false
  };

  if (appError.statusCode && appError.statusCode < 500) {
    logger.warn('Client error', errorContext);
  } else {
    logger.error('Server error', errorContext);
  }

  // Don't expose internal errors in production
  const isDevelopment = config.nodeEnv === 'development';
  const statusCode = appError.statusCode || 500;
  
  let message = error.message;
  if (!isDevelopment && statusCode >= 500) {
    message = 'Internal server error';
  }

  const errorResponse: ApiResponse = {
    success: false,
    error: message,
    ...(isDevelopment && {
      stack: error.stack,
      statusCode
    })
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response<ApiResponse>) => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
};

/**
 * Async error wrapper for controllers
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};