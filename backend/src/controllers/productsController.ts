import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Fetching all products', { requestId: req.ip });
    
    const products = await prisma.product.findMany({
      include: {
        instances: true,
        pages: {
          include: {
            events: true
          }
        },
        variables: true,
        suggestedValues: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    logger.info('Products fetched successfully', { 
      count: products.length,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    logger.error('Error fetching products', { error, requestId: req.ip });
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching product by ID', { productId: id, requestId: req.ip });

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        instances: true,
        pages: {
          include: {
            events: true
          }
        },
        variables: true,
        suggestedValues: true
      }
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Product fetched successfully', { 
      productId: id,
      productName: product.name,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error fetching product', { error, productId: req.params.id, requestId: req.ip });
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, hasInstances, currentEnvironment } = req.body;

    if (!name) {
      const error: AppError = new Error('Product name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (hasInstances === false && !currentEnvironment) {
      const error: AppError = new Error('currentEnvironment is required when hasInstances is false');
      error.statusCode = 400;
      return next(error);
    }

    if (hasInstances === true && currentEnvironment) {
      const error: AppError = new Error('currentEnvironment should not be set when hasInstances is true');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Creating new product', { 
      name, 
      hasInstances, 
      currentEnvironment,
      requestId: req.ip 
    });

    const product = await prisma.product.create({
      data: {
        name,
        description,
        hasInstances: hasInstances ?? false,
        currentEnvironment: hasInstances === false ? currentEnvironment : null
      },
      include: {
        instances: true,
        pages: true,
        variables: true,
        suggestedValues: true
      }
    });

    logger.info('Product created successfully', { 
      productId: product.id,
      productName: product.name,
      requestId: req.ip 
    });

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
    const { name, description, hasInstances, currentEnvironment } = req.body;

    logger.debug('Updating product', { 
      productId: id, 
      updates: req.body,
      requestId: req.ip 
    });

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    if (hasInstances === false && !currentEnvironment) {
      const error: AppError = new Error('currentEnvironment is required when hasInstances is false');
      error.statusCode = 400;
      return next(error);
    }

    if (hasInstances === true && currentEnvironment) {
      const error: AppError = new Error('currentEnvironment should not be set when hasInstances is true');
      error.statusCode = 400;
      return next(error);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hasInstances !== undefined && { hasInstances }),
        ...(hasInstances === false && { currentEnvironment }),
        ...(hasInstances === true && { currentEnvironment: null })
      },
      include: {
        instances: true,
        pages: true,
        variables: true,
        suggestedValues: true
      }
    });

    logger.info('Product updated successfully', { 
      productId: id,
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

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      return next(error);
    }

    await prisma.product.delete({
      where: { id }
    });

    logger.info('Product deleted successfully', { 
      productId: id,
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