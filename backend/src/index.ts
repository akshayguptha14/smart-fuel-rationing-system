import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import { quotaRoutes } from './routes/quotaRoutes';
import { stationRoutes } from './routes/stationRoutes';
import { reservationRoutes } from './routes/reservationRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { policyRoutes } from './routes/policyRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { fleetRoutes } from './routes/fleetRoutes';
import { startQuotaScheduler } from './services/quotaScheduler';
import { globalLimiter } from './middlewares/rateLimiter';
import { getStationOwnerReservations } from './controllers/reservationController';
import { authenticate } from './middlewares/authMiddleware';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET.length < 32)) {
  console.error('CRITICAL: JWT_SECRET must be set to a secure 32+ char string in production.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(globalLimiter);
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fleet', fleetRoutes);

app.get('/api/station/reservations', authenticate as any, getStationOwnerReservations);

import { Request, Response } from 'express';

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  startQuotaScheduler();
});
