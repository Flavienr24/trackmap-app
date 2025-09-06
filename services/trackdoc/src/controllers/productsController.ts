// Products controller - handles all product-related HTTP requests
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import { generateSlug, generateUniqueSlug } from '../utils/slugs';

// Use centralized database instance
const prisma = db;

/**
 * Get all products with their related data
 * Includes pages, events, variables, and suggested values
 * Returns products ordered by last update date
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Fetching all products', { requestId: req.ip });
    
    // Fetch all products with comprehensive related data
    const products = await prisma.product.findMany({
      include: {
        pages: {
          include: {
            events: true // Include events for each page
          }
        },
        properties: true,
        suggestedValues: true
      },
      orderBy: {
        createdAt: 'desc' // Most recently created first
      }
    });

    // Add computed fields for each product
    const enrichedProducts = products.map(product => {
      const totalEvents = product.pages.reduce((acc, page) => acc + page.events.length, 0);
      
      return {
        ...product,
        pages_count: product.pages.length,
        events_count: totalEvents,
        health_score: totalEvents > 0 ? Math.round((product.pages.length * 20) + (totalEvents * 10)) : 0
      };
    });

    logger.info('Products fetched successfully', { 
      count: enrichedProducts.length,
      requestId: req.ip 
    });

    // Return standardized API response
    res.json({
      success: true,
      data: enrichedProducts,
      count: enrichedProducts.length
    });
  } catch (error) {
    logger.error('Error fetching products', { error, requestId: req.ip });
    next(error); // Pass to error handler middleware
  }
};

/**
 * Get a single product by ID or slug with all related data
 * Returns 404 if product doesn't exist
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching product by ID or slug', { productId: id, requestId: req.ip });

    // Try to find by slug first, then by ID if it looks like a cuid
    let whereClause: { id?: string; slug?: string };
    
    // If the param looks like a cuid (starts with 'c' and is long), search by ID
    if (id.startsWith('c') && id.length > 20) {
      whereClause = { id };
    } else {
      // Otherwise, search by slug
      whereClause = { slug: id };
    }

    // Find product with all related entities
    const product = await prisma.product.findUnique({
      where: whereClause,
      include: {
        pages: {
          include: {
            events: true // Include events for comprehensive view
          }
        },
        properties: true,
        suggestedValues: true
      }
    });

    // Handle product not found case
    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Add computed fields like in getAllProducts
    const totalEvents = product.pages.reduce((acc, page) => acc + page.events.length, 0);
    
    const enrichedProduct = {
      ...product,
      pages_count: product.pages.length,
      events_count: totalEvents,
      health_score: totalEvents > 0 ? Math.round((product.pages.length * 20) + (totalEvents * 10)) : 0
    };

    logger.info('Product fetched successfully', { 
      productId: id,
      productName: product.name,
      eventsCount: totalEvents,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: enrichedProduct
    });
  } catch (error) {
    logger.error('Error fetching product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new product with validation
 * Simplified version without instances support
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;

    // Validate required name field
    if (!name) {
      const error: AppError = new Error('Product name is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Creating new product', { 
      name, 
      description,
      requestId: req.ip 
    });

    // Get existing slugs to ensure uniqueness
    const existingProducts = await prisma.product.findMany({
      select: { slug: true }
    });
    const existingSlugs = existingProducts.map(p => p.slug);
    
    // Generate unique slug
    const slug = generateUniqueSlug(name, existingSlugs);

    // Create product with related data structure ready
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description
      },
      include: {
        pages: true,
        properties: true,
        suggestedValues: true
      }
    });

    logger.info('Product created successfully', { 
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      requestId: req.ip 
    });

    // Return created product with 201 status
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error creating product', { error, body: req.body, requestId: req.ip });
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    logger.debug('Updating product', { 
      productId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Try to find by slug first, then by ID if it looks like a cuid
    let whereClause: { id?: string; slug?: string };
    
    if (id.startsWith('c') && id.length > 20) {
      whereClause = { id };
    } else {
      whereClause = { slug: id };
    }

    const existingProduct = await prisma.product.findUnique({
      where: whereClause
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    let updateData: any = {};
    
    // Add name if provided
    if (name !== undefined) {
      updateData.name = name;
      
      // Generate new slug if name changed
      if (name !== existingProduct.name) {
        const existingProducts = await prisma.product.findMany({
          select: { slug: true },
          where: { id: { not: existingProduct.id } } // Exclude current product
        });
        const existingSlugs = existingProducts.map(p => p.slug);
        updateData.slug = generateUniqueSlug(name, existingSlugs);
      }
    }
    
    // Add description if provided
    if (description !== undefined) {
      updateData.description = description;
    }

    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: updateData,
      include: {
        pages: true,
        properties: true,
        suggestedValues: true
      }
    });

    logger.info('Product updated successfully', { 
      productId: existingProduct.id,
      productName: product.name,
      productSlug: product.slug,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error updating product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting product', { productId: id, requestId: req.ip });

    // Try to find by slug first, then by ID if it looks like a cuid
    let whereClause: { id?: string; slug?: string };
    
    if (id.startsWith('c') && id.length > 20) {
      whereClause = { id };
    } else {
      whereClause = { slug: id };
    }

    const existingProduct = await prisma.product.findUnique({
      where: whereClause
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    await prisma.product.delete({
      where: { id: existingProduct.id }
    });

    logger.info('Product deleted successfully', { 
      productId: existingProduct.id,
      productName: existingProduct.name,
      productSlug: existingProduct.slug,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};