// Express router for instance-related endpoints
// Defines RESTful routes for instance CRUD operations
import { Router } from 'express';
import {
  getInstanceById,
  updateInstance,
  deleteInstance
} from '../controllers/instancesController';
import {
  getPagesByInstance
} from '../controllers/pagesController';

const router = Router();

// GET /api/instances/:id - Retrieve a specific instance by ID
router.get('/:id', getInstanceById);

// PUT /api/instances/:id - Update an existing instance
router.put('/:id', updateInstance);

// DELETE /api/instances/:id - Delete an instance and all related data
router.delete('/:id', deleteInstance);

// GET /api/instances/:id/pages - Get all pages for a specific instance
router.get('/:id/pages', getPagesByInstance);

export default router;