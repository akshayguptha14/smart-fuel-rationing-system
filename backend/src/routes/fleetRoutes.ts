import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  registerFleet,
  getFleetDashboard,
  getFleetVehicles,
  getFleetTransactions,
  getFleetReservations,
  createFleetJoinRequest,
  getFleetJoinRequests,
  cancelFleetJoinRequest
} from '../controllers/fleetController';

export const fleetRoutes = Router();

// Middleware to ensure user is FLEET_OPERATOR
const requireFleetOperator = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.role;
  if (role !== 'FLEET_OPERATOR') {
    res.status(403).json({ error: 'Forbidden. Requires FLEET_OPERATOR role.' });
    return;
  }
  next();
};

fleetRoutes.use(authenticate as any);
fleetRoutes.use(requireFleetOperator);

fleetRoutes.post('/register', registerFleet);
fleetRoutes.get('/dashboard', getFleetDashboard);
fleetRoutes.get('/vehicles', getFleetVehicles);
fleetRoutes.get('/transactions', getFleetTransactions);
fleetRoutes.get('/reservations', getFleetReservations);
fleetRoutes.post('/requests', createFleetJoinRequest);
fleetRoutes.get('/requests', getFleetJoinRequests);
fleetRoutes.post('/requests/:id/cancel', cancelFleetJoinRequest);
