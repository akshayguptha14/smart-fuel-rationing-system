import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Prisma, FuelType } from '@prisma/client';
import crypto from 'crypto';
import { z } from 'zod';

const createReservationSchema = z.object({
  vehicleId: z.string().uuid(),
  stationId: z.string().uuid(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']),
  amount: z.number().positive().max(1000, 'Cannot exceed 1000L').finite()
});

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const parsed = createReservationSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    const { vehicleId, stationId, fuelType, amount } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify vehicle belongs to user
      const vehicle = await tx.vehicle.findUnique({ 
        where: { id: vehicleId },
        include: { verification: true, priority: true }
      });
      if (!vehicle || vehicle.userId !== userId) {
        throw new Error('Vehicle not found or unauthorized');
      }

      // Check verification
      if (!vehicle.verification || vehicle.verification.status !== 'APPROVED') {
        const status = vehicle.verification?.status || 'UNVERIFIED';
        if (status === 'PENDING') throw new Error('Vehicle verification is still under manual review.');
        if (status === 'REJECTED') throw new Error('Vehicle verification was rejected. Please resubmit your documents.');
        throw new Error('Vehicle verification is required before booking fuel.');
      }

      // 2. Check quota
      const quota = await tx.fuelQuota.findFirst({
        where: { vehicleId, isActive: true }
      });
      if (!quota) throw new Error('No active quota found for this vehicle');
      if (quota.remainingQuota.toNumber() < amount) {
        throw new Error(`Insufficient quota. Only ${quota.remainingQuota.toNumber()} liters remaining.`);
      }

      // 3. Check station inventory
      const inventory = await tx.fuelInventory.findUnique({
        where: { stationId_fuelType: { stationId, fuelType } }
      });
      if (!inventory) throw new Error('Station does not offer this fuel type');
      if (inventory.quantity.toNumber() < amount) {
        throw new Error('Station has insufficient stock for this reservation');
      }

      // --- PHASE 4E: DYNAMIC FUEL QUOTA ENFORCEMENT ENGINE ---
      const capacity = inventory.capacity.toNumber();
      const supplyPercentage = capacity > 0 ? (inventory.quantity.toNumber() / capacity) * 100 : 0;

      // Dynamic Supply Policy
      // > 50% = NORMAL SUPPLY
      // 20% - 50% = REDUCED SUPPLY
      // < 20% = CRITICAL SUPPLY
      let supplyMultiplier = 1.0;
      if (supplyPercentage < 20) {
        supplyMultiplier = 0.2; // Critical Supply
      } else if (supplyPercentage <= 50) {
        supplyMultiplier = 0.5; // Reduced Supply
      }

      // Priority Queue & Essential-Service Entitlement
      const priority = vehicle.priority;
      // Priority vehicles NO LONGER bypass dynamic quota limits.
      // Priority represents priority servicing, but dynamic limits apply equally.

      const baseTotal = quota.totalQuota.toNumber();
      const baseRemaining = quota.remainingQuota.toNumber();
      const dynamicLimit = baseTotal * supplyMultiplier;
      const effectiveAllowance = Math.min(baseRemaining, dynamicLimit);

      if (amount > effectiveAllowance) {
        if (supplyMultiplier < 1.0) {
          throw new Error(`Current fuel supply conditions limit the maximum reservation amount. Allowed: ${effectiveAllowance} L.`);
        } else {
          throw new Error(`Insufficient remaining fuel quota. Allowed: ${effectiveAllowance} L.`);
        }
      }
      // --- END PHASE 4E ---

      // We do NOT deduct inventory immediately, but we might want to reserve it conceptually.
      // To strictly prevent overselling, we should decrement the stock now, and if cancelled, refund it.
      // Or we check at dispensing time. The prompt says "Prevent reservations exceeding either limit."
      // If we don't deduct, a concurrent reservation might succeed. Let's deduct inventory now.
      
      // Atomically decrement inventory with strict balance check
      const invUpdate = await tx.fuelInventory.updateMany({
        where: { id: inventory.id, quantity: { gte: amount } },
        data: { quantity: { decrement: amount } }
      });
      if (invUpdate.count === 0) {
        throw new Error('Concurrent inventory allocation failed. Insufficient stock.');
      }

      // Atomically decrement quota with strict balance check
      const quotaUpdate = await tx.fuelQuota.updateMany({
        where: { id: quota.id, remainingQuota: { gte: amount } },
        data: { remainingQuota: { decrement: amount } }
      });
      if (quotaUpdate.count === 0) {
        // Rollback inventory since we already decremented it
        await tx.fuelInventory.update({
           where: { id: inventory.id },
           data: { quantity: { increment: amount } }
        });
        throw new Error('Concurrent quota allocation failed. Insufficient quota.');
      }

      const qrToken = crypto.randomBytes(32).toString('hex');
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 2); // 2 hours expiry

      const reservation = await tx.reservation.create({
        data: {
          userId,
          vehicleId,
          stationId,
          fuelType: fuelType as FuelType,
          amount: new Prisma.Decimal(amount),
          qrToken,
          validUntil,
          status: 'PENDING'
        }
      });

      return reservation;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
};

