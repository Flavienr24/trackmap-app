// Express router for page-related endpoints
// Defines RESTful routes for page CRUD operations
import { Router } from 'express';
import {
  getPageById,
  updatePage,
  deletePage
} from '../controllers/pagesController';
import {
  getEventsByPage,
  createEvent
} from '../controllers/eventsController';

const router = Router();

// GET /api/pages/:id - Retrieve a specific page by ID with events
router.get('/:id', getPageById);

// PUT /api/pages/:id - Update an existing page
router.put('/:id', updatePage);

// DELETE /api/pages/:id - Delete a page and all related events
router.delete('/:id', deletePage);

// Event routes nested under pages
// GET /api/pages/:id/events - Get all events for a page (with optional filters)
router.get('/:id/events', getEventsByPage);

// POST /api/pages/:id/events - Create a new event for a page
router.post('/:id/events', createEvent);

export default router;