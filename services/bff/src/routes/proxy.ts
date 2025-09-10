// Proxy routes - Forward API calls to TrackDoc service
import { Router } from 'express';
import { trackdocClient } from '../services/trackdocClient';
import logger from '../config/logger';

const router = Router();

/**
 * Generic proxy middleware to forward requests to TrackDoc
 * Uses the raw axios client to preserve full response structure
 */
router.use('*', async (req, res, next) => {
  try {
    const path = req.originalUrl.replace('/api', '/api');  // Keep /api prefix for TrackDoc
    const method = req.method.toLowerCase();
    
    logger.debug('Proxying request to TrackDoc', {
      path,
      method: req.method,
      query: req.query,
      requestId: req.ip
    });

    // Build query string if present
    const queryString = Object.keys(req.query).length > 0 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString()
      : '';
    
    const fullPath = path + queryString;
    
    let response;
    
    switch (method) {
      case 'get':
        response = await (trackdocClient as any).client.get(fullPath);
        break;
      case 'post':
        response = await (trackdocClient as any).client.post(fullPath, req.body);
        break;
      case 'put':
        response = await (trackdocClient as any).client.put(fullPath, req.body);
        break;
      case 'delete':
        response = await (trackdocClient as any).client.delete(fullPath);
        break;
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }

    logger.info('Request proxied successfully', {
      path: fullPath,
      method: req.method,
      status: response.status,
      requestId: req.ip
    });

    // Return the exact response from TrackDoc
    res.status(response.status).json(response.data);
  } catch (error: any) {
    logger.error('Proxy request failed', {
      error: error.message,
      path: req.originalUrl,
      method: req.method,
      status: error.response?.status,
      requestId: req.ip
    });
    
    // Forward TrackDoc errors with proper status codes
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
});

export default router;