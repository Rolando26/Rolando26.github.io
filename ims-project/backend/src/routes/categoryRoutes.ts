import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listCategories));
router.get('/:id', asyncHandler(getCategory));
router.post('/', authorize('ADMIN', 'MANAGER'), asyncHandler(createCategory));
router.put('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(updateCategory));
router.delete('/:id', authorize('ADMIN'), asyncHandler(deleteCategory));

export default router;
