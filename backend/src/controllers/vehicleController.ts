import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { VehicleType } from '@prisma/client';

import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const registerVehicleSchema = z.object({
  licensePlate: z.string().min(2).max(20),
  vehicleType: z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'THREE_WHEELER', 'BUS', 'OTHER'])
});

export const registerVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const parsed = registerVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed' });
      return;
    }
    const { licensePlate, vehicleType } = parsed.data;

    const existing = await prisma.vehicle.findUnique({ where: { licensePlate } });
    if (existing) {
      res.status(400).json({ error: 'Vehicle already registered' });
      return;
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate,
        vehicleType: vehicleType as VehicleType,
        userId
      }
    });

    res.status(201).json(vehicle);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const listVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    let vehicles;
    if (role === 'ADMIN') {
      vehicles = await prisma.vehicle.findMany({ 
        include: { 
          user: { select: { name: true, email: true } },
          fuelQuotas: { where: { isActive: true } }
        } 
      });
    } else {
      vehicles = await prisma.vehicle.findMany({ 
        where: { userId },
        include: {
          fuelQuotas: { where: { isActive: true } }
        }
      });
    }

    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getVehicleDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: { fuelQuotas: true } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const submitVehicleVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    if (role !== 'USER') {
      res.status(403).json({ error: 'Only USER can submit verification' });
      return;
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || !files.aadhaarDocument || !files.rcDocument) {
      res.status(400).json({ error: 'Both Aadhaar and RC documents are required' });
      return;
    }

    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string' || aadhaarNumber.length < 12) {
      res.status(400).json({ error: 'Invalid Aadhaar number' });
      return;
    }

    const aadhaarLast4 = aadhaarNumber.slice(-4);
    const aadhaarDocPath = files.aadhaarDocument[0].filename;
    const rcDocPath = files.rcDocument[0].filename;

    const existingVerification = await prisma.vehicleVerification.findUnique({ where: { vehicleId: id } });

    if (existingVerification) {
      if (existingVerification.status === 'PENDING' || existingVerification.status === 'APPROVED') {
        res.status(409).json({ error: `Vehicle verification is already ${existingVerification.status}` });
        return;
      }

      // Delete old files safely
      const uploadDir = path.join(__dirname, '../../secure_uploads');
      try {
        if (existingVerification.aadhaarDocPath) fs.unlinkSync(path.join(uploadDir, existingVerification.aadhaarDocPath));
        if (existingVerification.rcDocPath) fs.unlinkSync(path.join(uploadDir, existingVerification.rcDocPath));
      } catch (err) {
        console.error('Failed to delete old documents', err);
      }

      // Update existing record
      const updated = await prisma.vehicleVerification.update({
        where: { vehicleId: id },
        data: {
          aadhaarLast4,
          aadhaarDocPath,
          rcDocPath,
          status: 'PENDING',
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null
        }
      });

      res.json({
        id: updated.id,
        vehicleId: updated.vehicleId,
        status: updated.status,
        aadhaarLast4: updated.aadhaarLast4,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      });
      return;
    }

    const newVerification = await prisma.vehicleVerification.create({
      data: {
        vehicleId: id,
        userId,
        aadhaarLast4,
        aadhaarDocPath,
        rcDocPath,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      id: newVerification.id,
      vehicleId: newVerification.vehicleId,
      status: newVerification.status,
      aadhaarLast4: newVerification.aadhaarLast4,
      createdAt: newVerification.createdAt,
      updatedAt: newVerification.updatedAt
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getVehicleVerificationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const verification = await prisma.vehicleVerification.findUnique({ where: { vehicleId: id } });
    if (!verification) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    res.json({
      vehicleId: verification.vehicleId,
      status: verification.status,
      aadhaarLast4: verification.aadhaarLast4,
      rejectionReason: verification.rejectionReason,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      reviewedAt: verification.reviewedAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const submitPriority = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    if (role !== 'USER') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { serviceType } = req.body;
    if (!['AMBULANCE', 'FARMER', 'PUBLIC_TRANSPORT'].includes(serviceType)) {
      res.status(400).json({ error: 'Invalid service type' });
      return;
    }

    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id },
      include: { verification: true }
    });

    if (!vehicle || vehicle.userId !== userId) {
      res.status(403).json({ error: 'Forbidden or vehicle not found' });
      return;
    }

    if (!vehicle.verification || vehicle.verification.status !== 'APPROVED') {
      res.status(400).json({ error: 'Vehicle must be verified first' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Proof document is required' });
      return;
    }
    const proofDocumentPath = file.filename;

    const existing = await prisma.vehiclePriority.findUnique({ where: { vehicleId: id } });

    if (existing) {
      if (existing.status === 'PENDING' || existing.status === 'APPROVED') {
        res.status(400).json({ error: 'Priority application already exists' });
        return;
      }

      // Handle resubmission
      const uploadDir = path.join(__dirname, '../../secure_uploads');
      try {
        if (existing.proofDocumentPath) fs.unlinkSync(path.join(uploadDir, existing.proofDocumentPath));
      } catch (err) {
        console.error('Failed to delete old document', err);
      }

      const updated = await prisma.vehiclePriority.update({
        where: { vehicleId: id },
        data: {
          serviceType,
          proofDocumentPath,
          status: 'PENDING',
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          validUntil: null
        }
      });

      res.json({
        id: updated.id,
        vehicleId: updated.vehicleId,
        serviceType: updated.serviceType,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      });
      return;
    }

    const newPriority = await prisma.vehiclePriority.create({
      data: {
        vehicleId: id,
        userId,
        serviceType,
        proofDocumentPath,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      id: newPriority.id,
      vehicleId: newPriority.vehicleId,
      serviceType: newPriority.serviceType,
      status: newPriority.status,
      createdAt: newPriority.createdAt,
      updatedAt: newPriority.updatedAt
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPriorityStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const priority = await prisma.vehiclePriority.findUnique({ where: { vehicleId: id } });
    if (!priority) {
      res.status(404).json({ error: 'Priority application not found' });
      return;
    }

    res.json({
      id: priority.id,
      vehicleId: priority.vehicleId,
      serviceType: priority.serviceType,
      status: priority.status,
      rejectionReason: priority.rejectionReason,
      validUntil: priority.validUntil,
      createdAt: priority.createdAt,
      updatedAt: priority.updatedAt,
      reviewedAt: priority.reviewedAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCitizenFleetRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const requests = await prisma.fleetJoinRequest.findMany({
      where: { vehicle: { userId }, status: 'PENDING' },
      select: { id: true, fleet: { select: { name: true } }, vehicleId: true, vehicle: { select: { licensePlate: true } }, status: true, createdAt: true }
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const approveFleetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id, requestId } = req.params as { id: string, requestId: string };

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.userId !== userId) {
      res.status(404).json({ error: 'Vehicle not found or unauthorized' });
      return;
    }

    if (vehicle.fleetId) {
      res.status(400).json({ error: 'Vehicle is already assigned to a fleet' });
      return;
    }

    const request = await prisma.fleetJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.vehicleId !== id || request.status !== 'PENDING') {
      res.status(404).json({ error: 'Invalid or already processed request' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const currentReq = await tx.fleetJoinRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: 'APPROVED', reviewedAt: new Date() }
      });
      if (currentReq.count === 0) throw new Error('Request already processed');

      await tx.vehicle.update({
        where: { id },
        data: { fleetId: request.fleetId }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
};

export const rejectFleetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id, requestId } = req.params as { id: string, requestId: string };

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.userId !== userId) {
      res.status(404).json({ error: 'Vehicle not found or unauthorized' });
      return;
    }

    const updatedReq = await prisma.fleetJoinRequest.updateMany({
      where: { id: requestId, vehicleId: id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewedAt: new Date() }
    });

    if (updatedReq.count === 0) {
      res.status(400).json({ error: 'Request already processed or invalid' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
