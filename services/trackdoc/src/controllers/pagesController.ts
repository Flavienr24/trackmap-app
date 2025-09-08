// Pages controller - handles all page-related HTTP requests
// Pages represent trackable pages within a product/instance
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import { generateSlug, generateUniqueSlug } from '../utils/slugs';

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

    // Find product by ID only
    const productWhereClause = { id: productId };

    // Verify product exists first
    const product = await prisma.product.findUnique({
      where: productWhereClause
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch pages with event filtering
    const pages = await prisma.page.findMany({
      where: { productId: product.id },
      include: {
        events: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter pages that have events if requested
    let filteredPages = pages;
    if (has_events === 'true') {
      filteredPages = pages.filter((page: any) => page.events.length > 0);
    }

    logger.info('Pages fetched successfully', { 
      productId: product.id,
      productId: product.id,
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

    // Find product by ID only
    const productWhereClause = { id: productId };

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: productWhereClause
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Get existing page slugs for this product to ensure uniqueness
    const existingPages = await prisma.page.findMany({
      where: { productId: product.id },
      select: { slug: true }
    });
    const existingSlugs = existingPages.map(p => p.slug);
    
    // Generate unique slug for this page
    const slug = generateUniqueSlug(name, existingSlugs);

    logger.debug('Creating new page', { 
      productId: product.id,
      name,
      url,
      slug,
      requestId: req.ip 
    });

    // Create page
    const page = await prisma.page.create({
      data: {
        productId: product.id,
        name,
        slug,
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
      pageSlug: page.slug,
      productId: product.id,
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
 * Get a single page by ID or slug with all related data
 * GET /api/pages/:id
 * For slug-based lookup: GET /api/products/:productId/pages/:slug
 */
export const getPageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching page by ID or slug', { pageId: id, requestId: req.ip });

    // Try to find by ID first if it looks like a cuid
    let page;
    
    if (id.startsWith('c') && id.length > 20) {
      // Look up by ID
      page = await prisma.page.findUnique({
        where: { id },
        include: {
          product: true,
          events: true
        }
      });
    } else {
      // For slug-based lookup, we need both product and page slug
      // This endpoint is mainly used by direct ID access
      // Slug-based access should use /api/products/:productSlug/pages/:pageSlug
      const error: AppError = new Error('Page not found. Use /api/products/{productSlug}/pages/{pageSlug} for slug-based access.');
      error.statusCode = 404;
      return next(error);
    }

    if (!page) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Page fetched successfully', { 
      pageId: page.id,
      pageName: page.name,
      pageSlug: page.slug,
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
 * Get a page by product slug and page slug
 * GET /api/products/:productSlug/pages/:pageSlug
 */
export const getPageBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productSlug, pageSlug } = req.params;
    
    logger.debug('Fetching page by slug', { productSlug, pageSlug, requestId: req.ip });

    // First find the product by slug
    const product = await prisma.product.findUnique({
      where: { id: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Then find the page by product ID and page slug
    const page = await prisma.page.findFirst({
      where: { 
        productId: product.id,
        slug: pageSlug
      },
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
      pageId: page.id,
      pageName: page.name,
      pageSlug: page.slug,
      productSlug,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    logger.error('Error fetching page', { error, productSlug: req.params.productSlug, pageSlug: req.params.pageSlug, requestId: req.ip });
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

    // Try to find by ID if it looks like a cuid
    if (!id.startsWith('c') || id.length <= 20) {
      const error: AppError = new Error('Page not found. Use /api/products/{productSlug}/pages/{pageSlug} for slug-based updates.');
      error.statusCode = 404;
      return next(error);
    }
    
    const whereClause = { id };

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: whereClause
    });

    if (!existingPage) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    let updateData: any = {};
    
    // Add name and potentially regenerate slug
    if (name !== undefined) {
      updateData.name = name;
      
      // Generate new slug if name changed
      if (name !== existingPage.name) {
        const existingPages = await prisma.page.findMany({
          where: { 
            productId: existingPage.productId,
            id: { not: existingPage.id } // Exclude current page
          },
          select: { slug: true }
        });
        const existingSlugs = existingPages.map(p => p.slug);
        updateData.slug = generateUniqueSlug(name, existingSlugs);
      }
    }
    
    // Add URL if provided
    if (url !== undefined) {
      updateData.url = url;
    }

    // Update page
    const page = await prisma.page.update({
      where: { id: existingPage.id },
      data: updateData,
      include: {
        product: true,
        events: true
      }
    });

    logger.info('Page updated successfully', { 
      pageId: existingPage.id,
      pageName: page.name,
      pageSlug: page.slug,
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

    // Try to find by ID if it looks like a cuid
    if (!id.startsWith('c') || id.length <= 20) {
      const error: AppError = new Error('Page not found. Use /api/products/{productSlug}/pages/{pageSlug} for slug-based deletion.');
      error.statusCode = 404;
      return next(error);
    }
    
    const whereClause = { id };

    const existingPage = await prisma.page.findUnique({
      where: whereClause
    });

    if (!existingPage) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete page (cascade will handle related events)
    await prisma.page.delete({
      where: { id: existingPage.id }
    });

    logger.info('Page deleted successfully', { 
      pageId: existingPage.id,
      pageName: existingPage.name,
      pageSlug: existingPage.slug,
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