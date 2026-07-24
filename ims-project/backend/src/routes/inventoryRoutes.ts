import { Router } from 'express';
import { adjustStock, listInventory, listMovements } from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listInventory));
router.get('/movements', asyncHandler(listMovements));
router.post('/adjust', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), asyncHandler(adjustStock));

export default router;
