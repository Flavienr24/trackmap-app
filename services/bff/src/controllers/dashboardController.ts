// Dashboard Controller - BFF endpoints optimized for UI
import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { trackauditClient } from '../services/trackauditClient';
import logger from '../config/logger';
import { ApiResponse } from '../types';

export class DashboardController {
  /**
   * GET /api/bff/dashboard
   * Main dashboard data with aggregated metrics
   */
  async getDashboard(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      logger.info('Dashboard data requested', { ip: req.ip });

      const dashboardData = await dashboardService.getDashboardData();

      res.json({
        success: true,
        data: dashboardData,
        meta: {
          generatedAt: new Date().toISOString(),
          cacheKey: 'dashboard_main'
        }
      });
    } catch (error) {
      logger.error('Dashboard request failed', { 
        error: (error as Error).message,
        stack: (error as Error).stack,
        ip: req.ip 
      });
      next(error);
    }
  }

  /**
   * GET /api/bff/products/:id/overview
   * Comprehensive product overview with stats and recent data
   */
  async getProductOverview(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { id: productId } = req.params;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      logger.info('Product overview requested', { productId, ip: req.ip });

      const overview = await dashboardService.getProductOverview(productId);

      res.json({
        success: true,
        data: overview,
        meta: {
          productId,
          generatedAt: new Date().toISOString(),
          cacheKey: `product_overview_${productId}`
        }
      });
    } catch (error) {
      logger.error('Product overview request failed', { 
        productId: req.params.id,
        error: (error as Error).message,
        ip: req.ip 
      });

      // Handle 404 specifically
      if ((error as any).statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/bff/health
   * BFF health check with dependencies status
   */
  async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      // Check dependencies
      const trackdocClient = await import('../services/trackdocClient');
      const [trackdocHealth, trackauditHealth] = await Promise.all([
        trackdocClient.trackdocClient.healthCheck(),
        trackauditClient.healthCheck()
      ]);

      const health = {
        status: 'OK',
        service: 'trackmap-bff',
        timestamp: new Date().toISOString(),
        dependencies: {
          trackdoc: trackdocHealth ? 'healthy' : 'unhealthy',
          trackaudit: trackauditHealth ? 'healthy' : 'unhealthy'
        },
        version: '1.0.0'
      };

      const httpStatus = (trackdocHealth && trackauditHealth) ? 200 : 503;

      res.status(httpStatus).json(health);
    } catch (error) {
      logger.error('Health check failed', { error: (error as Error).message });
      
      res.status(503).json({
        status: 'ERROR',
        service: 'trackmap-bff',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }

  /**
   * GET /api/bff/stats/summary
   * Quick stats summary for widgets
   */
  async getStatsSummary(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      logger.debug('Stats summary requested', { ip: req.ip });

      const dashboardData = await dashboardService.getDashboardData();

      // Extract only summary data for lightweight response
      res.json({
        success: true,
        data: dashboardData.summary,
        meta: {
          generatedAt: new Date().toISOString(),
          type: 'summary'
        }
      });
    } catch (error) {
      logger.error('Stats summary request failed', { 
        error: (error as Error).message,
        ip: req.ip 
      });
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();