import { Router } from 'express';
import { getQuotaBalance, consumeQuota } from '../controllers/quotaController';
import { authenticate } from '../middlewares/authMiddleware';

export const quotaRoutes = Router();

quotaRoutes.use(authenticate as any);
quotaRoutes.get('/:vehicleId', getQuotaBalance);
quotaRoutes.post('/:vehicleId/consume', consumeQuota);
