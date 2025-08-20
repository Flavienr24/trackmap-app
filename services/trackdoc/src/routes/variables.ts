// Express router for variable-related endpoints
// Defines RESTful routes for variable CRUD operations
import { Router } from 'express';
import {
  getVariableById,
  updateVariable,
  deleteVariable,
  getSuggestedValuesByVariable,
  associateSuggestedValue
} from '../controllers/variablesController';

const router = Router();

// GET /api/variables/:id - Retrieve a specific variable by ID with associations
router.get('/:id', getVariableById);

// PUT /api/variables/:id - Update an existing variable
router.put('/:id', updateVariable);

// DELETE /api/variables/:id - Delete a variable and all associations
router.delete('/:id', deleteVariable);

// GET /api/variables/:id/suggested-values - Get suggested values for a variable
router.get('/:id/suggested-values', getSuggestedValuesByVariable);

// POST /api/variables/:id/suggested-values - Associate suggested value with variable
router.post('/:id/suggested-values', associateSuggestedValue);

export default router;