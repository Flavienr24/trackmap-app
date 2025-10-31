// Products controller - handles all product-related HTTP requests
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import {
  ImportContextSchema,
  ImportContextQuerySchema
} from '../schemas/importContext.schema';

// Use centralized database instance
const prisma = db;

/**
 * Get all products with optimized payload
 * Uses query parameter ?full=true for complete data, otherwise returns light version
 * Light version: only counts, no nested relations (faster, smaller payload)
 * Full version: includes all related data (pages, events, properties, suggestedValues)
 * Returns products ordered by last update date
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fullData = req.query.full === 'true';

    logger.debug('Fetching all products', { fullData, requestId: req.ip });

    if (fullData) {
      // Full data with all relations (backward compatibility)
      const products = await prisma.product.findMany({
        include: {
          pages: {
            include: {
              events: true
            }
          },
          properties: true,
          suggestedValues: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      const enrichedProducts = products.map(product => {
        const totalEvents = product.pages.reduce((acc, page) => acc + page.events.length, 0);

        return {
          ...product,
          pages_count: product.pages.length,
          events_count: totalEvents,
          health_score: totalEvents > 0 ? Math.round((product.pages.length * 20) + (totalEvents * 10)) : 0
        };
      });

      logger.info('Products (full) fetched successfully', {
        count: enrichedProducts.length,
        requestId: req.ip
      });

      return res.json({
        success: true,
        data: enrichedProducts,
        count: enrichedProducts.length
      });
    }

    // Light version: only basic product data with counts (optimized)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            pages: true,
            properties: true,
            suggestedValues: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Calculate events count with single aggregated query (replacing N+1 pattern)
    const productIds = products.map(p => p.id);

    // Short-circuit if no products to avoid empty IN () clause
    let eventCountsMap = new Map<string, number>();

    if (productIds.length > 0) {
      // Use Prisma.join() to properly parameterize the IN clause
      const eventCountsRaw = await prisma.$queryRaw<{ productId: string; count: bigint }[]>`
        SELECT p.product_id as productId, COUNT(e.id) as count
        FROM events e
        JOIN pages p ON e.page_id = p.id
        WHERE p.product_id IN (${Prisma.join(productIds)})
        GROUP BY p.product_id
      `;

      // Map results to a dictionary for O(1) lookup (convert BigInt to Number)
      eventCountsMap = new Map(
        eventCountsRaw.map(row => [row.productId, Number(row.count)])
      );
    }

    // Enrich products with counts
    const productsWithCounts = products.map(product => {
      const eventsCount = eventCountsMap.get(product.id) || 0;

      return {
        id: product.id,
        name: product.name,
        url: product.url,
        description: product.description,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        pages_count: product._count.pages,
        properties_count: product._count.properties,
        suggested_values_count: product._count.suggestedValues,
        events_count: eventsCount,
        health_score: eventsCount > 0 ? Math.round((product._count.pages * 20) + (eventsCount * 10)) : 0
      };
    });

    logger.info('Products (light) fetched successfully', {
      count: productsWithCounts.length,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: productsWithCounts,
      count: productsWithCounts.length
    });
  } catch (error) {
    logger.error('Error fetching products', { error, requestId: req.ip });
    next(error);
  }
};

/**
 * Get a single product by ID or slug with all related data
 * Returns 404 if product doesn't exist
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lite = req.query.lite === 'true';
    
    logger.debug('Fetching product by ID', { productId: id, lite, requestId: req.ip });

    // Find product by ID only (no slug support)
    const whereClause = { id };

    if (lite) {
      // Lite payload: single query with counts (optimized)
      const liteProduct = await prisma.product.findUnique({
        where: whereClause,
        select: {
          id: true,
          name: true,
          url: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              pages: true,
              properties: true,
              suggestedValues: true
            }
          }
        }
      });

      // Handle product not found case
      if (!liteProduct) {
        const error: AppError = new Error('Product not found');
        error.statusCode = 404;
        return next(error);
      }

      // Get events count with single query
      const eventCountResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(e.id) as count
        FROM events e
        JOIN pages p ON e.page_id = p.id
        WHERE p.product_id = ${id}
      `;
      const eventsCount = eventCountResult.length > 0 ? Number(eventCountResult[0].count) : 0;

      const liteResponse = {
        id: liteProduct.id,
        name: liteProduct.name,
        url: liteProduct.url,
        description: liteProduct.description,
        createdAt: liteProduct.createdAt,
        updatedAt: liteProduct.updatedAt,
        pages_count: liteProduct._count.pages,
        properties_count: liteProduct._count.properties,
        suggested_values_count: liteProduct._count.suggestedValues,
        events_count: eventsCount,
        health_score: eventsCount > 0 ? Math.round((liteProduct._count.pages * 20) + (eventsCount * 10)) : 0
      };

      logger.info('Product (lite) fetched successfully', {
        productId: id,
        productName: liteResponse.name,
        eventsCount,
        requestId: req.ip
      });

      return res.json({
        success: true,
        data: liteResponse
      });
    }

    // Full payload: single query with all related entities
    const product = await prisma.product.findUnique({
      where: whereClause,
      include: {
        pages: {
          include: {
            events: true // Include events for comprehensive view
          }
        },
        properties: true,
        suggestedValues: true
      }
    });

    // Handle product not found case
    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    // Full payload with relations
    const totalEvents = product.pages.reduce((acc, page) => acc + page.events.length, 0);

    const enrichedProduct = {
      ...product,
      pages_count: product.pages.length,
      events_count: totalEvents,
      health_score: totalEvents > 0 ? Math.round((product.pages.length * 20) + (totalEvents * 10)) : 0
    };

    logger.info('Product fetched successfully', { 
      productId: id,
      productName: product.name,
      eventsCount: totalEvents,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: enrichedProduct
    });
  } catch (error) {
    logger.error('Error fetching product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Create a new product with validation
 * Simplified version without instances support
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, url } = req.body;

    // Validate required fields
    if (!name) {
      const error: AppError = new Error('Product name is required');
      error.statusCode = 400;
      return next(error);
    }
    if (!url) {
      const error: AppError = new Error('Product URL is required');
      error.statusCode = 400;
      return next(error);
    }

    // Check if product name already exists (case-insensitive)
    // SQLite doesn't support mode: 'insensitive', so we get all products and compare manually
    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true }
    });
    
    const existingProduct = allProducts.find(product => 
      product.name.toLowerCase() === name.toLowerCase()
    );

    if (existingProduct) {
      const error: AppError = new Error('Un produit avec ce nom existe déjà');
      error.statusCode = 409; // Conflict
      return next(error);
    }

    logger.debug('Creating new product', { 
      name, 
      description,
      url,
      requestId: req.ip 
    });

    // Create product with related data structure ready
    const product = await prisma.product.create({
      data: {
        name,
        url,
        description
      },
      include: {
        pages: true,
        properties: true,
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
    const { name, description, url } = req.body;

    logger.debug('Updating product', { 
      productId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    // Find product by ID only
    const whereClause = { id };

    const existingProduct = await prisma.product.findUnique({
      where: whereClause
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    let updateData: any = {};
    
    // Add name if provided
    if (name !== undefined) {
      // Check if another product already has this name (case-insensitive)
      // SQLite doesn't support mode: 'insensitive', so we get all products and compare manually
      const allProducts = await prisma.product.findMany({
        select: { id: true, name: true }
      });
      
      const conflictingProduct = allProducts.find(product => 
        product.name.toLowerCase() === name.toLowerCase() && product.id !== id
      );
      
      if (conflictingProduct) {
        const error: AppError = new Error('Un produit avec ce nom existe déjà');
        error.statusCode = 409; // Conflict
        return next(error);
      }
      
      updateData.name = name;
    }
    
    // Add description if provided
    if (description !== undefined) {
      updateData.description = description;
    }
    
    // Add URL if provided
    if (url !== undefined) {
      updateData.url = url;
    }

    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: updateData,
      include: {
        pages: true,
        properties: true,
        suggestedValues: true
      }
    });

    logger.info('Product updated successfully', { 
      productId: existingProduct.id,
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

    // Find product by ID only
    const whereClause = { id };

    const existingProduct = await prisma.product.findUnique({
      where: whereClause
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    await prisma.product.delete({
      where: { id: existingProduct.id }
    });

    logger.info('Product deleted successfully', {
      productId: existingProduct.id,
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

/**
 * Get consolidated import context for event parsing
 *
 * Aggregates event names, properties, and suggested values in one optimized call.
 * Supports pagination to handle large datasets efficiently.
 *
 * Query params:
 * - limit: Max items per category (default 100, max 500)
 * - offset: Number of items to skip (default 0)
 *
 * Returns paginated data with metadata about truncation.
 */
