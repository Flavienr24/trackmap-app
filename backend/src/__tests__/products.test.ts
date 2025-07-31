import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import productsRoutes from '../routes/products';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Load test environment
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

const createTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api/products', productsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
};

describe('Products API', () => {
  let app: express.Application;
  let testProductId: string;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/products', () => {
    it('should create a new product with hasInstances=false', async () => {
      const productData = {
        name: 'Test Product 1',
        description: 'Test description',
        hasInstances: false,
        currentEnvironment: 'dev'
      };

      const mockProduct = {
        id: 'test-id-1',
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
        instances: [],
        pages: [],
        variables: [],
        suggestedValues: []
      };

      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.description).toBe(productData.description);
      expect(response.body.data.hasInstances).toBe(false);
      expect(response.body.data.currentEnvironment).toBe('dev');
      
      testProductId = response.body.data.id;
    });

    it('should create a new product with hasInstances=true', async () => {
      const productData = {
        name: 'Test Product 2',
        description: 'Test description',
        hasInstances: true
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.hasInstances).toBe(true);
      expect(response.body.data.currentEnvironment).toBeNull();
    });

    it('should return 400 if name is missing', async () => {
      const productData = {
        description: 'Test description',
        hasInstances: false,
        currentEnvironment: 'dev'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product name is required');
    });

    it('should return 400 if hasInstances=false and currentEnvironment is missing', async () => {
      const productData = {
        name: 'Test Product',
        hasInstances: false
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('currentEnvironment is required when hasInstances is false');
    });

    it('should return 400 if hasInstances=true and currentEnvironment is provided', async () => {
      const productData = {
        name: 'Test Product',
        hasInstances: true,
        currentEnvironment: 'dev'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('currentEnvironment should not be set when hasInstances is true');
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.product.create({
        data: {
          name: 'Test Product for GET',
          description: 'Test description',
          hasInstances: false,
          currentEnvironment: 'dev'
        }
      });
    });

    it('should return all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('id');
    });
  });

  describe('GET /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product for GET by ID',
          description: 'Test description',
          hasInstances: false,
          currentEnvironment: 'dev'
        }
      });
      productId = product.id;
    });

    it('should return a specific product', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(productId);
      expect(response.body.data.name).toBe('Test Product for GET by ID');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product for PUT',
          description: 'Test description',
          hasInstances: false,
          currentEnvironment: 'dev'
        }
      });
      productId = product.id;
    });

    it('should update a product', async () => {
      const updateData = {
        name: 'Updated Test Product',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product for DELETE',
          description: 'Test description',
          hasInstances: false,
          currentEnvironment: 'dev'
        }
      });
      productId = product.id;
    });

    it('should delete a product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');

      // Verify product is deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';

      const response = await request(app)
        .delete(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });
});