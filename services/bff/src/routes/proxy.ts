// Proxy routes - Forward API calls to TrackDoc service
import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import config from '../config';
import logger from '../config/logger';

// Ensure environment variables are loaded
dotenv.config();

const router = Router();

/**
 * Middleware to inject API key into all proxied requests
 * Must run BEFORE the proxy middleware
 */
const injectApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.TRACKDOC_API_KEY;

  if (apiKey) {
    req.headers['x-api-key'] = apiKey;
    logger.debug('API key injected', { method: req.method, path: req.url });
  } else {
    logger.error('TRACKDOC_API_KEY not found in environment');
  }

  next();
};

/**
 * Proxy middleware to forward all requests to TrackDoc
 * Uses http-proxy-middleware to preserve multipart/form-data and all headers
 */
const proxyMiddleware = createProxyMiddleware({
  target: config.services.trackdoc.baseUrl,
  changeOrigin: true,

  // Path rewriting: BFF receives /products, TrackDoc expects /api/products
  pathRewrite: {
    '^/': '/api/'  // Prepend /api to all paths
  },

  // Log provider
  logProvider: () => logger,

  // Log each proxied request
  logger: logger as any
});

// Apply middlewares in order: 1) inject API key, 2) proxy
router.use('/', injectApiKey, proxyMiddleware);

export default router;
