// Common Properties controller - handles default property-value pairs for events
// Common properties are automatically pre-filled when creating new events
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

/**
 * Get all common properties for a specific product
 * GET /api/products/:id/common-properties
 */
export const getCommonPropertiesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;

    logger.debug('Fetching common properties for product', { productId, requestId: req.ip });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all common properties with related data
    const commonProperties = await prisma.commonProperty.findMany({
      where: { productId: product.id },
      include: {
        property: true,
        suggestedValue: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info('Common properties fetched successfully', {
      productId: product.id,
      count: commonProperties.length,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: commonProperties,
      count: commonProperties.length
    });
  } catch (error) {
    logger.error('Error fetching common properties', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new common property for a product
 * POST /api/products/:id/common-properties
 */
export const createCommonProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { propertyId, suggestedValueId } = req.body;

    // Validate required fields
    if (!propertyId) {
      const error: AppError = new Error('Property ID is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!suggestedValueId) {
      const error: AppError = new Error('Suggested value ID is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Creating common property', {
      productId,
      propertyId,
      suggestedValueId,
      requestId: req.ip
    });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify property exists and belongs to this product
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    if (property.productId !== product.id) {
      const error: AppError = new Error('Property does not belong to this product');
      error.statusCode = 400;
      return next(error);
    }

    // Verify suggested value exists and belongs to this product
    const suggestedValue = await prisma.suggestedValue.findUnique({
      where: { id: suggestedValueId }
    });

    if (!suggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    if (suggestedValue.productId !== product.id) {
      const error: AppError = new Error('Suggested value does not belong to this product');
      error.statusCode = 400;
      return next(error);
    }

    // Check if common property already exists for this property
    const existingCommonProperty = await prisma.commonProperty.findFirst({
      where: {
        productId: product.id,
        propertyId
      }
    });

    if (existingCommonProperty) {
      const error: AppError = new Error('A common property already exists for this property. Please update it instead.');
      error.statusCode = 409;
      return next(error);
    }

    // Create common property
    const commonProperty = await prisma.commonProperty.create({
      data: {
        productId: product.id,
        propertyId,
        suggestedValueId
      },
      include: {
        property: true,
        suggestedValue: true
      }
    });

    logger.info('Common property created successfully', {
      commonPropertyId: commonProperty.id,
      propertyName: property.name,
      suggestedValue: suggestedValue.value,
      productId: product.id,
      requestId: req.ip
    });

    res.status(201).json({
      success: true,
      data: commonProperty
    });
  } catch (error) {
    logger.error('Error creating common property', { error, body: req.body, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single common property by ID
 * GET /api/common-properties/:id
 */
export const getCommonPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Fetching common property by ID', { commonPropertyId: id, requestId: req.ip });

    const commonProperty = await prisma.commonProperty.findUnique({
      where: { id },
      include: {
        product: true,
        property: true,
        suggestedValue: true
      }
    });

    if (!commonProperty) {
      const error: AppError = new Error('Common property not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Common property fetched successfully', {
      commonPropertyId: id,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: commonProperty
    });
  } catch (error) {
    logger.error('Error fetching common property', { error, commonPropertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing common property
 * PUT /api/common-properties/:id
 */
export const updateCommonProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { suggestedValueId } = req.body;

    if (!suggestedValueId) {
      const error: AppError = new Error('Suggested value ID is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Updating common property', {
      commonPropertyId: id,
      suggestedValueId,
      requestId: req.ip
    });

    // Check if common property exists
    const existingCommonProperty = await prisma.commonProperty.findUnique({
      where: { id }
    });

    if (!existingCommonProperty) {
      const error: AppError = new Error('Common property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify suggested value exists and belongs to same product
    const suggestedValue = await prisma.suggestedValue.findUnique({
      where: { id: suggestedValueId }
    });

    if (!suggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    if (suggestedValue.productId !== existingCommonProperty.productId) {
      const error: AppError = new Error('Suggested value does not belong to the same product');
      error.statusCode = 400;
      return next(error);
    }

    // Update common property
    const commonProperty = await prisma.commonProperty.update({
      where: { id },
      data: {
        suggestedValueId
      },
      include: {
        product: true,
        property: true,
        suggestedValue: true
      }
    });

    logger.info('Common property updated successfully', {
      commonPropertyId: id,
      newSuggestedValue: suggestedValue.value,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: commonProperty
    });
  } catch (error) {
    logger.error('Error updating common property', { error, commonPropertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a common property
 * DELETE /api/common-properties/:id
 */
export const deleteCommonProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting common property', { commonPropertyId: id, requestId: req.ip });

    const existingCommonProperty = await prisma.commonProperty.findUnique({
      where: { id },
      include: {
        property: true
      }
    });

    if (!existingCommonProperty) {
      const error: AppError = new Error('Common property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete common property
    await prisma.commonProperty.delete({
      where: { id }
    });

    logger.info('Common property deleted successfully', {
      commonPropertyId: id,
      propertyName: existingCommonProperty.property.name,
      requestId: req.ip
    });

    res.json({
      success: true,
      message: 'Common property deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting common property', { error, commonPropertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};
