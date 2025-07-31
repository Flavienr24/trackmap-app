import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productsController';

const router = Router();

// GET /api/products - Liste tous les produits
router.get('/', getAllProducts);

// POST /api/products - Crée un produit
router.post('/', createProduct);

// GET /api/products/:id - Détail d'un produit
router.get('/:id', getProductById);

// PUT /api/products/:id - Modifie un produit
router.put('/:id', updateProduct);

// DELETE /api/products/:id - Supprime un produit
router.delete('/:id', deleteProduct);

export default router;