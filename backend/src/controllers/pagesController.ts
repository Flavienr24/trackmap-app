// Pages controller - handles all page-related HTTP requests
// Pages represent trackable pages within a product/instance
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * Get all pages for a specific product with optional filters
 * GET /api/products/:id/pages?instance=FR&has_events=true
 */
export const getPagesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { instance, has_events } = req.query;
    
    logger.debug('Fetching pages for product', { 
      productId, 
      filters: { instance, has_events },
      requestId: req.ip 
    });

    // Verify product exists first
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Build query filters
    const whereClause: any = { productId };

    // Filter by instance code if provided
    if (instance && typeof instance === 'string') {
      const instanceRecord = await prisma.instance.findFirst({
        where: { 
          productId,
          code: instance 
        }
      });
      
      if (instanceRecord) {
        whereClause.instanceId = instanceRecord.id;
      } else {
        // If instance code doesn't exist, return empty result
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }
    }

    // Fetch pages with optional event filtering
    const pages = await prisma.page.findMany({
      where: whereClause,
      include: {
        instance: true,
        events: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Filter pages that have events if requested
    let filteredPages = pages;
    if (has_events === 'true') {
      filteredPages = pages.filter(page => page.events.length > 0);
    }

    logger.info('Pages fetched successfully', { 
      productId,
      count: filteredPages.length,
      totalPages: pages.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: filteredPages,
      count: filteredPages.length
    });
  } catch (error) {
    logger.error('Error fetching pages', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get all pages for a specific instance
 * GET /api/instances/:id/pages
 */
export const getPagesByInstance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: instanceId } = req.params;
    
    logger.debug('Fetching pages for instance', { instanceId, requestId: req.ip });

    // Verify instance exists first
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId }
    });

    if (!instance) {
      const error: AppError = new Error('Instance not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all pages for the instance
    const pages = await prisma.page.findMany({
      where: { instanceId },
      include: {
        instance: true,
        events: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    logger.info('Pages fetched successfully', { 
      instanceId,
      count: pages.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: pages,
      count: pages.length
    });
  } catch (error) {
    logger.error('Error fetching pages', { error, instanceId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new page for a product
 * POST /api/products/:id/pages
 */
export const createPage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { name, urls, instanceId } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Page name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!urls) {
      const error: AppError = new Error('Page URLs are required');
      error.statusCode = 400;
      return next(error);
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // If instanceId provided, verify it belongs to the product
    if (instanceId) {
      const instance = await prisma.instance.findUnique({
        where: { id: instanceId }
      });

      if (!instance || instance.productId !== productId) {
        const error: AppError = new Error('Instance not found or does not belong to this product');
        error.statusCode = 400;
        return next(error);
      }
    }

    logger.debug('Creating new page', { 
      productId,
      instanceId,
      name,
      requestId: req.ip 
    });

    // Create page
    const page = await prisma.page.create({
      data: {
        productId,
        instanceId: instanceId || null,
        name,
        urls: typeof urls === 'string' ? urls : JSON.stringify(urls)
      },
      include: {
        product: true,
        instance: true,
        events: true
      }
    });

    logger.info('Page created successfully', { 
      pageId: page.id,
      pageName: page.name,
      productId,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: page
    });
  } catch (error) {
    logger.error('Error creating page', { error, body: req.body, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single page by ID with all related data
 * GET /api/pages/:id
 */
export const getPageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching page by ID', { pageId: id, requestId: req.ip });

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        product: true,
        instance: true,
        events: true
      }
    });

    if (!page) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    // Parse URLs if stored as JSON string
    const pageData = {
      ...page,
      urls: typeof page.urls === 'string' ? JSON.parse(page.urls) : page.urls
    };

    logger.info('Page fetched successfully', { 
      pageId: id,
      pageName: page.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: pageData
    });
  } catch (error) {
    logger.error('Error fetching page', { error, pageId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing page
 * PUT /api/pages/:id
 */
export const updatePage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, urls, instanceId } = req.body;

    logger.debug('Updating page', { 
      pageId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { id }
    });

    if (!existingPage) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    // If instanceId provided, verify it exists and belongs to the same product
    if (instanceId !== undefined) {
      if (instanceId) {
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId }
        });

        if (!instance || instance.productId !== existingPage.productId) {
          const error: AppError = new Error('Instance not found or does not belong to this product');
          error.statusCode = 400;
          return next(error);
        }
      }
    }

    // Update page
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(urls !== undefined && { urls: typeof urls === 'string' ? urls : JSON.stringify(urls) }),
        ...(instanceId !== undefined && { instanceId: instanceId || null })
      },
      include: {
        product: true,
        instance: true,
        events: true
      }
    });

    logger.info('Page updated successfully', { 
      pageId: id,
      pageName: page.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    logger.error('Error updating page', { error, pageId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a page and all related events
 * DELETE /api/pages/:id
 */
export const deletePage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting page', { pageId: id, requestId: req.ip });

    const existingPage = await prisma.page.findUnique({
      where: { id }
    });

    if (!existingPage) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete page (cascade will handle related events)
    await prisma.page.delete({
      where: { id }
    });

    logger.info('Page deleted successfully', { 
      pageId: id,
      pageName: existingPage.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting page', { error, pageId: req.params.id, requestId: req.ip });
    next(error);
  }
};