export const getImportContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;

    // Validate and parse query parameters
    const queryResult = ImportContextQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const error: AppError = new Error('Invalid query parameters');
      error.statusCode = 400;
      return next(error);
    }

    const query = queryResult.data || { limit: 100, offset: 0 };
    const limit = query.limit;
    const offset = query.offset;

    logger.debug('Fetching import context', {
      productId,
      limit,
      offset,
      requestId: req.ip
    });

    // Parallel queries with pagination limits
    const [events, properties, suggestedValues, counts] = await Promise.all([
      // Get unique event names (most recent first, limited)
      prisma.event.findMany({
        where: {
          page: { productId }
        },
        select: { name: true },
        distinct: ['name'],
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),

      // Get properties with their associated values (paginated)
      prisma.property.findMany({
        where: { productId },
        select: {
          id: true,
          name: true,
          propertyValues: {
            select: {
              suggestedValue: {
                select: { id: true, value: true }
              }
            }
          }
        },
        take: limit,
        skip: offset
      }),

      // Get all suggested values (paginated)
      prisma.suggestedValue.findMany({
        where: { productId },
        select: { id: true, value: true, isContextual: true },
        take: limit,
        skip: offset
      }),

      // Get total counts for pagination metadata
      Promise.all([
        // Count unique event names
        prisma.event.findMany({
          where: { page: { productId } },
          select: { name: true },
          distinct: ['name']
        }).then(r => r.length),
        // Count properties
        prisma.property.count({ where: { productId } }),
        // Count suggested values
        prisma.suggestedValue.count({ where: { productId } })
      ])
    ]);

    const [totalEvents, totalProperties, totalSuggestedValues] = counts;

    // Build response with pagination metadata
    const context = {
      eventNames: events.map(e => e.name),
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        associatedValues: p.propertyValues.map(pv => ({
          id: pv.suggestedValue.id,
          value: pv.suggestedValue.value
        }))
      })),
      suggestedValues: suggestedValues.map(sv => ({
        id: sv.id,
        value: sv.value,
        isContextual: sv.isContextual
      })),
      pagination: {
        limit,
        offset,
        totals: {
          events: totalEvents,
          properties: totalProperties,
          suggestedValues: totalSuggestedValues
        },
        hasMore: {
          events: offset + limit < totalEvents,
          properties: offset + limit < totalProperties,
          suggestedValues: offset + limit < totalSuggestedValues
        }
      }
    };

    // Validate response against schema
    const validatedContext = ImportContextSchema.parse(context);

    logger.info('Import context fetched successfully', {
      productId,
      eventNamesCount: events.length,
      propertiesCount: properties.length,
      suggestedValuesCount: suggestedValues.length,
      hasMore: context.pagination.hasMore,
      requestId: req.ip
    });

    res.json({
      success: true,
      data: validatedContext
    });
  } catch (error) {
    logger.error('Error fetching import context', {
      error,
      productId: req.params.id,
      requestId: req.ip
    });
    next(error);
  }
};
