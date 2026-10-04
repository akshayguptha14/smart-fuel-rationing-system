import { Router } from 'express';
import { getTransactionMetrics } from '../controllers/transactionController';
import { authenticate } from '../middlewares/authMiddleware';

export const transactionRoutes = Router();

transactionRoutes.use(authenticate as any);
transactionRoutes.get('/metrics', getTransactionMetrics);
