import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { strictLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.post('/register', strictLimiter, register);
router.post('/login', strictLimiter, login);

export default router;
