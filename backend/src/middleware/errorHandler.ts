// Global error handling middleware for Express application
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Extended Error interface with HTTP status code and operational flag
 * Used for application-specific errors with proper error classification
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean; // Distinguishes operational errors from programming errors
}

/**
 * Global error handler middleware
 * Logs errors with full context and returns consistent error responses
 * Sanitizes error messages in production to avoid information leakage
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  // Log the error with comprehensive request context
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body
    }
  });
  
  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, hide internal server error details
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Internal Server Error' : message
    });
  } else {
    // In development, include stack trace for debugging
    res.status(statusCode).json({
      success: false,
      message,
      stack: error.stack
    });
  }
};

/**
 * 404 Not Found handler middleware
 * Logs route access attempts and returns standardized 404 response
 */
export const notFoundHandler = (req: Request, res: Response) => {
  // Log the attempt to access non-existent route
  logger.warn('Route Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  // Return consistent 404 response
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};