import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', authorize('ADMIN', 'MANAGER'), asyncHandler(createProduct));
router.put('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(updateProduct));
router.delete('/:id', authorize('ADMIN'), asyncHandler(deleteProduct));

export default router;
