import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireAdmin(), getAuditLogs);

export default router;
