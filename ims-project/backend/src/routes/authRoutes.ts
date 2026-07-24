import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
// Registrasi user hanya boleh oleh ADMIN.
router.post('/register', authenticate, authorize('ADMIN'), asyncHandler(register));

export default router;
