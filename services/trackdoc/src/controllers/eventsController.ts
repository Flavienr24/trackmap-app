// Events controller - handles all event-related HTTP requests
// Events represent GA4 tracking events on pages
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import { safeJsonParse } from '../utils/helpers';

// Use centralized database instance
const prisma = db;

// Valid event status values
const VALID_STATUS = ['TO_IMPLEMENT', 'TO_TEST', 'ERROR', 'VALIDATED'];

/**
 * Auto-create properties in the library when they are used in events
 */
const autoCreateProperties = async (productId: string, properties: Record<string, any>) => {
  if (!properties || Object.keys(properties).length === 0) {
    return;
  }

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    // Check if property already exists
    const existingProperty = await prisma.property.findFirst({
      where: { 
        productId,
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
          productId,
          name: propertyName,
          type: propertyType,
          description: `Auto-créée depuis l'utilisation dans les événements`
        }
      });

      logger.info('Auto-created property', { 
        productId,
        propertyName,
        propertyType,
        inferredFromValue: propertyValue
      });
    }
  }
};

/**
 * Get all events for a specific page with optional filters
 * GET /api/pages/:id/events?status=error,to_test&modified_since=2025-07-01
 */
export const getEventsByPage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: pageId } = req.params;
    const { status, modified_since } = req.query;
    
    logger.debug('Fetching events for page', { 
      pageId, 
      filters: { status, modified_since },
      requestId: req.ip 
    });

    // Verify page exists
    const page = await prisma.page.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    // Build query filters
    const whereClause: any = { pageId };

    // Filter by status if provided
    if (status && typeof status === 'string') {
      const statusFilters = status.split(',').map((s: string) => s.trim().toUpperCase());
      // Validate status values
      const invalidStatuses = statusFilters.filter((s: string) => !VALID_STATUS.includes(s));
      if (invalidStatuses.length > 0) {
        const error: AppError = new Error(`Invalid status values: ${invalidStatuses.join(', ')}`);
        error.statusCode = 400;
        return next(error);
      }
      whereClause.status = { in: statusFilters };
    }

    // Filter by modification date if provided
    if (modified_since && typeof modified_since === 'string') {
      const modifiedDate = new Date(modified_since);
      if (isNaN(modifiedDate.getTime())) {
        const error: AppError = new Error('Invalid modified_since date format. Use YYYY-MM-DD');
        error.statusCode = 400;
        return next(error);
      }
      whereClause.updatedAt = { gte: modifiedDate };
    }

    // Fetch events with comments and history
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        page: {
          include: {
            product: true,
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Parse properties JSON for each event (temporary: read from variables column)
    const eventsWithParsedProperties = events.map((event: any) => ({
      ...event,
      properties: safeJsonParse(event.properties, {})
    }));

    logger.info('Events fetched successfully', { 
      pageId,
      count: events.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: eventsWithParsedProperties,
      count: events.length
    });
  } catch (error) {
    logger.error('Error fetching events', { error, pageId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new event for a page
 * POST /api/pages/:id/events
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: pageId } = req.params;
    const { name, status, testDate, properties } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Event name is required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate status if provided
    if (status && !VALID_STATUS.includes(status.toUpperCase())) {
      const error: AppError = new Error(`Invalid status. Must be one of: ${VALID_STATUS.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // Verify page exists
    const page = await prisma.page.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      const error: AppError = new Error('Page not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.debug('Creating new event', { 
      pageId,
      name,
      status: status || 'TO_IMPLEMENT',
      requestId: req.ip 
    });

    // Auto-create properties if they don't exist
    if (properties) {
      await autoCreateProperties(page.productId, properties);
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        pageId,
        name,
        status: status ? status.toUpperCase() : 'TO_IMPLEMENT',
        testDate: testDate ? new Date(testDate) : null,
        properties: properties ? JSON.stringify(properties) : '{}'
      },
      include: {
        page: {
          include: {
            product: true,
          }
        },
        comments: true,
        history: true
      }
    });

    // Parse variables for response
    const eventResponse = {
      ...event,
      properties: safeJsonParse(event.properties, {})
    };

    logger.info('Event created successfully', { 
      eventId: event.id,
      eventName: event.name,
      pageId,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: eventResponse
    });
  } catch (error) {
    logger.error('Error creating event', { error, body: req.body, pageId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single event by ID with all related data
 * GET /api/events/:id
 */
export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching event by ID', { eventId: id, requestId: req.ip });

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        page: {
          include: {
            product: true,
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!event) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Parse properties if stored as JSON string
    const eventData = {
      ...event,
      properties: safeJsonParse(event.properties, {})
    };

    logger.info('Event fetched successfully', { 
      eventId: id,
      eventName: event.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: eventData
    });
  } catch (error) {
    logger.error('Error fetching event', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing event
 * PUT /api/events/:id
 */
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, status, testDate, properties } = req.body;

    logger.debug('Updating event', { 
      eventId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Validate status if provided
    if (status && !VALID_STATUS.includes(status.toUpperCase())) {
      const error: AppError = new Error(`Invalid status. Must be one of: ${VALID_STATUS.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        page: {
          include: {
            product: true
          }
        }
      }
    });

    if (!existingEvent) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Create history entry for status changes
    if (status && status.toUpperCase() !== existingEvent.status) {
      await prisma.eventHistory.create({
        data: {
          eventId: id,
          field: 'status',
          oldValue: existingEvent.status,
          newValue: status.toUpperCase(),
          author: 'system' // Could be replaced with authenticated user
        }
      });
    }

    // Auto-create properties if they don't exist
    if (properties !== undefined && existingEvent.page) {
      await autoCreateProperties(existingEvent.page.productId, properties);
    }

    // Update event
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status: status.toUpperCase() }),
        ...(testDate !== undefined && { testDate: testDate ? new Date(testDate) : null }),
        ...(properties !== undefined && { properties: JSON.stringify(properties) })
      },
      include: {
        page: {
          include: {
            product: true,
          }
        },
        comments: true,
        history: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Parse variables for response
    const eventResponse = {
      ...event,
      properties: safeJsonParse(event.properties, {})
    };

    logger.info('Event updated successfully', { 
      eventId: id,
      eventName: event.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: eventResponse
    });
  } catch (error) {
    logger.error('Error updating event', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update event status only
 * PUT /api/events/:id/status
 */
export const updateEventStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      const error: AppError = new Error('Status is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!VALID_STATUS.includes(status.toUpperCase())) {
      const error: AppError = new Error(`Invalid status. Must be one of: ${VALID_STATUS.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Updating event status', { 
      eventId: id, 
      newStatus: status,
      requestId: req.ip 
    });

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Create history entry
    await prisma.eventHistory.create({
      data: {
        eventId: id,
        field: 'status',
        oldValue: existingEvent.status,
        newValue: status.toUpperCase(),
        author: 'system'
      }
    });

    // Update event status
    const event = await prisma.event.update({
      where: { id },
      data: { status: status.toUpperCase() },
      include: {
        page: true,
        comments: true,
        history: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    logger.info('Event status updated successfully', { 
      eventId: id,
      oldStatus: existingEvent.status,
      newStatus: status.toUpperCase(),
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error updating event status', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete an event and all related data
 * DELETE /api/events/:id
 */
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting event', { eventId: id, requestId: req.ip });

    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete event (cascade will handle related comments and history)
    await prisma.event.delete({
      where: { id }
    });

    logger.info('Event deleted successfully', { 
      eventId: id,
      eventName: existingEvent.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting event', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get all comments for a specific event
 * GET /api/events/:id/comments
 */
export const getEventComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: eventId } = req.params;
    
    logger.debug('Fetching comments for event', { eventId, requestId: req.ip });

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all comments for the event
    const comments = await prisma.comment.findMany({
      where: { eventId },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    logger.info('Event comments fetched successfully', { 
      eventId,
      count: comments.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    logger.error('Error fetching event comments', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Add a new comment to an event
 * POST /api/events/:id/comments
 */
export const addEventComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: eventId } = req.params;
    const { text, author } = req.body;

    // Validate required fields
    if (!text) {
      const error: AppError = new Error('Comment text is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!author) {
      const error: AppError = new Error('Comment author is required');
      error.statusCode = 400;
      return next(error);
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.debug('Adding comment to event', { 
      eventId,
      author,
      textLength: text.length,
      requestId: req.ip 
    });

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        eventId,
        content: text,
        author
      }
    });

    logger.info('Comment added successfully', { 
      commentId: comment.id,
      eventId,
      author,
      requestId: req.ip 
    });

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Error adding comment', { error, body: req.body, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get history for a specific event
 * GET /api/events/:id/history
 */
export const getEventHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: eventId } = req.params;
    
    logger.debug('Fetching history for event', { eventId, requestId: req.ip });

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      const error: AppError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all history entries for the event
    const history = await prisma.eventHistory.findMany({
      where: { eventId },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    logger.info('Event history fetched successfully', { 
      eventId,
      count: history.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    logger.error('Error fetching event history', { error, eventId: req.params.id, requestId: req.ip });
    next(error);
  }
};