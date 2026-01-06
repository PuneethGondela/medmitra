import { Router } from 'express';
import { getAllWorkers, getWorkerById, searchWorkers } from '../controllers/worker.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireAdmin(), getAllWorkers);
router.get('/search', requireAdmin(), searchWorkers);
router.get('/:id', requireAdmin(), getWorkerById);

export default router;
