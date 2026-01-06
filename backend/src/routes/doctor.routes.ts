import { Router } from 'express';
import {
    createDoctor,
    getAllDoctors,
    getDoctorById,
    getCurrentDoctor,
    updateDoctor,
    updateCurrentDoctor,
    deleteDoctor,
    loginDoctor
} from '../controllers/doctor.controller';
import { authenticateToken, requireAdmin, requireDoctor, requireAdminOrDoctor } from '../middleware/auth.middleware';

const router = Router();

// Public Routes
router.post('/login', loginDoctor);

// Admin-only: Doctor management
router.post('/', authenticateToken, requireAdmin(), createDoctor);
router.get('/', authenticateToken, requireAdmin(), getAllDoctors);
router.get('/all', authenticateToken, requireAdmin(), getAllDoctors);
router.get('/admin/:id', authenticateToken, requireAdmin(), getDoctorById);
router.put('/admin/:id', authenticateToken, requireAdmin(), updateDoctor);
router.delete('/admin/:id', authenticateToken, requireAdmin(), deleteDoctor);

// Doctor self-access routes
router.get('/me', authenticateToken, requireDoctor(), getCurrentDoctor);
router.put('/me', authenticateToken, requireDoctor(), updateCurrentDoctor);

// Shared: Get doctor by ID (admin or doctor themselves)
router.get('/:id', authenticateToken, requireAdminOrDoctor(), getDoctorById);

export default router;
