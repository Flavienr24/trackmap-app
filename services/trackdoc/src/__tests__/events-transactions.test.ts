// Transaction safety tests for Events API
// Verifies that database operations are atomic (all-or-nothing)
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import eventsRoutes from '../routes/events';
import pagesRoutes from '../routes/pages';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { prisma } from './setup';

// Load test environment
dotenv.config({ path: '.env.test' });

const createTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/events', eventsRoutes);
  app.use('/api/pages', pagesRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

describe('Events API - Transaction Safety', () => {
  let app: express.Application;
  let testProductId: string;
  let testPageId: string;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create test product and page
    const product = await prisma.product.create({
      data: {
        name: 'Test Product Transaction',
        url: 'https://test-transaction.com',
        description: 'Product for transaction tests'
      }
    });
    testProductId = product.id;

    const page = await prisma.page.create({
      data: {
        productId: testProductId,
        name: 'Test Page',
        slug: 'test-page',
        url: 'https://test-transaction.com/test'
      }
    });
    testPageId = page.id;
  });

  describe('createEvent - Transaction Safety', () => {
    it('should create event atomically with auto-created properties', async () => {
      const eventData = {
        name: 'test_event',
        properties: {
          test_prop: 'test_value'
        }
      };

      const response = await request(app)
        .post(`/api/pages/${testPageId}/events`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('test_event');

      // Verify property was auto-created
      const property = await prisma.property.findFirst({
        where: {
          productId: testProductId,
          name: 'test_prop'
        }
      });
      expect(property).toBeTruthy();

      // Verify suggested value was auto-created
      const suggestedValue = await prisma.suggestedValue.findFirst({
        where: {
          productId: testProductId,
          value: 'test_value'
        }
      });
      expect(suggestedValue).toBeTruthy();

      // Verify event was created
      const event = await prisma.event.findFirst({
        where: { name: 'test_event' }
      });
      expect(event).toBeTruthy();
    });

    it('should rollback all operations if event creation fails', async () => {
      // Create event with valid properties
      const eventData = {
        name: 'valid_event',
        properties: {
          rollback_test: 'value1'
        }
      };

      await request(app)
        .post(`/api/pages/${testPageId}/events`)
        .send(eventData)
        .expect(201);

      // Verify property was created
      const propertyBefore = await prisma.property.findFirst({
        where: { name: 'rollback_test' }
      });
      expect(propertyBefore).toBeTruthy();

      // Now try to create event with invalid data that will cause transaction to fail
      // (but auto-create should have already run)
      const invalidEventData = {
        name: '', // Empty name should fail validation
        properties: {
          should_not_create: 'this_value_should_not_exist'
        }
      };

      await request(app)
        .post(`/api/pages/${testPageId}/events`)
        .send(invalidEventData)
        .expect(400);

      // Verify that the property from failed transaction was NOT created
      const propertyAfter = await prisma.property.findFirst({
        where: { name: 'should_not_create' }
      });
      expect(propertyAfter).toBeNull();

      // Verify no orphaned suggested values
      const suggestedValue = await prisma.suggestedValue.findFirst({
        where: { value: 'this_value_should_not_exist' }
      });
      expect(suggestedValue).toBeNull();
    });
  });

  describe('updateEvent - Transaction Safety', () => {
    it('should update event atomically with history entry', async () => {
      // Create initial event
      const event = await prisma.event.create({
        data: {
          pageId: testPageId,
          name: 'test_event_update',
          status: 'TO_IMPLEMENT',
          properties: '{}'
        }
      });

      // Update event status
      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .send({ status: 'VALIDATED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VALIDATED');

      // Verify history entry was created
      const historyEntries = await prisma.eventHistory.findMany({
        where: { eventId: event.id }
      });
      expect(historyEntries.length).toBe(1);
      expect(historyEntries[0].field).toBe('status');
      expect(historyEntries[0].oldValue).toBe('TO_IMPLEMENT');
      expect(historyEntries[0].newValue).toBe('VALIDATED');
    });

    it('should rollback history if event update fails', async () => {
      // Create initial event
      const event = await prisma.event.create({
        data: {
          pageId: testPageId,
          name: 'test_rollback',
          status: 'TO_IMPLEMENT',
          properties: '{}'
        }
      });

      // Count history entries before
      const historyBefore = await prisma.eventHistory.findMany({
        where: { eventId: event.id }
      });
      expect(historyBefore.length).toBe(0);

      // Try to update with invalid status
      await request(app)
        .put(`/api/events/${event.id}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      // Verify NO history entry was created (transaction rolled back)
      const historyAfter = await prisma.eventHistory.findMany({
        where: { eventId: event.id }
      });
      expect(historyAfter.length).toBe(0);

      // Verify event status unchanged
      const eventAfter = await prisma.event.findUnique({
        where: { id: event.id }
      });
      expect(eventAfter?.status).toBe('TO_IMPLEMENT');
    });
  });

  describe('updateEventStatus - Transaction Safety', () => {
    it('should update status atomically with history', async () => {
      // Create initial event
      const event = await prisma.event.create({
        data: {
          pageId: testPageId,
          name: 'test_status_update',
          status: 'TO_TEST',
          properties: '{}'
        }
      });

      // Update status
      const response = await request(app)
        .put(`/api/events/${event.id}/status`)
        .send({ status: 'VALIDATED' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify both event and history were updated
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id }
      });
      expect(updatedEvent?.status).toBe('VALIDATED');

      const history = await prisma.eventHistory.findMany({
        where: { eventId: event.id }
      });
      expect(history.length).toBe(1);
      expect(history[0].newValue).toBe('VALIDATED');
    });
  });

  describe('duplicateEvent - Transaction Safety', () => {
    it('should duplicate event atomically with auto-created properties', async () => {
      // Create original event with properties
      const originalEvent = await prisma.event.create({
        data: {
          pageId: testPageId,
          name: 'original_event',
          status: 'VALIDATED',
          properties: JSON.stringify({ duplicate_prop: 'duplicate_value' })
        }
      });

      // Duplicate event
      const response = await request(app)
        .post(`/api/events/${originalEvent.id}/duplicate`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toContain('Copy');

      // Verify property was auto-created
      const property = await prisma.property.findFirst({
        where: {
          productId: testProductId,
          name: 'duplicate_prop'
        }
      });
      expect(property).toBeTruthy();

      // Verify both original and duplicate events exist
      const events = await prisma.event.findMany({
        where: { pageId: testPageId }
      });
      expect(events.length).toBe(2);
    });
  });

  describe('Concurrent Operations - Race Condition Safety', () => {
    it('should handle concurrent auto-create gracefully', async () => {
      // Simulate concurrent creation of events with same property
      const eventData1 = {
        name: 'concurrent_event_1',
        properties: { concurrent_prop: 'value1' }
      };

      const eventData2 = {
        name: 'concurrent_event_2',
        properties: { concurrent_prop: 'value2' }
      };

      // Execute concurrently
      const [response1, response2] = await Promise.all([
        request(app).post(`/api/pages/${testPageId}/events`).send(eventData1),
        request(app).post(`/api/pages/${testPageId}/events`).send(eventData2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Verify only ONE property was created (no duplicates)
      const properties = await prisma.property.findMany({
        where: {
          productId: testProductId,
          name: 'concurrent_prop'
        }
      });
      expect(properties.length).toBe(1);

      // Verify BOTH events were created
      const events = await prisma.event.findMany({
        where: {
          pageId: testPageId,
          name: { in: ['concurrent_event_1', 'concurrent_event_2'] }
        }
      });
      expect(events.length).toBe(2);
    });
  });

  describe('Data Integrity - No Orphaned Records', () => {
    it('should not leave orphaned properties if event creation fails', async () => {
      const propertiesCountBefore = await prisma.property.count();
      const suggestedValuesCountBefore = await prisma.suggestedValue.count();

      // Try to create event with missing required field
      await request(app)
        .post(`/api/pages/${testPageId}/events`)
        .send({
          name: '', // Invalid - empty name
          properties: { orphan_test: 'should_not_exist' }
        })
        .expect(400);

      // Verify NO new properties were created
      const propertiesCountAfter = await prisma.property.count();
      expect(propertiesCountAfter).toBe(propertiesCountBefore);

      // Verify NO new suggested values were created
      const suggestedValuesCountAfter = await prisma.suggestedValue.count();
      expect(suggestedValuesCountAfter).toBe(suggestedValuesCountBefore);
    });

    it('should not leave orphaned history if update fails', async () => {
      const event = await prisma.event.create({
        data: {
          pageId: testPageId,
          name: 'test_orphan_history',
          status: 'TO_IMPLEMENT',
          properties: '{}'
        }
      });

      const historyCountBefore = await prisma.eventHistory.count();

      // Try to update with invalid data
      await request(app)
        .put(`/api/events/${event.id}`)
        .send({ status: 'TOTALLY_INVALID' })
        .expect(400);

      // Verify NO new history entries were created
      const historyCountAfter = await prisma.eventHistory.count();
      expect(historyCountAfter).toBe(historyCountBefore);
    });
  });
});
