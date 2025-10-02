// API Key authentication middleware
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Authentication middleware for API key validation
 * Validates requests using X-API-Key header
 * Returns 401 for missing or invalid API keys
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');
  const expectedApiKey = process.env.API_KEY;

  // Check if API key is configured
  if (!expectedApiKey) {
    logger.error('API_KEY not configured in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Authentication not configured'
    });
  }

  // Check if API key is provided
  if (!apiKey) {
    logger.warn('Authentication failed: Missing API key', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide X-API-Key header.'
    });
  }

  // Validate API key
  if (apiKey !== expectedApiKey) {
    logger.warn('Authentication failed: Invalid API key', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // API key is valid, proceed
  logger.debug('Authentication successful', {
    ip: req.ip,
    method: req.method,
    url: req.url
  });

  next();
};
