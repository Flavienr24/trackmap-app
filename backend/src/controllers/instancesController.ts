// Instances controller - handles all instance-related HTTP requests
// Instances represent product variations (e.g., country-specific versions)
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

/**
 * Get all instances for a specific product
 * GET /api/products/:id/instances
 */
export const getInstancesByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    
    logger.debug('Fetching instances for product', { productId, requestId: req.ip });

    // Verify product exists first
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch all instances for the product
    const instances = await prisma.instance.findMany({
      where: { productId },
      include: {
        pages: {
          include: {
            events: true // Include events count for each page
          }
        }
      },
      orderBy: {
        updatedAt: 'desc' // Most recently updated first
      }
    });

    logger.info('Instances fetched successfully', { 
      productId,
      count: instances.length,
      requestId: req.ip 
    });

    // Return standardized API response
    res.json({
      success: true,
      data: instances,
      count: instances.length
    });
  } catch (error) {
    logger.error('Error fetching instances', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new instance for a product
 * POST /api/products/:id/instances
 */
export const createInstance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { name, code, currentEnvironment } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Instance name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!code) {
      const error: AppError = new Error('Instance code is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!currentEnvironment) {
      const error: AppError = new Error('Current environment is required');
      error.statusCode = 400;
      return next(error);
    }

    // Verify product exists and supports instances
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    if (!product.hasInstances) {
      const error: AppError = new Error('Product does not support instances');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Creating new instance', { 
      productId,
      name, 
      code,
      currentEnvironment,
      requestId: req.ip 
    });

    // Create instance with related data structure ready
    const instance = await prisma.instance.create({
      data: {
        productId,
        name,
        code,
        currentEnvironment
      },
      include: {
        product: true,
        pages: true
      }
    });

    logger.info('Instance created successfully', { 
      instanceId: instance.id,
      instanceName: instance.name,
      productId,
      requestId: req.ip 
    });

    // Return created instance with 201 status
    res.status(201).json({
      success: true,
      data: instance
    });
  } catch (error) {
    logger.error('Error creating instance', { error, body: req.body, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single instance by ID with all related data
 * GET /api/instances/:id
 */
export const getInstanceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching instance by ID', { instanceId: id, requestId: req.ip });

    // Find instance with all related entities
    const instance = await prisma.instance.findUnique({
      where: { id },
      include: {
        product: true,
        pages: {
          include: {
            events: true // Include events for comprehensive view
          }
        }
      }
    });

    // Handle instance not found case
    if (!instance) {
      const error: AppError = new Error('Instance not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Instance fetched successfully', { 
      instanceId: id,
      instanceName: instance.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    logger.error('Error fetching instance', { error, instanceId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update an existing instance
 * PUT /api/instances/:id
 */
export const updateInstance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, currentEnvironment } = req.body;

    logger.debug('Updating instance', { 
      instanceId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Check if instance exists
    const existingInstance = await prisma.instance.findUnique({
      where: { id }
    });

    if (!existingInstance) {
      const error: AppError = new Error('Instance not found');
      error.statusCode = 404;
      return next(error);
    }

    // Update instance with only provided fields
    const instance = await prisma.instance.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(currentEnvironment !== undefined && { currentEnvironment })
      },
      include: {
        product: true,
        pages: true
      }
    });

    logger.info('Instance updated successfully', { 
      instanceId: id,
      instanceName: instance.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    logger.error('Error updating instance', { error, instanceId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete an instance and all related data
 * DELETE /api/instances/:id
 */
export const deleteInstance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.debug('Deleting instance', { instanceId: id, requestId: req.ip });

    // Check if instance exists
    const existingInstance = await prisma.instance.findUnique({
      where: { id }
    });

    if (!existingInstance) {
      const error: AppError = new Error('Instance not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete instance (cascade will handle related data)
    await prisma.instance.delete({
      where: { id }
    });

    logger.info('Instance deleted successfully', { 
      instanceId: id,
      instanceName: existingInstance.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Instance deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting instance', { error, instanceId: req.params.id, requestId: req.ip });
    next(error);
  }
};