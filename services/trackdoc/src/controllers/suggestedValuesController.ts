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
    
    logger.debug('Fetching suggested values for product', { productSlug, requestId: req.ip });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all suggested values for the product with associated properties
    const suggestedValues = await prisma.suggestedValue.findMany({
      where: { productId: product.id },
      include: {
        propertyValues: {
          include: {
            property: true
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
      where: { id: productSlug }
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
        propertyValues: {
          include: {
            property: true
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
        propertyValues: {
          include: {
            property: true
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
        // Return conflict information for frontend to handle merge proposal
        return res.status(409).json({
          success: false,
          error: 'suggested_value_exists',
          message: 'Suggested value already exists for this product',
          conflictData: {
            existingValue: {
              id: conflictingSuggestedValue.id,
              value: conflictingSuggestedValue.value,
              is_contextual: conflictingSuggestedValue.isContextual
            },
            mergeProposal: {
              keepValue: conflictingSuggestedValue.value,
              removeValue: existingSuggestedValue.value
            }
          }
        });
      }
    }

    // Auto-detect contextual values if value is being updated
    let finalIsContextual = isContextual;
    if (value && isContextual === undefined) {
      finalIsContextual = value.startsWith('$');
    }

    // Update events that use this suggested value (if value is being changed)
    let affectedEventsCount = 0;
    if (value && value !== existingSuggestedValue.value) {
      // Find all events for this product
      const events = await prisma.event.findMany({
        where: {
          page: {
            productId: existingSuggestedValue.productId
          }
        }
      });

      // Update events that contain the old suggested value
      for (const event of events) {
        if (!event.properties) continue;

        let properties: Record<string, any>;

        // Handle both string (SQLite JSON storage) and object (parsed JSON) formats
        if (typeof event.properties === 'string') {
          try {
            properties = JSON.parse(event.properties);
          } catch (error) {
            logger.warn('Failed to parse event properties JSON during suggested value update', {
              eventId: event.id,
              properties: event.properties
            });
            continue; // Skip this event if we can't parse its properties
          }
        } else if (typeof event.properties === 'object') {
          properties = event.properties as Record<string, any>;
        } else {
          continue; // Skip if properties is neither string nor object
        }

        let wasModified = false;
        const updatedProperties = { ...properties };

        // Replace properties that match the old suggested value
        for (const [key, propValue] of Object.entries(properties)) {
          if (propValue === existingSuggestedValue.value) {
            updatedProperties[key] = value;
            wasModified = true;
          } else if (typeof propValue === 'string' && propValue.includes(existingSuggestedValue.value)) {
            // For contextual values or complex strings, replace the occurrence
            updatedProperties[key] = propValue.replace(
              new RegExp(existingSuggestedValue.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              value
            );
            wasModified = true;
          }
        }

        if (wasModified) {
          await prisma.event.update({
            where: { id: event.id },
            data: { properties: JSON.stringify(updatedProperties) }
          });
          affectedEventsCount++;
        }
      }

      logger.info('Updated events with new suggested value', {
        suggestedValueId: id,
        oldValue: existingSuggestedValue.value,
        newValue: value,
        affectedEventsCount,
        requestId: req.ip
      });
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
        propertyValues: {
          include: {
            property: true
          }
        }
      }
    });

    logger.info('Suggested value updated successfully', {
      suggestedValueId: id,
      value: suggestedValue.value,
      affectedEventsCount,
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
 * Merge two suggested values - keep target, remove source, transfer all associations
 * POST /api/suggested-values/:sourceId/merge/:targetId
 */
export const mergeSuggestedValues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceId, targetId } = req.params;

    logger.debug('Merging suggested values', { 
      sourceId, 
      targetId,
      requestId: req.ip 
    });

    // Get both suggested values
    const sourceSuggestedValue = await prisma.suggestedValue.findUnique({
      where: { id: sourceId },
      include: {
        propertyValues: {
          include: {
            property: true
          }
        }
      }
    });

    const targetSuggestedValue = await prisma.suggestedValue.findUnique({
      where: { id: targetId }
    });

    if (!sourceSuggestedValue || !targetSuggestedValue) {
      const error: AppError = new Error('One or both suggested values not found');
      error.statusCode = 404;
      return next(error);
    }

    // Ensure they belong to the same product
    if (sourceSuggestedValue.productId !== targetSuggestedValue.productId) {
      const error: AppError = new Error('Cannot merge suggested values from different products');
      error.statusCode = 400;
      return next(error);
    }

    // Update events that use the source value (replace with target value)
    let affectedEventsCount = 0;
    const events = await prisma.event.findMany({
      where: {
        page: {
          productId: sourceSuggestedValue.productId
        }
      }
    });

    // Update events that contain the source suggested value
    for (const event of events) {
      if (!event.properties) continue;

      let properties: Record<string, any>;

      // Handle both string (SQLite JSON storage) and object (parsed JSON) formats
      if (typeof event.properties === 'string') {
        try {
          properties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON during merge', {
            eventId: event.id,
            properties: event.properties
          });
          continue; // Skip this event if we can't parse its properties
        }
      } else if (typeof event.properties === 'object') {
        properties = event.properties as Record<string, any>;
      } else {
        continue; // Skip if properties is neither string nor object
      }

      let wasModified = false;
      const updatedProperties = { ...properties };

      // Replace properties that match the source suggested value with target value
      for (const [key, propValue] of Object.entries(properties)) {
        if (propValue === sourceSuggestedValue.value) {
          updatedProperties[key] = targetSuggestedValue.value;
          wasModified = true;
        } else if (typeof propValue === 'string' && propValue.includes(sourceSuggestedValue.value)) {
          // For contextual values or complex strings, replace the occurrence
          updatedProperties[key] = propValue.replace(
            new RegExp(sourceSuggestedValue.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            targetSuggestedValue.value
          );
          wasModified = true;
        }
      }

      if (wasModified) {
        await prisma.event.update({
          where: { id: event.id },
          data: { properties: JSON.stringify(updatedProperties) }
        });
        affectedEventsCount++;
      }
    }

    logger.info('Updated events during merge', {
      sourceId,
      targetId,
      sourceValue: sourceSuggestedValue.value,
      targetValue: targetSuggestedValue.value,
      affectedEventsCount,
      requestId: req.ip
    });

    // Transfer all associations from source to target
    const transferredAssociations = [];
    for (const propertyValue of sourceSuggestedValue.propertyValues) {
      // Check if target already has association with this property
      const existingAssociation = await prisma.propertyValue.findUnique({
        where: {
          propertyId_suggestedValueId: {
            propertyId: propertyValue.propertyId,
            suggestedValueId: targetId
          }
        }
      });

      if (!existingAssociation) {
        // Create new association with target
        await prisma.propertyValue.create({
          data: {
            propertyId: propertyValue.propertyId,
            suggestedValueId: targetId
          }
        });
        transferredAssociations.push(propertyValue.property.name);
      }
    }

    // Delete the source suggested value (cascade will handle its property values)
    await prisma.suggestedValue.delete({
      where: { id: sourceId }
    });

    logger.info('Suggested values merged successfully', {
      sourceId,
      targetId,
      sourceValue: sourceSuggestedValue.value,
      targetValue: targetSuggestedValue.value,
      transferredAssociations,
      affectedEventsCount,
      requestId: req.ip
    });

    res.json({
      success: true,
      message: 'Suggested values merged successfully',
      result: {
        keptValue: targetSuggestedValue.value,
        removedValue: sourceSuggestedValue.value,
        transferredAssociations
      }
    });
  } catch (error) {
    logger.error('Error merging suggested values', { error, sourceId: req.params.sourceId, targetId: req.params.targetId, requestId: req.ip });
    next(error);
  }
};

/**
 * Get impact analysis for deleting a suggested value
 * GET /api/suggested-values/:id/impact
 */
export const getSuggestedValueImpact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Analyzing suggested value deletion impact', { suggestedValueId: id, requestId: req.ip });

    const suggestedValue = await prisma.suggestedValue.findUnique({
      where: { id },
      include: {
        product: true
      }
    });

    if (!suggestedValue) {
      const error: AppError = new Error('Suggested value not found');
      error.statusCode = 404;
      return next(error);
    }

    // Find all events that use this suggested value in their properties JSON
    // We need to search for the value in any of the property values
    const events = await prisma.event.findMany({
      where: {
        page: {
          productId: suggestedValue.productId
        }
      },
      include: {
        page: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });

    // Filter events that contain this suggested value
    const affectedEvents = events.filter(event => {
      if (!event.properties) return false;
      
      let properties: Record<string, any>;
      
      // Handle both string (SQLite JSON storage) and object (parsed JSON) formats
      if (typeof event.properties === 'string') {
        try {
          properties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON', { eventId: event.id, properties: event.properties });
          return false;
        }
      } else if (typeof event.properties === 'object') {
        properties = event.properties as Record<string, any>;
      } else {
        return false;
      }
      
      return Object.values(properties).some(value => 
        value === suggestedValue.value || 
        (typeof value === 'string' && value.includes(suggestedValue.value))
      );
    });

    const affectedEventsWithDetails = affectedEvents.map(event => {
      let properties: Record<string, any>;
      
      // Parse properties if they're stored as string
      if (typeof event.properties === 'string') {
        try {
          properties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON in details mapping', { eventId: event.id, properties: event.properties });
          properties = {}; // Fallback to empty object
        }
      } else {
        properties = event.properties as Record<string, any>;
      }
      
      const matchingProperties = Object.entries(properties)
        .filter(([_, value]) => 
          value === suggestedValue.value || 
          (typeof value === 'string' && value.includes(suggestedValue.value))
        )
        .map(([key, value]) => ({ key, value }));

      return {
        id: event.id,
        name: event.name,
        page: event.page.name,
        pageSlug: event.page.slug,
        matchingProperties
      };
    });

    const impact = {
      affectedEventsCount: affectedEventsWithDetails.length,
      affectedEvents: affectedEventsWithDetails
    };

    logger.info('Suggested value impact analysis completed', { 
      suggestedValueId: id,
      suggestedValue: suggestedValue.value,
      affectedEventsCount: affectedEventsWithDetails.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    logger.error('Error analyzing suggested value impact', { error, suggestedValueId: req.params.id, requestId: req.ip });
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

    // Find and clean up events that use this suggested value
    const events = await prisma.event.findMany({
      where: {
        page: {
          productId: existingSuggestedValue.productId
        }
      }
    });

    // Filter events that contain this suggested value and clean them up
    let affectedEventsCount = 0;
    for (const event of events) {
      if (!event.properties) continue;
      
      let properties: Record<string, any>;
      
      // Handle both string (SQLite JSON storage) and object (parsed JSON) formats
      if (typeof event.properties === 'string') {
        try {
          properties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON during suggested value cleanup', { eventId: event.id, properties: event.properties });
          continue; // Skip this event if we can't parse its properties
        }
      } else if (typeof event.properties === 'object') {
        properties = event.properties as Record<string, any>;
      } else {
        continue; // Skip if properties is neither string nor object
      }
      
      let wasModified = false;
      const updatedProperties = { ...properties };
      
      // Remove or replace properties that match this suggested value
      for (const [key, value] of Object.entries(properties)) {
        if (value === existingSuggestedValue.value) {
          delete updatedProperties[key];
          wasModified = true;
        } else if (typeof value === 'string' && value.includes(existingSuggestedValue.value)) {
          // For contextual values or complex strings, remove them too for safety
          delete updatedProperties[key];
          wasModified = true;
        }
      }
      
      if (wasModified) {
        await prisma.event.update({
          where: { id: event.id },
          data: { properties: JSON.stringify(updatedProperties) }
        });
        affectedEventsCount++;
      }
    }

    // Delete suggested value (cascade will handle related propertyValues)
    await prisma.suggestedValue.delete({
      where: { id }
    });

    logger.info('Suggested value deleted successfully', { 
      suggestedValueId: id,
      value: existingSuggestedValue.value,
      affectedEventsCount,
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