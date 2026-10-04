import { Router } from 'express';
import { createReservation, listUserReservations, cancelReservation, verifyReservation, getReservationMetrics } from '../controllers/reservationController';
import { authenticate } from '../middlewares/authMiddleware';
import { strictLimiter } from '../middlewares/rateLimiter';

export const reservationRoutes = Router();

reservationRoutes.use(authenticate as any);
reservationRoutes.post('/', createReservation);
reservationRoutes.get('/', listUserReservations);
reservationRoutes.get('/metrics', getReservationMetrics);
reservationRoutes.post('/:id/cancel', cancelReservation);
reservationRoutes.post('/verify', strictLimiter, verifyReservation);
