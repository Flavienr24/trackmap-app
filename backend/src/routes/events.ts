// Express router for event-related endpoints
// Defines RESTful routes for event CRUD operations
import { Router } from 'express';
import {
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent
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

export default router;