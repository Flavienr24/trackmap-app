// Comments controller - handles all comment-related HTTP requests
// Comments are attached to events and allow user feedback/collaboration
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';

// Use centralized database instance
const prisma = db;

/**
 * Get a single comment by ID
 * GET /api/comments/:id
 */
export const getCommentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching comment by ID', { commentId: id, requestId: req.ip });

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            page: {
              select: {
                name: true,
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!comment) {
      const error: AppError = new Error('Comment not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info('Comment fetched successfully', { 
      commentId: id,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Error fetching comment', { error, commentId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Update a comment
 * PUT /api/comments/:id
 */
export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, author } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      const error: AppError = new Error('Comment content is required');
      error.statusCode = 400;
      return next(error);
    }

    logger.debug('Updating comment', { 
      commentId: id,
      author: author || 'Anonymous',
      contentLength: content.length,
      requestId: req.ip 
    });

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      const error: AppError = new Error('Comment not found');
      error.statusCode = 404;
      return next(error);
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content: content.trim(),
        author: author?.trim() || undefined
      }
    });

    logger.info('Comment updated successfully', { 
      commentId: id,
      requestId: req.ip 
    });

    res.json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    logger.error('Error updating comment', { error, commentId: req.params.id, requestId: req.ip });
    next(error);
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    logger.debug('Deleting comment', { commentId: id, requestId: req.ip });

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      const error: AppError = new Error('Comment not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id }
    });

    logger.info('Comment deleted successfully', { 
      commentId: id,
      requestId: req.ip 
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting comment', { error, commentId: req.params.id, requestId: req.ip });
    next(error);
  }
};