export const listUserReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: { 
        station: true, 
        vehicle: {
          include: {
            priority: {
              select: {
                status: true,
                serviceType: true,
                validUntil: true
              }
            }
          }
        }, 
        transaction: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params as any;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new Error('Reservation not found');
      if (reservation.userId !== userId) throw new Error('Unauthorized');
      if (reservation.status !== 'PENDING') throw new Error('Only PENDING reservations can be cancelled');

      // Refund inventory and quota
      const quota = await tx.fuelQuota.findFirst({
        where: { vehicleId: reservation.vehicleId as string, isActive: true }
      });
      if (quota) {
        await tx.fuelQuota.update({
          where: { id: quota.id },
          data: { remainingQuota: { increment: reservation.amount } }
        });
      }

      const inventory = await tx.fuelInventory.findUnique({
        where: { stationId_fuelType: { stationId: reservation.stationId, fuelType: reservation.fuelType } }
      });
      if (inventory) {
        await tx.fuelInventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: reservation.amount } }
        });
      }

      const updateStatus = await tx.reservation.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });
      if (updateStatus.count === 0) {
        throw new Error('Reservation could not be cancelled. It may have already been processed.');
      }
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Server error' });
  }
};

const verifySchema = z.object({
  qrToken: z.string().length(64),
  stationId: z.string().uuid(),
  dispensedAmount: z.number().positive().max(1000).finite().optional()
});

// Verify and complete reservation (STATION_OWNER only)
export const verifyReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = (req as any).user.id;
    const role = (req as any).user.role;
    
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed' });
      return;
    }
    const { qrToken, stationId, dispensedAmount } = parsed.data;

    if (role !== 'STATION_OWNER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ 
        where: { qrToken },
        include: {
          vehicle: {
            include: {
              priority: {
                select: {
                  status: true,
                  serviceType: true,
                  validUntil: true
                }
              }
            }
          }
        }
      });
      if (!reservation) throw new Error('Invalid QR Token');
      if (reservation.status !== 'PENDING') throw new Error(`Reservation is ${reservation.status}`);
      if (reservation.stationId !== stationId) throw new Error('Reservation is for a different station');
      if (new Date() > reservation.validUntil) throw new Error('Reservation expired');

      const station = await tx.station.findUnique({ where: { id: stationId } });
      if (!station) throw new Error('Station not found');
      if (station.ownerId !== ownerId && role !== 'ADMIN') throw new Error('Unauthorized for this station');

      const finalAmount = dispensedAmount !== undefined ? dispensedAmount : reservation.amount.toNumber();
      if (finalAmount > reservation.amount.toNumber()) {
        throw new Error('Cannot dispense more than reserved amount');
      }

      // Handle partial dispensing (refund the difference to quota and inventory)
      const diff = reservation.amount.toNumber() - finalAmount;
      if (diff > 0) {
        const quota = await tx.fuelQuota.findFirst({
          where: { vehicleId: reservation.vehicleId as string, isActive: true }
        });
        if (quota) {
          await tx.fuelQuota.update({
            where: { id: quota.id },
            data: { remainingQuota: { increment: diff } }
          });
        }

        const inventory = await tx.fuelInventory.findUnique({
          where: { stationId_fuelType: { stationId: reservation.stationId, fuelType: reservation.fuelType } }
        });
        if (inventory) {
          await tx.fuelInventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: diff } }
          });
        }
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: reservation.userId,
          stationId,
          fuelType: reservation.fuelType,
          amount: new Prisma.Decimal(finalAmount),
          price: new Prisma.Decimal(0), // Would pull price dynamically in real app
          status: 'SUCCESS',
          reservationId: reservation.id
        }
      });

      // Mark completed atomically to prevent race condition with cancellation
      const updatedRes = await tx.reservation.updateMany({
        where: { id: reservation.id, status: 'PENDING' },
        data: { status: 'COMPLETED' }
      });
      if (updatedRes.count === 0) {
         throw new Error('Reservation was already processed or cancelled.');
      }

      return { reservation: { ...reservation, status: 'COMPLETED' }, transaction };
    });

    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
};

export const getReservationMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const count = await prisma.reservation.count({
      where: {
        status: 'PENDING'
      }
    });

    res.json({ activeReservations: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStationOwnerReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    if (role !== 'STATION_OWNER') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        station: {
          ownerId: userId
        }
      },
      select: {
        id: true,
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
            location: true
          }
        },
        transaction: {
          select: {
            amount: true,
            status: true,
            createdAt: true
          }
        }
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
