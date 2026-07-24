import { Router } from 'express';
import authRoutes from './authRoutes.js';
import branchRoutes from './branchRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import productRoutes from './productRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
