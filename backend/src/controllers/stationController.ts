import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Prisma, FuelType } from '@prisma/client';

import { z } from 'zod';

const registerStationSchema = z.object({
  name: z.string().min(2).max(100),
  location: z.string().min(2).max(100),
  address: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contactPhone: z.string().max(20).optional()
});

export const registerStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    
    if (role !== 'STATION_OWNER' && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = registerStationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed' });
      return;
    }
    const { name, location, address, latitude, longitude, contactPhone } = parsed.data;

    const station = await prisma.station.create({
      data: {
        name,
        location,
        address,
        latitude,
        longitude,
        contactPhone,
        ownerId: userId
      }
    });

    res.status(201).json(station);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const listStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    let stations;
    if (role === 'ADMIN' || role === 'USER') {
      // Regular users and admins can see all stations (users need it to book)
      stations = await prisma.station.findMany({ include: { owner: { select: { name: true, email: true } }, inventory: true } });
    } else if (role === 'STATION_OWNER') {
      // Owners only see their own stations
      stations = await prisma.station.findMany({ where: { ownerId: userId }, include: { inventory: true } });
    } else {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Append percentageRemaining to inventory array
    const stationsWithCalc = stations.map(station => ({
      ...station,
      inventory: station.inventory.map(inv => {
        const quantityNum = inv.quantity.toNumber();
        const capacityNum = inv.capacity.toNumber();
        const percentageRemaining = capacityNum > 0 ? (quantityNum / capacityNum) * 100 : 0;
        return {
          ...inv,
          percentageRemaining,
          isLowStock: undefined // TODO Phase 4C/4D: Define low stock threshold
        };
      })
    }));

    res.json(stationsWithCalc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStationDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const station = await prisma.station.findUnique({ where: { id }, include: { inventory: true } });
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    if (station.ownerId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const stationWithCalc = {
      ...station,
      inventory: station.inventory.map(inv => {
        const quantityNum = inv.quantity.toNumber();
        const capacityNum = inv.capacity.toNumber();
        const percentageRemaining = capacityNum > 0 ? (quantityNum / capacityNum) * 100 : 0;
        return {
          ...inv,
          percentageRemaining,
          isLowStock: undefined // TODO Phase 4C/4D: Define low stock threshold
        };
      })
    };

    res.json(stationWithCalc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateInventorySchema = z.object({
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']),
  quantity: z.number().nonnegative().finite().max(1000000),
  capacity: z.number().positive().finite().max(1000000)
}).refine(data => data.quantity <= data.capacity, {
  message: 'Quantity cannot exceed capacity'
});

export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    
    const parsed = updateInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed' });
      return;
    }
    const { fuelType, quantity, capacity } = parsed.data;

    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    if (station.ownerId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (role === 'STATION_OWNER') {
      res.status(403).json({ error: 'Station Owners must use the allocation request workflow.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.fuelInventory.findUnique({
        where: { stationId_fuelType: { stationId: id, fuelType: fuelType as FuelType } }
      });

      let resultInv;
      if (inventory) {
        // Acquire row lock to guarantee oldQty is concurrency-safe before absolute overwrite
        const lockedInv = await tx.fuelInventory.update({
          where: { id: inventory.id },
          data: { updatedAt: new Date() }
        });
        const oldQty = lockedInv.quantity.toNumber();

        resultInv = await tx.fuelInventory.update({
          where: { id: inventory.id },
          data: { quantity: new Prisma.Decimal(quantity), capacity: new Prisma.Decimal(capacity) }
        });
        await tx.inventoryLedger.create({
          data: {
            stationId: id,
            fuelType: fuelType as any,
            eventType: 'MANUAL_ADJUSTMENT',
            quantityChange: new Prisma.Decimal(quantity - oldQty),
            quantityAfter: new Prisma.Decimal(quantity),
            referenceId: null
          }
        });
      } else {
        resultInv = await tx.fuelInventory.create({
          data: {
            stationId: id,
            fuelType: fuelType as any,
            quantity: new Prisma.Decimal(quantity),
            capacity: new Prisma.Decimal(capacity)
          }
        });
        await tx.inventoryLedger.create({
          data: {
            stationId: id,
            fuelType: fuelType as any,
            eventType: 'MANUAL_ADJUSTMENT',
            quantityChange: new Prisma.Decimal(quantity),
            quantityAfter: new Prisma.Decimal(quantity),
            referenceId: null
          }
        });
      }
      return resultInv;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const allocationRequestSchema = z.object({
  stationId: z.string().uuid(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']),
  requestedQuantity: z.number().positive().finite(),
  reason: z.string().max(1000).optional()
});

export const createAllocationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    
    if (role !== 'STATION_OWNER') {
      res.status(403).json({ error: 'Only Station Owners can request allocation' });
      return;
    }

    const parsed = allocationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error });
      return;
    }
    const { stationId, fuelType, requestedQuantity, reason } = parsed.data;

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    if (station.ownerId !== userId) {
      res.status(403).json({ error: 'Forbidden. You do not own this station.' });
      return;
    }

    const allocationReq = await prisma.fuelAllocationRequest.create({
      data: {
        stationId,
        requestedById: userId,
        fuelType: fuelType as FuelType,
        requestedQuantity: new Prisma.Decimal(requestedQuantity),
        reason,
        status: 'PENDING'
      }
    });

    res.status(201).json(allocationReq);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStationAllocationRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    
    if (role !== 'STATION_OWNER') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const requests = await prisma.fuelAllocationRequest.findMany({
      where: {
        station: { ownerId: userId }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
