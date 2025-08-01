// Express router for event-related endpoints
// Defines RESTful routes for event CRUD operations
import { Router } from 'express';
import {
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getEventComments,
  addEventComment,
  getEventHistory
} from '../controllers/eventsController';

const router = Router();

// GET /api/events/:id - Retrieve a specific event by ID with all related data
router.get('/:id', getEventById);

// PUT /api/events/:id - Update an existing event
router.put('/:id', updateEvent);

// PUT /api/events/:id/status - Update event status only (with history tracking)
router.put('/:id/status', updateEventStatus);

// DELETE /api/events/:id - Delete an event and all related data
router.delete('/:id', deleteEvent);

// GET /api/events/:id/comments - Get all comments for a specific event
router.get('/:id/comments', getEventComments);

// POST /api/events/:id/comments - Add a new comment to an event
router.post('/:id/comments', addEventComment);

// GET /api/events/:id/history - Get history entries for a specific event
router.get('/:id/history', getEventHistory);

export default router;