import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
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
  
  if (process.env.NODE_ENV === 'production') {
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Internal Server Error' : message
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message,
      stack: error.stack
    });
  }
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};