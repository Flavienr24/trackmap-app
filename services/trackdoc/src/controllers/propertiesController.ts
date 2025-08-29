// Properties controller - handles all property-related HTTP requests
// Properties define reusable property schemas for events
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

// Valid property types
const VALID_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'ARRAY', 'OBJECT'];

/**
 * Get all properties for a specific product
 * GET /api/products/:id/properties
 */
export const getPropertiesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    
    logger.debug('Fetching properties for product', { productSlug, requestId: req.ip });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all properties for the product with associated suggested values
    const properties = await prisma.property.findMany({
      where: { productId: product.id },
      include: {
        propertyValues: {
          include: {
            suggestedValue: true
          }
        }
      },
      orderBy: {
        name: 'asc' // Alphabetical order by name
      }
    });

    logger.info('Properties fetched successfully', { 
      productId: product.id,
      count: properties.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: properties,
      count: properties.length
    });
  } catch (error) {
    logger.error('Error fetching properties', { error, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new property for a product
 * POST /api/products/:id/properties
 */
export const createProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    const { name, type, description } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Property name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!type) {
      const error: AppError = new Error('Property type is required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate type
    if (!VALID_TYPES.includes(type.toUpperCase())) {
      const error: AppError = new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
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

    // Check if property name already exists for this product
    const existingProperty = await prisma.property.findFirst({
      where: { 
        productId: product.id,
        name 
      }
    });

    if (existingProperty) {
      const error: AppError = new Error('Property name already exists for this product');
      error.statusCode = 409;
      return next(error);
    }

    logger.debug('Creating new property', { 
      productId: product.id,
      name,
      type: type.toUpperCase(),
      requestId: req.ip 
    });

    // Create property
    const property = await prisma.property.create({
      data: {
        productId: product.id,
        name,
        type: type.toUpperCase(),
        description: description || null
      },
      include: {
        propertyValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    logger.info('Property created successfully', { 
      propertyId: property.id,
      propertyName: property.name,
      productId: product.id,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: property
    });
  } catch (error) {
    logger.error('Error creating property', { error, body: req.body, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single property by ID with all related data
 * GET /api/properties/:id
 */
export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching property by ID', { propertyId: id, requestId: req.ip });

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        product: true,
        propertyValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    if (!property) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Property fetched successfully', { 
      propertyId: id,
      propertyName: property.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    logger.error('Error fetching property', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing property
 * PUT /api/properties/:id
 */
export const updateProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, type, description } = req.body;

    logger.debug('Updating property', { 
      propertyId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type.toUpperCase())) {
      const error: AppError = new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id }
    });

    if (!existingProperty) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if new name conflicts with existing properties
    if (name && name !== existingProperty.name) {
      const conflictingProperty = await prisma.property.findFirst({
        where: { 
          productId: existingProperty.productId,
          name,
          id: { not: id }
        }
      });

      if (conflictingProperty) {
        const error: AppError = new Error('Property name already exists for this product');
        error.statusCode = 409;
        return next(error);
      }
    }

    // Update property
    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type.toUpperCase() }),
        ...(description !== undefined && { description })
      },
      include: {
        product: true,
        propertyValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    logger.info('Property updated successfully', { 
      propertyId: id,
      propertyName: property.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    logger.error('Error updating property', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a property and all associations
 * DELETE /api/properties/:id
 */
export const deleteProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting property', { propertyId: id, requestId: req.ip });

    const existingProperty = await prisma.property.findUnique({
      where: { id }
    });

    if (!existingProperty) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete property (cascade will handle related propertyValues)
    await prisma.property.delete({
      where: { id }
    });

    logger.info('Property deleted successfully', { 
      propertyId: id,
      propertyName: existingProperty.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting property', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get suggested values for a specific property
 * GET /api/properties/:id/suggested-values
 */
export const getSuggestedValuesByProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: propertyId } = req.params;
    
    logger.debug('Fetching suggested values for property', { propertyId, requestId: req.ip });

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch associated suggested values
    const propertyValues = await prisma.propertyValue.findMany({
      where: { propertyId },
      include: {
        suggestedValue: true
      }
    });

    const suggestedValues = propertyValues.map((pv: any) => pv.suggestedValue);

    logger.info('Suggested values fetched successfully', { 
      propertyId,
      count: suggestedValues.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: suggestedValues,
      count: suggestedValues.length
    });
  } catch (error) {
    logger.error('Error fetching suggested values', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Associate a suggested value with a property
 * POST /api/properties/:id/suggested-values
 */
export const associateSuggestedValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: propertyId } = req.params;
    const { suggestedValueId } = req.body;

    if (!suggestedValueId) {
      const error: AppError = new Error('Suggested value ID is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Associating suggested value with property', { 
      propertyId,
      suggestedValueId,
      requestId: req.ip 
    });

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      const error: AppError = new Error('Property not found');
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

    if (suggestedValue.productId !== property.productId) {
      const error: AppError = new Error('Suggested value does not belong to the same product as the property');
      error.statusCode = 400;
      return next(error);
    }

    // Check if association already exists
    const existingAssociation = await prisma.propertyValue.findUnique({
      where: {
        propertyId_suggestedValueId: {
          propertyId,
          suggestedValueId
        }
      }
    });

    if (existingAssociation) {
      const error: AppError = new Error('Association already exists');
      error.statusCode = 409;
      return next(error);
    }

    // Create association
    const association = await prisma.propertyValue.create({
      data: {
        propertyId,
        suggestedValueId
      },
      include: {
        property: true,
        suggestedValue: true
      }
    });

    logger.info('Association created successfully', { 
      propertyId,
      suggestedValueId,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: association
    });
  } catch (error) {
    logger.error('Error creating association', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};