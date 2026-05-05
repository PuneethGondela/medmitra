import { authLimiter } from '../middleware/rateLimiter';
import { Router } from 'express';
import { loginAdmin, generate2FA, verify2FA } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authLimiter, loginAdmin);

// 2FA Routes (Protected)
router.post('/2fa/generate', authenticateToken, generate2FA);
router.post('/2fa/verify', authenticateToken, verify2FA);

export default router;
