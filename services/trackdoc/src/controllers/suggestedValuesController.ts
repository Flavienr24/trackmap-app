// Suggested Values controller - handles all suggested value-related HTTP requests
// Suggested values store reusable values for variables (static or contextual)
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

/**
 * Get all suggested values for a specific product
 * GET /api/products/:id/suggested-values
 */
export const getSuggestedValuesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    
    logger.debug('Fetching suggested values for product', { productId: product.id, requestId: req.ip });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all suggested values for the product with associated variables
    const suggestedValues = await prisma.suggestedValue.findMany({
      where: { productId: product.id },
      include: {
        variableValues: {
          include: {
            variable: true
          }
        }
      },
      orderBy: [
        { isContextual: 'asc' }, // Non-contextual first
        { value: 'asc' } // Then alphabetical by value
      ]
    });

    logger.info('Suggested values fetched successfully', { 
      productId: product.id,
      count: suggestedValues.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: suggestedValues,
      count: suggestedValues.length
    });
  } catch (error) {
    logger.error('Error fetching suggested values', { error, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new suggested value for a product
 * POST /api/products/:id/suggested-values
 */
export const createSuggestedValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    const { value, isContextual } = req.body;

    // Validate required fields
    if (!value) {
      const error: AppError = new Error('Value is required');
      error.statusCode = 400;
      return next(error);
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if suggested value already exists for this product
    const existingSuggestedValue = await prisma.suggestedValue.findFirst({
      where: { 
        productId: product.id,
        value 
      }
    });

    if (existingSuggestedValue) {
      const error: AppError = new Error('Suggested value already exists for this product');
      error.statusCode = 409;
      return next(error);
    }

    // Auto-detect contextual values (those starting with $)
    const isContextualValue = isContextual !== undefined ? isContextual : value.startsWith('$');

    logger.debug('Creating new suggested value', { 
      productId: product.id,
      value,
      isContextual: isContextualValue,
      requestId: req.ip 
    });

    // Create suggested value
    const suggestedValue = await prisma.suggestedValue.create({
      data: {
        productId: product.id,
        value,
        isContextual: isContextualValue
      },
      include: {
        variableValues: {
          include: {
            variable: true
          }
        }
      }
    });

    logger.info('Suggested value created successfully', { 
      suggestedValueId: suggestedValue.id,
      value: suggestedValue.value,
      productId: product.id,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: suggestedValue
    });
  } catch (error) {
    logger.error('Error creating suggested value', { error, body: req.body, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single suggested value by ID with all related data
 * GET /api/suggested-values/:id
 */
export const getSuggestedValueById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching suggested value by ID', { suggestedValueId: id, requestId: req.ip });

    const suggestedValue = await prisma.suggestedValue.findUnique({
      where: { id },
      include: {
        product: true,
        variableValues: {
          include: {
            variable: true
          }
        }
      }
    });

    if (!suggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Suggested value fetched successfully', { 
      suggestedValueId: id,
      value: suggestedValue.value,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: suggestedValue
    });
  } catch (error) {
    logger.error('Error fetching suggested value', { error, suggestedValueId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing suggested value
 * PUT /api/suggested-values/:id
 */
export const updateSuggestedValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { value, isContextual } = req.body;

    logger.debug('Updating suggested value', { 
      suggestedValueId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Check if suggested value exists
    const existingSuggestedValue = await prisma.suggestedValue.findUnique({
      where: { id }
    });

    if (!existingSuggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if new value conflicts with existing suggested values
    if (value && value !== existingSuggestedValue.value) {
      const conflictingSuggestedValue = await prisma.suggestedValue.findFirst({
        where: { 
          productId: existingSuggestedValue.productId,
          value,
          id: { not: id }
        }
      });

      if (conflictingSuggestedValue) {
        const error: AppError = new Error('Suggested value already exists for this product');
        error.statusCode = 409;
        return next(error);
      }
    }

    // Auto-detect contextual values if value is being updated
    let finalIsContextual = isContextual;
    if (value && isContextual === undefined) {
      finalIsContextual = value.startsWith('$');
    }

    // Update suggested value
    const suggestedValue = await prisma.suggestedValue.update({
      where: { id },
      data: {
        ...(value !== undefined && { value }),
        ...(finalIsContextual !== undefined && { isContextual: finalIsContextual })
      },
      include: {
        product: true,
        variableValues: {
          include: {
            variable: true
          }
        }
      }
    });

    logger.info('Suggested value updated successfully', { 
      suggestedValueId: id,
      value: suggestedValue.value,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: suggestedValue
    });
  } catch (error) {
    logger.error('Error updating suggested value', { error, suggestedValueId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a suggested value and all associations
 * DELETE /api/suggested-values/:id
 */
export const deleteSuggestedValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting suggested value', { suggestedValueId: id, requestId: req.ip });

    const existingSuggestedValue = await prisma.suggestedValue.findUnique({
      where: { id }
    });

    if (!existingSuggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete suggested value (cascade will handle related variableValues)
    await prisma.suggestedValue.delete({
      where: { id }
    });

    logger.info('Suggested value deleted successfully', { 
      suggestedValueId: id,
      value: existingSuggestedValue.value,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Suggested value deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting suggested value', { error, suggestedValueId: req.params.id, requestId: req.ip });
    next(error);
  }
};