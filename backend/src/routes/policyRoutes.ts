import { Router } from 'express';
import { getPolicies, updatePolicy } from '../controllers/policyController';
import { authenticate } from '../middlewares/authMiddleware';

export const policyRoutes = Router();

policyRoutes.use(authenticate as any);
policyRoutes.get('/', getPolicies);
policyRoutes.put('/:vehicleType', updatePolicy);
