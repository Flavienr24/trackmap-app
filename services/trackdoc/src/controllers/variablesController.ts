// Variables controller - handles all variable-related HTTP requests
// Variables define reusable variable schemas for events
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

// Valid variable types
const VALID_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'ARRAY', 'OBJECT'];

/**
 * Get all variables for a specific product
 * GET /api/products/:id/variables
 */
export const getVariablesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    
    logger.debug('Fetching variables for product', { productSlug, requestId: req.ip });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all variables for the product with associated suggested values
    const variables = await prisma.variable.findMany({
      where: { productId: product.id },
      include: {
        variableValues: {
          include: {
            suggestedValue: true
          }
        }
      },
      orderBy: {
        name: 'asc' // Alphabetical order by name
      }
    });

    logger.info('Variables fetched successfully', { 
      productId: product.id,
      count: variables.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: variables,
      count: variables.length
    });
  } catch (error) {
    logger.error('Error fetching variables', { error, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new variable for a product
 * POST /api/products/:id/variables
 */
export const createVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    const { name, type, description } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Variable name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!type) {
      const error: AppError = new Error('Variable type is required');
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

    // Check if variable name already exists for this product
    const existingVariable = await prisma.variable.findFirst({
      where: { 
        productId: product.id,
        name 
      }
    });

    if (existingVariable) {
      const error: AppError = new Error('Variable name already exists for this product');
      error.statusCode = 409;
      return next(error);
    }

    logger.debug('Creating new variable', { 
      productId: product.id,
      name,
      type: type.toUpperCase(),
      requestId: req.ip 
    });

    // Create variable
    const variable = await prisma.variable.create({
      data: {
        productId: product.id,
        name,
        type: type.toUpperCase(),
        description: description || null
      },
      include: {
        variableValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    logger.info('Variable created successfully', { 
      variableId: variable.id,
      variableName: variable.name,
      productId: product.id,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: variable
    });
  } catch (error) {
    logger.error('Error creating variable', { error, body: req.body, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single variable by ID with all related data
 * GET /api/variables/:id
 */
export const getVariableById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching variable by ID', { variableId: id, requestId: req.ip });

    const variable = await prisma.variable.findUnique({
      where: { id },
      include: {
        product: true,
        variableValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    if (!variable) {
      const error: AppError = new Error('Variable not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Variable fetched successfully', { 
      variableId: id,
      variableName: variable.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: variable
    });
  } catch (error) {
    logger.error('Error fetching variable', { error, variableId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing variable
 * PUT /api/variables/:id
 */
export const updateVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, type, description } = req.body;

    logger.debug('Updating variable', { 
      variableId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type.toUpperCase())) {
      const error: AppError = new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // Check if variable exists
    const existingVariable = await prisma.variable.findUnique({
      where: { id }
    });

    if (!existingVariable) {
      const error: AppError = new Error('Variable not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if new name conflicts with existing variables
    if (name && name !== existingVariable.name) {
      const conflictingVariable = await prisma.variable.findFirst({
        where: { 
          productId: existingVariable.productId,
          name,
          id: { not: id }
        }
      });

      if (conflictingVariable) {
        const error: AppError = new Error('Variable name already exists for this product');
        error.statusCode = 409;
        return next(error);
      }
    }

    // Update variable
    const variable = await prisma.variable.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type.toUpperCase() }),
        ...(description !== undefined && { description })
      },
      include: {
        product: true,
        variableValues: {
          include: {
            suggestedValue: true
          }
        }
      }
    });

    logger.info('Variable updated successfully', { 
      variableId: id,
      variableName: variable.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: variable
    });
  } catch (error) {
    logger.error('Error updating variable', { error, variableId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a variable and all associations
 * DELETE /api/variables/:id
 */
export const deleteVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting variable', { variableId: id, requestId: req.ip });

    const existingVariable = await prisma.variable.findUnique({
      where: { id }
    });

    if (!existingVariable) {
      const error: AppError = new Error('Variable not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete variable (cascade will handle related variableValues)
    await prisma.variable.delete({
      where: { id }
    });

    logger.info('Variable deleted successfully', { 
      variableId: id,
      variableName: existingVariable.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Variable deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting variable', { error, variableId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get suggested values for a specific variable
 * GET /api/variables/:id/suggested-values
 */
export const getSuggestedValuesByVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: variableId } = req.params;
    
    logger.debug('Fetching suggested values for variable', { variableId, requestId: req.ip });

    // Verify variable exists
    const variable = await prisma.variable.findUnique({
      where: { id: variableId }
    });

    if (!variable) {
      const error: AppError = new Error('Variable not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch associated suggested values
    const variableValues = await prisma.variableValue.findMany({
      where: { variableId },
      include: {
        suggestedValue: true
      }
    });

    const suggestedValues = variableValues.map((vv: any) => vv.suggestedValue);

    logger.info('Suggested values fetched successfully', { 
      variableId,
      count: suggestedValues.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: suggestedValues,
      count: suggestedValues.length
    });
  } catch (error) {
    logger.error('Error fetching suggested values', { error, variableId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Associate a suggested value with a variable
 * POST /api/variables/:id/suggested-values
 */
export const associateSuggestedValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: variableId } = req.params;
    const { suggestedValueId } = req.body;

    if (!suggestedValueId) {
      const error: AppError = new Error('Suggested value ID is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Associating suggested value with variable', { 
      variableId,
      suggestedValueId,
      requestId: req.ip 
    });

    // Verify variable exists
    const variable = await prisma.variable.findUnique({
      where: { id: variableId }
    });

    if (!variable) {
      const error: AppError = new Error('Variable not found');
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

    if (suggestedValue.productSlug !== variable.productSlug) {
      const error: AppError = new Error('Suggested value does not belong to the same product as the variable');
      error.statusCode = 400;
      return next(error);
    }

    // Check if association already exists
    const existingAssociation = await prisma.variableValue.findUnique({
      where: {
        variableId_suggestedValueId: {
          variableId,
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
    const association = await prisma.variableValue.create({
      data: {
        variableId,
        suggestedValueId
      },
      include: {
        variable: true,
        suggestedValue: true
      }
    });

    logger.info('Association created successfully', { 
      variableId,
      suggestedValueId,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: association
    });
  } catch (error) {
    logger.error('Error creating association', { error, variableId: req.params.id, requestId: req.ip });
    next(error);
  }
};