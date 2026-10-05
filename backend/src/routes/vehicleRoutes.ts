import { Router } from 'express';
import { registerVehicle, listVehicles, getVehicleDetails, submitVehicleVerification, getVehicleVerificationStatus, submitPriority, getPriorityStatus, getCitizenFleetRequests, approveFleetRequest, rejectFleetRequest } from '../controllers/vehicleController';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.use(authenticate as any);
router.post('/', registerVehicle);
router.get('/', listVehicles);
router.get('/:id', getVehicleDetails);
router.post('/:id/verify', upload.fields([
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'rcDocument', maxCount: 1 }
]), submitVehicleVerification);
router.get('/:id/verify', getVehicleVerificationStatus);
router.post('/:id/priority', upload.single('proofDocument'), submitPriority);
router.get('/:id/priority', getPriorityStatus);

router.get('/fleet-requests', getCitizenFleetRequests);
router.post('/:id/fleet-requests/:requestId/approve', approveFleetRequest);
router.post('/:id/fleet-requests/:requestId/reject', rejectFleetRequest);

export default router;
