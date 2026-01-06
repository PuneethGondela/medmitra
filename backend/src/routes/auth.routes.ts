import { Router } from 'express';
import { loginAdmin, createInitialAdmin, generate2FA, verify2FA } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginAdmin);
router.post('/setup-admin', createInitialAdmin);

// 2FA Routes (Protected)
router.post('/2fa/generate', authenticateToken, generate2FA);
router.post('/2fa/verify', authenticateToken, verify2FA);

export default router;
