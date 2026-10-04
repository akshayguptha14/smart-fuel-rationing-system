import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getQuotaBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const activeQuota = await prisma.fuelQuota.findFirst({
      where: { vehicleId, isActive: true }
    });

    res.json({ activeQuota });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const consumeQuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params as any;
    const { amount, stationId, fuelType, price } = req.body;
    const userId = (req as any).user.id; // Usually the station owner or admin
    const role = (req as any).user.role;

    if (amount === undefined || amount <= 0 || !stationId || !fuelType) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    if (role !== 'STATION_OWNER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only station owners can process transactions' });
      return;
    }

    // Process safely inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new Error('Vehicle not found');

      const quota = await tx.fuelQuota.findFirst({
        where: { vehicleId, isActive: true },
      });

      if (!quota) throw new Error('No active quota found for this vehicle');
      if (quota.remainingQuota.toNumber() < amount) {
        throw new Error(`Insufficient quota. Only ${quota.remainingQuota.toNumber()} liters remaining.`);
      }
      
      // Deduct quota atomically with strict check
      const updatedQuota = await tx.fuelQuota.updateMany({
        where: { id: quota.id, remainingQuota: { gte: amount } },
        data: { remainingQuota: { decrement: amount } }
      });
      if (updatedQuota.count === 0) {
        throw new Error('Concurrent quota allocation failed. Insufficient quota.');
      }

      // Optional: Deduct fuel inventory if tracked
      const inventory = await tx.fuelInventory.findUnique({
        where: { stationId_fuelType: { stationId, fuelType } }
      });

      if (inventory) {
        if (inventory.quantity.toNumber() < amount) throw new Error('Station has insufficient fuel inventory');
        const updatedInv = await tx.fuelInventory.updateMany({
          where: { id: inventory.id, quantity: { gte: amount } },
          data: { quantity: { decrement: amount } }
        });
        if (updatedInv.count === 0) {
          throw new Error('Concurrent inventory allocation failed. Insufficient stock.');
        }
      }

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: vehicle.userId, // The vehicle owner
          stationId: stationId,
          fuelType,
          amount: new Prisma.Decimal(amount),
          price: new Prisma.Decimal(price || 0),
          status: 'SUCCESS'
        }
      });

      if (inventory) {
        const currentInv = await tx.fuelInventory.findUnique({ where: { id: inventory.id } });
        if (currentInv) {
          await tx.inventoryLedger.create({
            data: {
              stationId,
              fuelType: fuelType as any,
              eventType: 'DISPENSED',
              quantityChange: new Prisma.Decimal(-amount),
              quantityAfter: currentInv.quantity,
              referenceId: transaction.id
            }
          });
        }
      }

      return { transaction, remainingQuota: quota.remainingQuota.toNumber() - amount };
    });

    res.json({ message: 'Quota consumed successfully', data: result });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
};
