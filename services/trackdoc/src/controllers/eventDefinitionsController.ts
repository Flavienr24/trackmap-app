// EventDefinitions controller - handles all event definition-related HTTP requests
// EventDefinitions represent canonical definitions of events at the product level
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

const prisma = db;

// Valid userInteractionType values
const VALID_INTERACTION_TYPES = ['click', 'page_load', 'interaction', 'form_submit', 'scroll', 'other'];

/**
 * Get all EventDefinitions (global or filtered by product)
 * GET /api/event-definitions?productId=xxx&search=xxx
 */
export const getAllEventDefinitions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, search } = req.query;

    logger.debug('Fetching all event definitions', {
      filters: { productId, search },
      requestId: req.ip
    });

    // Build query filters
    const whereClause: any = {};

    if (productId && typeof productId === 'string') {
      whereClause.productId = productId;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch EventDefinitions with counts
    const definitions = await prisma.eventDefinition.findMany({
      where: whereClause,
      include: {
        product: true,
        _count: {
          select: { events: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.info('Event definitions fetched successfully', {
      count: definitions.length,
      filters: { productId, search },
      requestId: req.ip
    });

    res.json({
      success: true,
      data: definitions,
      count: definitions.length
    });
  } catch (error) {
    logger.error('Error fetching event definitions', {
      error,
      query: req.query,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Get EventDefinitions for a specific product
 * GET /api/products/:productId/event-definitions?include_stats=true
 */
export const getEventDefinitionsByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { include_stats } = req.query;

    logger.debug('Fetching event definitions for product', {
      productId,
      includeStats: include_stats === 'true',
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

    // Fetch EventDefinitions
    const definitions = await prisma.eventDefinition.findMany({
      where: { productId },
      include: {
        product: true,
        _count: {
          select: { events: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calculate stats if requested
    let stats = undefined;
    if (include_stats === 'true') {
      const totalEvents = await prisma.event.count({
        where: {
          eventDefinitionId: {
            in: definitions.map(d => d.id)
          }
        }
      });

      stats = {
        totalDefinitions: definitions.length,
        totalEvents,
        avgEventsPerDefinition: definitions.length > 0
          ? Math.round((totalEvents / definitions.length) * 100) / 100
          : 0
      };

      // Add cache header for stats (5 min TTL)
      res.setHeader('X-Cache-TTL', '300');

      logger.debug('Stats calculated', { stats, productId });
    }

    logger.info('Event definitions for product fetched successfully', {
      productId,
      count: definitions.length,
      includeStats: include_stats === 'true',
      requestId: req.ip
    });

    res.json({
      success: true,
      data: definitions,
      count: definitions.length,
      ...(stats && { stats })
    });
  } catch (error) {
    logger.error('Error fetching product event definitions', {
      error,
      productId: req.params.productId,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Get a single EventDefinition by ID with all related data
 * GET /api/event-definitions/:id
 */
export const getEventDefinitionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Fetching event definition by ID', { eventDefinitionId: id, requestId: req.ip });

    const definition = await prisma.eventDefinition.findUnique({
      where: { id },
      include: {
        product: true,
        events: {
          take: 100, // Limit to first 100 events
          include: {
            page: true
          },
          orderBy: {
            updatedAt: 'desc'
          }
        },
        history: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: { events: true }
        }
      }
    });

    if (!definition) {
      const error: AppError = new Error('EventDefinition not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Event definition fetched successfully', {
      eventDefinitionId: id,
      name: definition.name,
      eventsCount: definition._count.events,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: definition
    });
  } catch (error) {
    logger.error('Error fetching event definition', {
      error,
      eventDefinitionId: req.params.id,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Create a new EventDefinition for a product
 * POST /api/products/:productId/event-definitions
 */
export const createEventDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { name, description, userInteractionType } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      const error: AppError = new Error('EventDefinition name is required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate userInteractionType if provided
    if (userInteractionType && !VALID_INTERACTION_TYPES.includes(userInteractionType)) {
      const error: AppError = new Error(
        `Invalid userInteractionType. Must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`
      );
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

    logger.debug('Creating new event definition', {
      productId,
      name: name.trim(),
      requestId: req.ip
    });

    // Create EventDefinition with history in a transaction
    const definition = await prisma.$transaction(async (tx) => {
      // Create EventDefinition
      const def = await tx.eventDefinition.create({
        data: {
          productId,
          name: name.trim(),
          description: description?.trim() || '',
          userInteractionType: userInteractionType || 'interaction'
        },
        include: {
          product: true,
          _count: {
            select: { events: true }
          }
        }
      });

      // Create history entry
      await tx.eventDefinitionHistory.create({
        data: {
          eventDefinitionId: def.id,
          field: 'created',
          oldValue: null,
          newValue: `Manually created by user`,
          author: 'user' // TODO: Replace with authenticated user
        }
      });

      return def;
    });

    logger.info('Event definition created successfully', {
      eventDefinitionId: definition.id,
      name: definition.name,
      productId,
      requestId: req.ip
    });

    res.status(201).json({
      success: true,
      data: definition
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      const err: AppError = new Error(
        `EventDefinition with name "${req.body.name}" already exists for this product`
      );
      err.statusCode = 409;
      return next(err);
    }

    logger.error('Error creating event definition', {
      error,
      body: req.body,
      productId: req.params.productId,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Update an existing EventDefinition
 * PUT /api/event-definitions/:id
 */
export const updateEventDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, userInteractionType } = req.body;

    logger.debug('Updating event definition', {
      eventDefinitionId: id,
      updates: req.body,
      requestId: req.ip
    });

    // Validate userInteractionType if provided
    if (userInteractionType && !VALID_INTERACTION_TYPES.includes(userInteractionType)) {
      const error: AppError = new Error(
        `Invalid userInteractionType. Must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`
      );
      error.statusCode = 400;
      return next(error);
    }

    // Check if EventDefinition exists
    const existingDef = await prisma.eventDefinition.findUnique({
      where: { id },
      include: {
        product: true
      }
    });

    if (!existingDef) {
      const error: AppError = new Error('EventDefinition not found');
      error.statusCode = 404;
      return next(error);
    }

    // If name is changing, verify uniqueness for this product
    if (name && name.trim() !== existingDef.name) {
      const duplicate = await prisma.eventDefinition.findUnique({
        where: {
          productId_name: {
            productId: existingDef.productId,
            name: name.trim()
          }
        }
      });

      if (duplicate) {
        const error: AppError = new Error(
          `EventDefinition with name "${name}" already exists for this product`
        );
        error.statusCode = 409;
        return next(error);
      }
    }

    // Update EventDefinition with history and name propagation in a transaction
    const definition = await prisma.$transaction(async (tx) => {
      // Track changes for history
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

      if (name && name.trim() !== existingDef.name) {
        changes.push({
          field: 'name',
          oldValue: existingDef.name,
          newValue: name.trim()
        });
      }

      if (description !== undefined && description !== existingDef.description) {
        changes.push({
          field: 'description',
          oldValue: existingDef.description,
          newValue: description
        });
      }

      if (userInteractionType && userInteractionType !== existingDef.userInteractionType) {
        changes.push({
          field: 'userInteractionType',
          oldValue: existingDef.userInteractionType,
          newValue: userInteractionType
        });
      }

      // Update EventDefinition
      const updated = await tx.eventDefinition.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description }),
          ...(userInteractionType !== undefined && { userInteractionType })
        },
        include: {
          product: true,
          _count: {
            select: { events: true }
          }
        }
      });

      // If name changed, propagate to all Events (shadow column sync)
      if (name && name.trim() !== existingDef.name) {
        const updateResult = await tx.event.updateMany({
          where: { eventDefinitionId: id },
          data: { name: name.trim() }
        });

        logger.info('EventDefinition name propagated to Events', {
          eventDefinitionId: id,
          oldName: existingDef.name,
          newName: name.trim(),
          eventsUpdated: updateResult.count
        });
      }

      // Create history entries for all changes
      for (const change of changes) {
        await tx.eventDefinitionHistory.create({
          data: {
            eventDefinitionId: id,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            author: 'user' // TODO: Replace with authenticated user
          }
        });
      }

      return updated;
    });

    logger.info('Event definition updated successfully', {
      eventDefinitionId: id,
      name: definition.name,
      changesCount: Object.keys(req.body).length,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: definition
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      const err: AppError = new Error(
        `EventDefinition with name "${req.body.name}" already exists for this product`
      );
      err.statusCode = 409;
      return next(err);
    }

    logger.error('Error updating event definition', {
      error,
      eventDefinitionId: req.params.id,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Delete an EventDefinition
 * DELETE /api/event-definitions/:id
 */
export const deleteEventDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting event definition', { eventDefinitionId: id, requestId: req.ip });

    const existingDef = await prisma.eventDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    if (!existingDef) {
      const error: AppError = new Error('EventDefinition not found');
      error.statusCode = 404;
      return next(error);
    }

    // Prevent deletion if events are still linked
    if (existingDef._count.events > 0) {
      const error: AppError = new Error(
        `Cannot delete EventDefinition: ${existingDef._count.events} event(s) are still linked. Please unlink or delete them first.`
      );
      error.statusCode = 400;
      return next(error);
    }

    // Delete EventDefinition (cascade will handle history)
    await prisma.eventDefinition.delete({
      where: { id }
    });

    logger.info('Event definition deleted successfully', {
      eventDefinitionId: id,
      name: existingDef.name,
      requestId: req.ip
    });

    res.json({
      success: true,
      message: 'EventDefinition deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting event definition', {
      error,
      eventDefinitionId: req.params.id,
      requestId: req.ip
    });
    next(error);
  }
};

/**
 * Get history for a specific EventDefinition
 * GET /api/event-definitions/:id/history
 */
export const getEventDefinitionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Fetching history for event definition', { eventDefinitionId: id, requestId: req.ip });

    // Verify EventDefinition exists
    const definition = await prisma.eventDefinition.findUnique({
      where: { id }
    });

    if (!definition) {
      const error: AppError = new Error('EventDefinition not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all history entries
    const history = await prisma.eventDefinitionHistory.findMany({
      where: { eventDefinitionId: id },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    logger.info('Event definition history fetched successfully', {
      eventDefinitionId: id,
      count: history.length,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    logger.error('Error fetching event definition history', {
      error,
      eventDefinitionId: req.params.id,
      requestId: req.ip
    });
    next(error);
  }
};
