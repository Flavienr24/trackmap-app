// Properties controller - handles all property-related HTTP requests
// Properties define reusable property schemas for events
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
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
 * Supports pagination via ?limit=, ?offset= and search via ?search=
 */
export const getPropertiesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    const { limit, offset, search, lite } = req.query;

    // Parse pagination parameters (default: no limit for backward compatibility)
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const isLite = lite === 'true';

    logger.debug('Fetching properties for product', {
      productSlug,
      limit: limitNum,
      offset: offsetNum,
      search,
      lite: isLite,
      requestId: req.ip
    });

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productSlug }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Build where clause for search
    const whereClause: any = { productId: product.id };
    if (search && typeof search === 'string') {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Get total count for hasMore calculation
    const totalCount = await prisma.property.count({ where: whereClause });

    // Fetch properties with optional limit, offset and search
    const query: Prisma.PropertyFindManyArgs = {
      where: whereClause,
      orderBy: {
        name: 'asc' // Alphabetical order by name
      },
      skip: offsetNum,
      take: limitNum
    };

    if (!isLite) {
      query.include = {
        propertyValues: {
          include: {
            suggestedValue: true
          }
        }
      };
    }

    const properties = await prisma.property.findMany(query);

    const hasMore = limitNum ? (offsetNum + properties.length) < totalCount : false;

    logger.info('Properties fetched successfully', {
      productId: product.id,
      count: properties.length,
      totalCount,
      limit: limitNum,
      offset: offsetNum,
      hasMore,
      search: search || 'none',
      lite: isLite,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: properties,
      count: properties.length,
      totalCount,
      hasMore
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
      where: { id: productSlug }
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

    // If property name is being changed, sync all events that use this property
    let affectedEventsCount = 0;
    if (name && name !== existingProperty.name) {
      logger.debug('Property name changed, syncing events', {
        oldName: existingProperty.name,
        newName: name,
        productId: existingProperty.productId
      });

      // Find all events for this product that contain this property
      const allEvents = await prisma.event.findMany({
        where: {
          page: {
            productId: existingProperty.productId
          }
        }
      });

      // Filter and update events that contain this property key
      for (const event of allEvents) {
        if (!event.properties) continue;

        let properties: Record<string, any>;

        // Parse properties JSON
        if (typeof event.properties === 'string') {
          try {
            properties = JSON.parse(event.properties);
          } catch (error) {
            logger.warn('Failed to parse event properties JSON during property rename', {
              eventId: event.id,
              properties: event.properties
            });
            continue;
          }
        } else if (typeof event.properties === 'object') {
          properties = { ...(event.properties as any) };
        } else {
          continue;
        }

        // Check if this event uses the old property name
        if (Object.prototype.hasOwnProperty.call(properties, existingProperty.name)) {
          const oldValue = properties[existingProperty.name];

          // Rename the property key while preserving order
          // Recreate the object with renamed key in original position
          const updatedProperties: Record<string, any> = {};
          for (const [key, value] of Object.entries(properties)) {
            if (key === existingProperty.name) {
              updatedProperties[name] = oldValue;
            } else {
              updatedProperties[key] = value;
            }
          }
          properties = updatedProperties;

          // Update event with renamed property
          await prisma.event.update({
            where: { id: event.id },
            data: { properties: JSON.stringify(properties) }
          });

          // Create history entry for this change
          await prisma.eventHistory.create({
            data: {
              eventId: event.id,
              field: 'properties',
              oldValue: JSON.stringify({ [existingProperty.name]: oldValue }),
              newValue: JSON.stringify({ [name]: oldValue }),
              author: 'system' // Property rename cascade
            }
          });

          affectedEventsCount++;

          logger.debug('Renamed property in event', {
            eventId: event.id,
            oldName: existingProperty.name,
            newName: name
          });
        }
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
      oldName: existingProperty.name,
      affectedEventsCount,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: property,
      affectedEventsCount
    });
  } catch (error) {
    logger.error('Error updating property', { error, propertyId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get impact analysis for deleting a property
 * GET /api/properties/:id/impact
 */
export const getPropertyImpact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Analyzing property deletion impact', { propertyId: id, requestId: req.ip });

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        product: true
      }
    });

    if (!property) {
      const error: AppError = new Error('Property not found');
      error.statusCode = 404;
      return next(error);
    }

    // Find all events that use this property in their properties JSON
    const allEvents = await prisma.event.findMany({
      where: {
        page: {
          productId: property.productId
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

    // Filter events that contain this property key
    const events = allEvents.filter(event => {
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
      
      return Object.prototype.hasOwnProperty.call(properties, property.name);
    });

    const impact = {
      affectedEventsCount: events.length,
      affectedEvents: events.map(event => ({
        id: event.id,
        name: event.name,
        page: event.page.name,
        pageSlug: event.page.slug,
        propertyValue: (event.properties as any)[property.name] // Show current value
      }))
    };

    logger.info('Property impact analysis completed', { 
      propertyId: id,
      propertyName: property.name,
      affectedEventsCount: events.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    logger.error('Error analyzing property impact', { error, propertyId: req.params.id, requestId: req.ip });
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

    // Find and clean up events that use this property
    const allEvents = await prisma.event.findMany({
      where: {
        page: {
          productId: existingProperty.productId
        }
      }
    });

    // Filter events that contain this property key
    const affectedEvents = allEvents.filter(event => {
      if (!event.properties) return false;

      let parsedProperties: unknown;

      if (typeof event.properties === 'string') {
        try {
          parsedProperties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON', { eventId: event.id, properties: event.properties });
          return false;
        }
      } else {
        parsedProperties = event.properties;
      }

      if (!parsedProperties || typeof parsedProperties !== 'object' || Array.isArray(parsedProperties)) {
        return false;
      }

      const properties = parsedProperties as Record<string, any>;

      return Object.prototype.hasOwnProperty.call(properties, existingProperty.name);
    });

    // Clean up properties field in affected events
    for (const event of affectedEvents) {
      let parsedProperties: unknown;

      if (typeof event.properties === 'string') {
        try {
          parsedProperties = JSON.parse(event.properties);
        } catch (error) {
          logger.warn('Failed to parse event properties JSON during cleanup', { eventId: event.id, properties: event.properties });
          continue; // Skip this event if we can't parse its properties
        }
      } else {
        parsedProperties = event.properties;
      }

      if (!parsedProperties || typeof parsedProperties !== 'object' || Array.isArray(parsedProperties)) {
        logger.warn('Skipping property cleanup for event with non-object properties', { eventId: event.id, properties: parsedProperties });
        continue;
      }

      const properties = { ...(parsedProperties as Record<string, any>) };

      // Remove the deleted property
      delete properties[existingProperty.name];

      await prisma.event.update({
        where: { id: event.id },
        data: { properties: JSON.stringify(properties) }
      });
      
      logger.debug('Cleaned up property from event', { eventId: event.id, propertyName: existingProperty.name });
    }

    // Delete property (cascade will handle related propertyValues)
    await prisma.property.delete({
      where: { id }
    });

    logger.info('Property deleted successfully', { 
      propertyId: id,
      propertyName: existingProperty.name,
      affectedEventsCount: affectedEvents.length,
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

/**
 * Sync properties from events - creates missing properties from event data
 * POST /api/products/:id/properties/sync
 */
export const syncPropertiesFromEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productSlug } = req.params;
    
    logger.debug('Syncing properties from events', { productSlug, requestId: req.ip });

    // Get product
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productSlug },
          { id: productSlug }
        ]
      }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Get all events for this product
    const events = await prisma.event.findMany({
      where: {
        page: {
          productId: product.id
        }
      },
      select: {
        id: true,
        name: true,
        properties: true
      }
    });

    let createdCount = 0;
    const createdProperties: string[] = [];

    // Process each event's properties
    for (const event of events) {
      if (!event.properties || typeof event.properties !== 'object') continue;
      
      const properties = event.properties as Record<string, any>;
      
      for (const [propertyName, propertyValue] of Object.entries(properties)) {
        // Check if property already exists
        const existingProperty = await prisma.property.findFirst({
          where: { 
            productId: product.id,
            name: propertyName 
          }
        });

        if (!existingProperty) {
          // Infer type from value
          let propertyType = 'STRING';
          if (typeof propertyValue === 'number') {
            propertyType = 'NUMBER';
          } else if (typeof propertyValue === 'boolean') {
            propertyType = 'BOOLEAN';
          } else if (Array.isArray(propertyValue)) {
            propertyType = 'ARRAY';
          } else if (typeof propertyValue === 'object' && propertyValue !== null) {
            propertyType = 'OBJECT';
          }

          // Create property
          await prisma.property.create({
            data: {
              productId: product.id,
              name: propertyName,
              type: propertyType,
              description: `Auto-créée via synchronisation depuis les événements`
            }
          });

          createdCount++;
          createdProperties.push(propertyName);
          
          logger.info('Synced property from events', { 
            productId: product.id,
            propertyName,
            propertyType,
            inferredFromValue: propertyValue
          });
        }
      }
    }

    logger.info('Properties sync completed', { 
      productSlug,
      createdCount,
      createdProperties,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: {
        createdCount,
        createdProperties,
        message: `${createdCount} propriétés créées depuis les événements`
      }
    });
  } catch (error) {
    logger.error('Error syncing properties from events', { error, productSlug: req.params.id, requestId: req.ip });
    next(error);
  }
};
