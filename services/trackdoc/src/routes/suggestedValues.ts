// Express router for suggested value-related endpoints
// Defines RESTful routes for suggested value CRUD operations
import { Router } from 'express';
import {
  getSuggestedValueById,
  updateSuggestedValue,
  deleteSuggestedValue,
  mergeSuggestedValues
} from '../controllers/suggestedValuesController';

const router = Router();

// GET /api/suggested-values/:id - Retrieve a specific suggested value by ID
router.get('/:id', getSuggestedValueById);

// PUT /api/suggested-values/:id - Update an existing suggested value
router.put('/:id', updateSuggestedValue);

// POST /api/suggested-values/:sourceId/merge/:targetId - Merge two suggested values
router.post('/:sourceId/merge/:targetId', mergeSuggestedValues);

// DELETE /api/suggested-values/:id - Delete a suggested value and all associations
router.delete('/:id', deleteSuggestedValue);

export default router;