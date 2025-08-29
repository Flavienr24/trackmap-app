// Express router for property-related endpoints
// Defines RESTful routes for property CRUD operations
import { Router } from 'express';
import {
  getPropertyById,
  updateProperty,
  deleteProperty,
  getSuggestedValuesByProperty,
  associateSuggestedValue
} from '../controllers/propertiesController';

const router = Router();

// GET /api/properties/:id - Retrieve a specific property by ID with associations
router.get('/:id', getPropertyById);

// PUT /api/properties/:id - Update an existing property
router.put('/:id', updateProperty);

// DELETE /api/properties/:id - Delete a property and all associations
router.delete('/:id', deleteProperty);

// GET /api/properties/:id/suggested-values - Get suggested values for a property
router.get('/:id/suggested-values', getSuggestedValuesByProperty);

// POST /api/properties/:id/suggested-values - Associate suggested value with property
router.post('/:id/suggested-values', associateSuggestedValue);

export default router;