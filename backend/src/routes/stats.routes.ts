import { Router } from 'express';
import { getDashboardStats, getDoctorStats } from '../controllers/stats.controller';
import { authenticateToken, requireAdmin, requireDoctor } from '../middleware/auth.middleware';

const router = Router();

// Admin dashboard stats (full system view)
router.get('/', authenticateToken, requireAdmin(), getDashboardStats);

// Doctor-specific stats (their own data)
router.get('/doctor', authenticateToken, requireDoctor(), getDoctorStats);

export default router;
