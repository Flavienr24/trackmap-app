// Pages controller - handles all page-related HTTP requests
// Pages represent trackable pages within a product/instance
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

/**
 * Get all pages for a specific product with optional filters
 * GET /api/products/:id/pages?has_events=true
 */
export const getPagesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { has_events } = req.query;
    
    logger.debug('Fetching pages for product', { 
      productId, 
      filters: { has_events },
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

    // Fetch pages with event filtering
    const pages = await prisma.page.findMany({
      where: { productId },
      include: {
        events: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Filter pages that have events if requested
    let filteredPages = pages;
    if (has_events === 'true') {
      filteredPages = pages.filter((page: any) => page.events.length > 0);
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
 * Create a new page for a product
 * POST /api/products/:id/pages
 */
export const createPage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { name, url } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Page name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!url) {
      const error: AppError = new Error('Page URL is required');
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

    logger.debug('Creating new page', { 
      productId,
      name,
      url,
      requestId: req.ip 
    });

    // Create page
    const page = await prisma.page.create({
      data: {
        productId,
        name,
        url
      },
      include: {
        product: true,
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
        events: true
      }
    });

    if (!page) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Page fetched successfully', { 
      pageId: id,
      pageName: page.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: page
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
    const { name, url } = req.body;

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

    // Update page
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url })
      },
      include: {
        product: true,
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