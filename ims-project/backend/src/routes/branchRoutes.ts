import { Router } from 'express';
import {
  createBranch,
  deleteBranch,
  getBranch,
  listBranches,
  updateBranch,
} from '../controllers/branchController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listBranches));
router.get('/:id', asyncHandler(getBranch));
router.post('/', authorize('ADMIN'), asyncHandler(createBranch));
router.put('/:id', authorize('ADMIN'), asyncHandler(updateBranch));
router.delete('/:id', authorize('ADMIN'), asyncHandler(deleteBranch));

export default router;
