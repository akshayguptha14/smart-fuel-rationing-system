import { Router } from 'express';
import { registerStation, listStations, getStationDetails, updateInventory, createAllocationRequest, getStationAllocationRequests, updatePrice } from '../controllers/stationController';
import { authenticate } from '../middlewares/authMiddleware';

export const stationRoutes = Router();

stationRoutes.use(authenticate as any);
stationRoutes.post('/', registerStation);
stationRoutes.get('/', listStations);
stationRoutes.get('/:id', getStationDetails);
stationRoutes.post('/:id/inventory', updateInventory);
stationRoutes.put('/:id/inventory/:fuelType/price', updatePrice);

stationRoutes.post('/allocation-requests', createAllocationRequest);
stationRoutes.get('/allocation-requests', getStationAllocationRequests);
