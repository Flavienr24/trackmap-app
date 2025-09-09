// Express router for comment-related endpoints
// Defines RESTful routes for comment CRUD operations
import { Router } from 'express';
import {
  getCommentById,
  updateComment,
  deleteComment
} from '../controllers/commentsController';

const router = Router();

// GET /api/comments/:id - Retrieve a specific comment by ID
router.get('/:id', getCommentById);

// PUT /api/comments/:id - Update an existing comment
router.put('/:id', updateComment);

// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', deleteComment);

export default router;