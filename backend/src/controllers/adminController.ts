import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import fs from 'fs';
import path from 'path';

export const getAllReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      select: {
        id: true,
        userId: true,
        vehicleId: true,
        stationId: true,
        fuelType: true,
        amount: true,
        status: true,
        validUntil: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        vehicle: {
          select: {
            licensePlate: true,
            vehicleType: true,
            priority: {
              select: {
                status: true,
                serviceType: true,
                validUntil: true
              }
            }
          }
        },
        station: {
          select: {
            name: true,
            address: true,
            location: true
          }
        },
        transaction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            vehicles: true,
            reservations: true,
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        reservationId: true,
        reservation: {
          select: {
            id: true,
            fuelType: true,
            amount: true,
            status: true,
            createdAt: true,
            validUntil: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        station: {
          select: {
            name: true,
            address: true,
            location: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Also attach vehicle to transaction response by finding it via the reservation
    const transactionsWithVehicle = await Promise.all(transactions.map(async (t) => {
      let vehicle = null;
      if (t.reservationId) {
        const resVehicle = await prisma.reservation.findUnique({
          where: { id: t.reservationId },
          select: {
            vehicle: {
              select: {
                licensePlate: true,
                vehicleType: true
              }
            }
          }
        });
        if (resVehicle && resVehicle.vehicle) {
          vehicle = resVehicle.vehicle;
        }
      }
      return {
        ...t,
        vehicle
      };
    }));

    res.json(transactionsWithVehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Try a simple database query to check connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'Operational',
      api: 'Online',
      database: 'Connected',
      version: '1.0.0',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: 'Degraded',
      api: 'Online',
      database: 'Disconnected',
      version: '1.0.0',
      uptime: process.uptime()
    });
  }
};

export const listVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const verifications = await prisma.vehicleVerification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true } }
      }
    });

    const safeVerifications = verifications.map(v => ({
      id: v.id,
      status: v.status,
      aadhaarLast4: v.aadhaarLast4,
      rejectionReason: v.rejectionReason,
      reviewedBy: v.reviewedBy,
      reviewedAt: v.reviewedAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      user: v.user,
      vehicle: v.vehicle
    }));

    res.json(safeVerifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getVerificationDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id, type } = req.params as any;
    if (type !== 'aadhaar' && type !== 'rc') {
      res.status(400).json({ error: 'Invalid document type' });
      return;
    }

    const verification = await prisma.vehicleVerification.findUnique({ where: { id } });
    if (!verification) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    const fileName = type === 'aadhaar' ? verification.aadhaarDocPath : verification.rcDocPath;
    if (!fileName) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const filePath = path.join(__dirname, '../../secure_uploads', fileName);
    
    // Check path traversal just in case
    if (!filePath.startsWith(path.join(__dirname, '../../secure_uploads'))) {
       res.status(403).json({ error: 'Forbidden path' });
       return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const approveVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;

    const verification = await prisma.vehicleVerification.findUnique({ where: { id } });
    if (!verification) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    if (verification.status !== 'PENDING') {
      res.status(400).json({ error: 'Verification is not in PENDING state' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const verif = await tx.vehicleVerification.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: null
        },
        include: { vehicle: true }
      });

      // Check if active quota exists
      const existingQuota = await tx.fuelQuota.findFirst({
        where: { vehicleId: verif.vehicleId, isActive: true }
      });

      if (!existingQuota) {
        // Find policy for vehicle type
        const policy = await tx.quotaPolicy.findUnique({
          where: { vehicleType: verif.vehicle.vehicleType }
        });
        
        if (!policy) {
          throw new Error(`No QuotaPolicy found for vehicle type ${verif.vehicle.vehicleType}. Cannot approve.`);
        }

        const now = new Date();
        const endDate = new Date();
        if (policy.period === 'WEEKLY') {
          endDate.setDate(now.getDate() + 7);
        } else {
          endDate.setMonth(now.getMonth() + 1);
        }

        await tx.fuelQuota.create({
          data: {
            vehicleId: verif.vehicleId,
            totalQuota: policy.defaultQuota,
            remainingQuota: policy.defaultQuota,
            period: policy.period,
            startDate: now,
            endDate: endDate,
            isActive: true
          }
        });
      }

      return verif;
    });

    res.json({ success: true, status: updated.status });
  } catch (error: any) {
    console.error(error);
    if (error.message && error.message.includes('QuotaPolicy found')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const verification = await prisma.vehicleVerification.findUnique({ where: { id } });
    if (!verification) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    if (verification.status !== 'PENDING') {
      res.status(400).json({ error: 'Verification is not in PENDING state' });
      return;
    }

    const updated = await prisma.vehicleVerification.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason.trim()
      }
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const listPriorities = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const priorities = await prisma.vehiclePriority.findMany({
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const safePriorities = priorities.map(p => ({
      id: p.id,
      citizenName: p.user.name,
      citizenEmail: p.user.email,
      vehicleLicensePlate: p.vehicle.licensePlate,
      vehicleType: p.vehicle.vehicleType,
      serviceType: p.serviceType,
      status: p.status,
      submittedDate: p.createdAt,
      reviewedDate: p.reviewedAt,
      validUntil: p.validUntil,
      reviewer: p.reviewedBy,
      rejectionReason: p.rejectionReason
    }));

    res.json(safePriorities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPriorityDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const priority = await prisma.vehiclePriority.findUnique({ where: { id } });

    if (!priority) {
      res.status(404).json({ error: 'Priority request not found' });
      return;
    }

    const filePath = path.join(__dirname, '../../secure_uploads', priority.proofDocumentPath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Document file not found' });
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const approvePriority = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;
    const { validUntil } = req.body;

    const priority = await prisma.vehiclePriority.findUnique({ where: { id } });
    if (!priority) {
      res.status(404).json({ error: 'Priority request not found' });
      return;
    }

    if (priority.status !== 'PENDING') {
      res.status(400).json({ error: 'Priority is not in PENDING state' });
      return;
    }

    const updated = await prisma.vehiclePriority.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectPriority = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const priority = await prisma.vehiclePriority.findUnique({ where: { id } });
    if (!priority) {
      res.status(404).json({ error: 'Priority request not found' });
      return;
    }

    if (priority.status !== 'PENDING') {
      res.status(400).json({ error: 'Priority is not in PENDING state' });
      return;
    }

    const updated = await prisma.vehiclePriority.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason.trim()
      }
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllocationRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const requests = await prisma.fuelAllocationRequest.findMany({
      include: {
        station: { select: { name: true, location: true } },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const approveAllocationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.fuelAllocationRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Allocation request not found');
      if (request.status !== 'PENDING') throw new Error('Request is not in PENDING state');

      const station = await tx.station.findUnique({ where: { id: request.stationId } });
      if (!station || !station.isActive) throw new Error('Station not found or inactive');

      const inventory = await tx.fuelInventory.findUnique({
        where: { stationId_fuelType: { stationId: request.stationId, fuelType: request.fuelType } }
      });
      if (!inventory) throw new Error('Station has no inventory tracking for this fuel type');
      
      const requestedQtyNum = request.requestedQuantity.toNumber();
      const currentQtyNum = inventory.quantity.toNumber();
      const capacityNum = inventory.capacity.toNumber();
      
      if (currentQtyNum + requestedQtyNum > capacityNum) {
        throw new Error('Requested allocation exceeds station capacity');
      }

      await tx.fuelInventory.update({
        where: { id: inventory.id },
        data: { quantity: { increment: request.requestedQuantity } }
      });

      const currentInv = await tx.fuelInventory.findUnique({ where: { id: inventory.id } });
      if (currentInv) {
        await tx.inventoryLedger.create({
          data: {
            stationId: request.stationId,
            fuelType: request.fuelType,
            eventType: 'SUPPLIED',
            quantityChange: request.requestedQuantity,
            quantityAfter: currentInv.quantity,
            referenceId: request.id
          }
        });
      }

      const updateCount = await tx.fuelAllocationRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: null
        }
      });
      
      if (updateCount.count === 0) {
        throw new Error('Request is not in PENDING state or was concurrently modified');
      }

      const updatedRequest = await tx.fuelAllocationRequest.findUnique({ where: { id } });

      await tx.globalSupplyLog.create({
        data: {
          stationId: request.stationId,
          fuelType: request.fuelType,
          quantity: request.requestedQuantity,
          eventType: 'ALLOCATION',
          referenceId: request.id,
          performedBy: adminId,
          notes: 'Admin approved allocation request'
        }
      });

      return updatedRequest;
    });

    res.json({ success: true, status: result!.status });
  } catch (error: any) {
    console.error(error);
    if (error.message && (
        error.message.includes('not found') || 
        error.message.includes('PENDING state') || 
        error.message.includes('exceeds') ||
        error.message.includes('inventory tracking')
    )) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectAllocationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params as any;
    const adminId = (req as any).user.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.fuelAllocationRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Allocation request not found');
      if (request.status !== 'PENDING') throw new Error('Request is not in PENDING state');

      const updateCount = await tx.fuelAllocationRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason.trim()
        }
      });
      
      if (updateCount.count === 0) {
        throw new Error('Request is not in PENDING state or was concurrently modified');
      }
      
      const updatedRequest = await tx.fuelAllocationRequest.findUnique({ where: { id } });
      return updatedRequest;
    });

    res.json({ success: true, status: result!.status });
  } catch (error: any) {
    console.error(error);
    if (error.message && (error.message.includes('not found') || error.message.includes('PENDING state'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCommandCentreData = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const [
      totalStations,
      activeStations,
      totalUsers,
      totalVehicles,
      activeQuotas,
      reservations,
      transactions,
      inventory
    ] = await Promise.all([
      prisma.station.count(),
      prisma.station.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.vehicleVerification.count({ where: { status: 'APPROVED' } }),
      prisma.fuelQuota.count({ where: { isActive: true } }),
      prisma.reservation.findMany({ select: { status: true, amount: true } }),
      prisma.transaction.findMany({ select: { status: true, amount: true } }),
      prisma.fuelInventory.findMany({
        include: { station: { select: { name: true, location: true, address: true, isActive: true } } }
      })
    ]);

    let totalDispensed = 0;
    const transactionStats = { SUCCESS: 0, FAILED: 0, REFUNDED: 0, totalAmount: 0 } as any;
    transactions.forEach(t => {
      transactionStats[t.status]++;
      if (t.status === 'SUCCESS') {
        const amt = t.amount.toNumber();
        totalDispensed += amt;
        transactionStats.totalAmount += amt;
      }
    });

    const reservationStats = { PENDING: 0, COMPLETED: 0, CANCELLED: 0, EXPIRED: 0, totalAmount: 0 } as any;
    reservations.forEach(r => {
      reservationStats[r.status]++;
      reservationStats.totalAmount += r.amount.toNumber();
    });

    let totalInventoryQuantity = 0;
    let totalInventoryCapacity = 0;
    
    // Group inventory by fuel type and station
    const fuelSummary: Record<string, { quantity: number, capacity: number }> = {};
    const stationSupplies = inventory.map(inv => {
      const q = inv.quantity.toNumber();
      const c = inv.capacity.toNumber();
      totalInventoryQuantity += q;
      totalInventoryCapacity += c;

      if (!fuelSummary[inv.fuelType]) {
        fuelSummary[inv.fuelType] = { quantity: 0, capacity: 0 };
      }
      fuelSummary[inv.fuelType].quantity += q;
      fuelSummary[inv.fuelType].capacity += c;

      const percentageRemaining = c > 0 ? (q / c) * 100 : 0;
      let riskLevel = 'NORMAL';
      if (percentageRemaining < 20) riskLevel = 'CRITICAL';
      else if (percentageRemaining <= 50) riskLevel = 'LOW';

      return {
        id: inv.id,
        stationName: inv.station.name,
        location: inv.station.location,
        address: inv.station.address,
        isActive: inv.station.isActive,
        fuelType: inv.fuelType,
        quantity: q,
        capacity: c,
        percentageRemaining,
        percentageUsed: 100 - percentageRemaining,
        riskLevel
      };
    });

    // Sort risk board
    const riskOrder = { 'CRITICAL': 0, 'LOW': 1, 'NORMAL': 2 };
    stationSupplies.sort((a, b) => {
      if (riskOrder[a.riskLevel as keyof typeof riskOrder] !== riskOrder[b.riskLevel as keyof typeof riskOrder]) {
        return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder];
      }
      return a.percentageRemaining - b.percentageRemaining;
    });

    const overallStorageUtilization = totalInventoryCapacity > 0 ? (totalInventoryQuantity / totalInventoryCapacity) * 100 : 0;

    res.json({
      metrics: {
        totalStations,
        activeStations,
        totalUsers,
        totalVerifiedVehicles: totalVehicles,
        activeFuelQuotas: activeQuotas,
        currentReservations: reservations.length,
        successfulTransactions: transactionStats.SUCCESS,
        totalFuelDispensed: totalDispensed,
        totalCurrentInventory: totalInventoryQuantity,
        overallStorageUtilization
      },
      fuelSummary,
      stationSupplies,
      reservationStats,
      transactionStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getInventoryLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { stationId, fuelType, eventType, startDate, endDate, page = '1', limit = '50' } = req.query;

    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {};

    if (stationId) {
      where.stationId = stationId as string;
    }

    if (fuelType) {
      where.fuelType = fuelType as string;
    }

    if (eventType) {
      where.eventType = eventType as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate as string);
        if (!isNaN(parsedEndDate.getTime())) {
          parsedEndDate.setUTCHours(23, 59, 59, 999);
          where.createdAt.lte = parsedEndDate;
        } else {
          where.createdAt.lte = new Date(endDate as string);
        }
      }
    }

    const [total, events] = await prisma.$transaction([
      prisma.inventoryLedger.count({ where }),
      prisma.inventoryLedger.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        include: {
          station: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        }
      })
    ]);

    res.json({
      data: events,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getForecasting = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const windowDays = 7;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const stationsData = await prisma.station.findMany({
      include: { inventory: true }
    });

    const ledgerEvents = await prisma.inventoryLedger.findMany({
      where: {
        createdAt: { gte: windowStart }
      }
    });

    const summary = {
      forecastableStations: 0,
      insufficientDataStations: 0,
      criticalStations: 0,
      lowStations: 0,
      normalStations: 0
    };

    const stationsResult = [];

    for (const station of stationsData) {
      for (const inv of station.inventory) {
        const capacity = inv.capacity.toNumber();
        const currentInventory = inv.quantity.toNumber();
        const inventoryPercentage = capacity > 0 ? (currentInventory / capacity) * 100 : 0;

        let currentRisk = "NORMAL";
        if (inventoryPercentage < 20) {
          currentRisk = "CRITICAL";
        } else if (inventoryPercentage <= 50) {
          currentRisk = "LOW";
        }

        const relevantEvents = ledgerEvents.filter(e => e.stationId === station.id && e.fuelType === inv.fuelType);
        
        const activeDaysSet = new Set(relevantEvents.map(e => e.createdAt.toISOString().split('T')[0]));
        const activeDays = activeDaysSet.size;

        const reservedEvents = relevantEvents.filter(e => e.eventType === 'RESERVED');
        const dispensedEvents = relevantEvents.filter(e => e.eventType === 'DISPENSED');
        const refundedEvents = relevantEvents.filter(e => e.eventType === 'REFUNDED');

        const consumptionEvents = reservedEvents.length + dispensedEvents.length + refundedEvents.length;
        
        const reservedMovement = reservedEvents.reduce((acc, val) => acc + Math.abs(val.quantityChange.toNumber()), 0);
        const dispensedMovement = dispensedEvents.reduce((acc, val) => acc + Math.abs(val.quantityChange.toNumber()), 0);
        const refundedMovement = refundedEvents.reduce((acc, val) => acc + Math.abs(val.quantityChange.toNumber()), 0);

        const suppliedEvents = relevantEvents.filter(e => e.eventType === 'SUPPLIED');
        const manualEvents = relevantEvents.filter(e => e.eventType === 'MANUAL_ADJUSTMENT');
        const suppliedLiters = suppliedEvents.reduce((acc, val) => acc + Math.abs(val.quantityChange.toNumber()), 0);
        const manualAdjustmentLiters = manualEvents.reduce((acc, val) => acc + val.quantityChange.toNumber(), 0);

        const netConsumedLiters = reservedMovement + dispensedMovement - refundedMovement;
        
        let status = "INSUFFICIENT_DATA";
        let message = "Insufficient historical data";
        let netBurnRateLitersPerDay = null;
        let hoursUntilShortage = null;
        
        let projected24h = null, projected48h = null, projected72h = null;
        let forecastedRisk24h = null, forecastedRisk48h = null, forecastedRisk72h = null;
        let recommendation = "INSUFFICIENT DATA — CONTINUE COLLECTING INVENTORY HISTORY";

        if (activeDays >= 3 && consumptionEvents >= 5) {
          if (netConsumedLiters <= 0) {
            status = "NO_CONSUMPTION";
            message = "No recent consumption detected";
            recommendation = "NO RECENT CONSUMPTION — FORECAST UNAVAILABLE";
          } else {
            status = "READY";
            message = "Forecast available";
            netBurnRateLitersPerDay = netConsumedLiters / windowDays;
            
            if (currentInventory <= 0) {
              hoursUntilShortage = 0;
            } else {
              hoursUntilShortage = (currentInventory / netBurnRateLitersPerDay) * 24;
            }

            const getProjectedRisk = (proj: number) => {
              const pct = capacity > 0 ? (proj / capacity) * 100 : 0;
              if (pct < 20) return "CRITICAL";
              if (pct <= 50) return "LOW";
              return "NORMAL";
            };

            projected24h = Math.max(0, currentInventory - (netBurnRateLitersPerDay * 1));
            projected48h = Math.max(0, currentInventory - (netBurnRateLitersPerDay * 2));
            projected72h = Math.max(0, currentInventory - (netBurnRateLitersPerDay * 3));
            
            forecastedRisk24h = getProjectedRisk(projected24h);
            forecastedRisk48h = getProjectedRisk(projected48h);
            forecastedRisk72h = getProjectedRisk(projected72h);

            if (currentRisk === "CRITICAL") recommendation = "URGENT SUPPLY REQUIRED";
            else if (currentRisk === "LOW") recommendation = "PLAN REPLENISHMENT";
            else recommendation = "NO IMMEDIATE ACTION";
          }
        }

        if (status === "READY") summary.forecastableStations++;
        else summary.insufficientDataStations++;

        if (currentRisk === "CRITICAL") summary.criticalStations++;
        else if (currentRisk === "LOW") summary.lowStations++;
        else summary.normalStations++;

        stationsResult.push({
          stationId: station.id,
          stationName: station.name,
          location: station.location,
          fuelType: inv.fuelType,
          currentInventory,
          capacity,
          inventoryPercentage,
          currentRisk,
          eventCount: relevantEvents.length,
          activeDays,
          status,
          message,
          netConsumedLiters,
          netBurnRateLitersPerDay,
          hoursUntilShortage,
          projected24h,
          projected48h,
          projected72h,
          forecastedRisk24h,
          forecastedRisk48h,
          forecastedRisk72h,
          suppliedLiters,
          refundedLiters: refundedMovement,
          manualAdjustmentLiters,
          recommendation
        });
      }
    }

    res.json({
      generatedAt: now.toISOString(),
      analysisWindow: {
        start: windowStart.toISOString(),
        end: now.toISOString(),
        days: windowDays
      },
      summary,
      stations: stationsResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
