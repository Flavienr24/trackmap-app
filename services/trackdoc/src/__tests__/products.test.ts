// Integration tests for Products API
// Tests all product CRUD operations with simplified architecture
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import productsRoutes from '../routes/products';
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

  describe('POST /api/products', () => {
    it('should create a new product with name and description', async () => {
      const productData = {
        name: 'Test Product 1',
        description: 'Test description',
        url: 'https://test-product-1.com'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.description).toBe(productData.description);
      
      testProductId = response.body.data.id;

      // Verify in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(dbProduct).toBeTruthy();
      expect(dbProduct?.name).toBe(productData.name);
    });

    it('should create a new product with name and URL', async () => {
      const productData = {
        name: 'Test Product 2',
        url: 'https://example.com'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.url).toBe(productData.url);
      expect(response.body.data.description).toBeNull();

      // Verify in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: response.body.data.id }
      });
      expect(dbProduct).toBeTruthy();
      expect(dbProduct?.name).toBe(productData.name);
      expect(dbProduct?.url).toBe(productData.url);
    });

    it('should create a new product with only name and url', async () => {
      const productData = {
        name: 'Test Product 3',
        url: 'https://test-product-3.com'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.description).toBeNull();
      expect(response.body.data.url).toBe(productData.url);

      // Verify in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: response.body.data.id }
      });
      expect(dbProduct).toBeTruthy();
      expect(dbProduct?.name).toBe(productData.name);
    });

    it('should return 400 if name is missing', async () => {
      const productData = {
        description: 'Test description',
        url: 'https://test.com'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('name is required');
    });

    it('should return 400 if url is missing', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('URL is required');
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.product.create({
        data: {
          name: 'Test Product for GET',
          url: 'https://test.example.com',
          description: 'Test description'
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
          url: 'https://test-product-for-get-by-id.example.com',
          description: 'Test description'
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
          url: 'https://test-product-for-put.example.com',
          description: 'Test description'
        }
      });
      productId = product.id;
    });

    it('should update a product with name, description and URL', async () => {
      const updateData = {
        name: 'Updated Test Product',
        description: 'Updated description',
        url: 'https://updated-example.com'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.url).toBe(updateData.url);

      // Verify in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      expect(dbProduct?.name).toBe(updateData.name);
      expect(dbProduct?.url).toBe(updateData.url);
    });

    it('should update only the URL field', async () => {
      const updateData = {
        url: 'https://new-url.com'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Product for PUT'); // Original name unchanged
      expect(response.body.data.url).toBe(updateData.url);

      // Verify in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      expect(dbProduct?.name).toBe('Test Product for PUT');
      expect(dbProduct?.url).toBe(updateData.url);
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
          url: 'https://test-product-for-delete.example.com',
          description: 'Test description'
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

      // Verify product is deleted from database
      const dbProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      expect(dbProduct).toBeNull();
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