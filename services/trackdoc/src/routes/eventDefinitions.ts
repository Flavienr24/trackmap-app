// EventDefinitions routes
import express from 'express';
import * as eventDefinitionsController from '../controllers/eventDefinitionsController';

const router = express.Router();

/**
 * Global EventDefinitions routes
 * Base: /api/event-definitions
 */

// GET /api/event-definitions - Get all EventDefinitions (with optional filters)
router.get('/', eventDefinitionsController.getAllEventDefinitions);

// GET /api/event-definitions/:id - Get EventDefinition by ID
router.get('/:id', eventDefinitionsController.getEventDefinitionById);

// PUT /api/event-definitions/:id - Update EventDefinition
router.put('/:id', eventDefinitionsController.updateEventDefinition);

// DELETE /api/event-definitions/:id - Delete EventDefinition
router.delete('/:id', eventDefinitionsController.deleteEventDefinition);

// GET /api/event-definitions/:id/history - Get EventDefinition history
router.get('/:id/history', eventDefinitionsController.getEventDefinitionHistory);

export default router;
