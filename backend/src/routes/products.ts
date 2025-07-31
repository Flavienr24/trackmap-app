// Express router for product-related endpoints
// Defines RESTful routes for product CRUD operations
import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productsController';

const router = Router();

// GET /api/products - Retrieve all products with related data
router.get('/', getAllProducts);

// POST /api/products - Create a new product with validation
router.post('/', createProduct);

// GET /api/products/:id - Retrieve a specific product by ID
router.get('/:id', getProductById);

// PUT /api/products/:id - Update an existing product
router.put('/:id', updateProduct);

// DELETE /api/products/:id - Delete a product and all related data
router.delete('/:id', deleteProduct);

export default router;