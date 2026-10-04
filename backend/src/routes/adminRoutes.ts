import { Router } from 'express';
import { getAllReservations, getAllUsers, getAllTransactions, getSystemHealth, listVerifications, getVerificationDocument, approveVerification, rejectVerification, listPriorities, getPriorityDocument, approvePriority, rejectPriority, getAllocationRequests, approveAllocationRequest, rejectAllocationRequest, getCommandCentreData } from '../controllers/adminController';
import { authenticate } from '../middlewares/authMiddleware';

export const adminRoutes = Router();

adminRoutes.use(authenticate as any);
adminRoutes.get('/reservations', getAllReservations);
adminRoutes.get('/users', getAllUsers);
adminRoutes.get('/transactions', getAllTransactions);
adminRoutes.get('/system/health', getSystemHealth);
adminRoutes.get('/command-centre', getCommandCentreData);
adminRoutes.get('/verifications', listVerifications);
adminRoutes.get('/verifications/:id/document/:type', getVerificationDocument);
adminRoutes.post('/verifications/:id/approve', approveVerification);
adminRoutes.post('/verifications/:id/reject', rejectVerification);

adminRoutes.get('/priorities', listPriorities);
adminRoutes.get('/priorities/:id/document', getPriorityDocument);
adminRoutes.post('/priorities/:id/approve', approvePriority);
adminRoutes.post('/priorities/:id/reject', rejectPriority);

adminRoutes.get('/allocation-requests', getAllocationRequests);
adminRoutes.post('/allocation-requests/:id/approve', approveAllocationRequest);
adminRoutes.post('/allocation-requests/:id/reject', rejectAllocationRequest);
