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
import {
  getPagesByProduct,
  createPage,
  getPageBySlug
} from '../controllers/pagesController';
import {
  getVariablesByProduct,
  createVariable
} from '../controllers/variablesController';
import {
  getSuggestedValuesByProduct,
  createSuggestedValue
} from '../controllers/suggestedValuesController';

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


// Page routes nested under products
// GET /api/products/:id/pages - Get all pages for a product (with optional filters)
router.get('/:id/pages', getPagesByProduct);

// POST /api/products/:id/pages - Create a new page for a product
router.post('/:id/pages', createPage);

// GET /api/products/:productSlug/pages/:pageSlug - Get a specific page by slugs
router.get('/:productSlug/pages/:pageSlug', getPageBySlug);

// Variable routes nested under products
// GET /api/products/:id/variables - Get all variables for a product
router.get('/:id/variables', getVariablesByProduct);

// POST /api/products/:id/variables - Create a new variable for a product
router.post('/:id/variables', createVariable);

// Suggested Value routes nested under products
// GET /api/products/:id/suggested-values - Get all suggested values for a product
router.get('/:id/suggested-values', getSuggestedValuesByProduct);

// POST /api/products/:id/suggested-values - Create a new suggested value for a product
router.post('/:id/suggested-values', createSuggestedValue);

export default router;