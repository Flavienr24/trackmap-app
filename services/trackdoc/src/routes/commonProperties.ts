// Express router for common property-related endpoints
// Defines RESTful routes for common property CRUD operations
import { Router } from 'express';
import {
  getCommonPropertyById,
  updateCommonProperty,
  deleteCommonProperty
} from '../controllers/commonPropertiesController';

const router = Router();

// GET /api/common-properties/:id - Retrieve a specific common property by ID
router.get('/:id', getCommonPropertyById);

// PUT /api/common-properties/:id - Update an existing common property
router.put('/:id', updateCommonProperty);

// DELETE /api/common-properties/:id - Delete a common property
router.delete('/:id', deleteCommonProperty);

export default router;
