import { Router } from 'express';
import { getAllDonors, createDonor } from '../controllers/donor.controller';
import { authenticateToken, requireAdminOrDoctor, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Both admin and doctors can view/search donors
router.get('/', requireAdminOrDoctor(), getAllDonors);

// Only admin can create donors
router.post('/', requireAdmin(), createDonor);

export default router;
