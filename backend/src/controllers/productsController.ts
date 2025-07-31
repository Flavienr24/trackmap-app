// Products controller - handles all product-related HTTP requests
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * Get all products with their related data
 * Includes instances, pages, events, variables, and suggested values
 * Returns products ordered by last update date
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Fetching all products', { requestId: req.ip });
    
    // Fetch all products with comprehensive related data
    const products = await prisma.product.findMany({
      include: {
        instances: true,
        pages: {
          include: {
            events: true // Include events for each page
          }
        },
        variables: true,
        suggestedValues: true
      },
      orderBy: {
        updatedAt: 'desc' // Most recently updated first
      }
    });

    logger.info('Products fetched successfully', { 
      count: products.length,
      requestId: req.ip 
    });

    // Return standardized API response
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    logger.error('Error fetching products', { error, requestId: req.ip });
    next(error); // Pass to error handler middleware
  }
};

/**
 * Get a single product by ID with all related data
 * Returns 404 if product doesn't exist
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching product by ID', { productId: id, requestId: req.ip });

    // Find product with all related entities
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        instances: true,
        pages: {
          include: {
            events: true // Include events for comprehensive view
          }
        },
        variables: true,
        suggestedValues: true
      }
    });

    // Handle product not found case
    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Product fetched successfully', { 
      productId: id,
      productName: product.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error fetching product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new product with validation
 * Validates business rules for hasInstances and currentEnvironment relationship
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, hasInstances, currentEnvironment } = req.body;

    // Validate required name field
    if (!name) {
      const error: AppError = new Error('Product name is required');
      error.statusCode = 400;
      return next(error);
    }

    // Business rule: if product doesn't have instances, currentEnvironment is required
    if (hasInstances === false && !currentEnvironment) {
      const error: AppError = new Error('currentEnvironment is required when hasInstances is false');
      error.statusCode = 400;
      return next(error);
    }

    // Business rule: if product has instances, currentEnvironment should not be set
    if (hasInstances === true && currentEnvironment) {
      const error: AppError = new Error('currentEnvironment should not be set when hasInstances is true');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Creating new product', { 
      name, 
      hasInstances, 
      currentEnvironment,
      requestId: req.ip 
    });

    // Create product with related data structure ready
    const product = await prisma.product.create({
      data: {
        name,
        description,
        hasInstances: hasInstances ?? false, // Default to false if not specified
        currentEnvironment: hasInstances === false ? currentEnvironment : null
      },
      include: {
        instances: true,
        pages: true,
        variables: true,
        suggestedValues: true
      }
    });

    logger.info('Product created successfully', { 
      productId: product.id,
      productName: product.name,
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
    const { name, description, hasInstances, currentEnvironment } = req.body;

    logger.debug('Updating product', { 
      productId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    if (hasInstances === false && !currentEnvironment) {
      const error: AppError = new Error('currentEnvironment is required when hasInstances is false');
      error.statusCode = 400;
      return next(error);
    }

    if (hasInstances === true && currentEnvironment) {
      const error: AppError = new Error('currentEnvironment should not be set when hasInstances is true');
      error.statusCode = 400;
      return next(error);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hasInstances !== undefined && { hasInstances }),
        ...(hasInstances === false && { currentEnvironment }),
        ...(hasInstances === true && { currentEnvironment: null })
      },
      include: {
        instances: true,
        pages: true,
        variables: true,
        suggestedValues: true
      }
    });

    logger.info('Product updated successfully', { 
      productId: id,
      productName: product.name,
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

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    await prisma.product.delete({
      where: { id }
    });

    logger.info('Product deleted successfully', { 
      productId: id,
      productName: existingProduct.name,
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