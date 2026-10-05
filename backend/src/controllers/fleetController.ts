import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const registerFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Valid fleet name is required' });
      return;
    }

    const existingFleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (existingFleet) {
      res.status(400).json({ error: 'Operator already has a fleet' });
      return;
    }

    const fleet = await prisma.fleet.create({
      data: {
        name: name.trim(),
        operatorId
      }
    });

    res.json(fleet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFleetDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { fleetId: fleet.id },
      include: { fuelQuotas: { where: { isActive: true } } }
    });

    const activeReservations = await prisma.reservation.count({
      where: {
        vehicle: { fleetId: fleet.id },
        status: 'PENDING'
      }
    });

    const successfulTransactions = await prisma.transaction.count({
      where: {
        fleetIdSnapshot: fleet.id,
        status: 'SUCCESS'
      }
    });

    const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTransactions = await prisma.transaction.aggregate({
      where: {
        fleetIdSnapshot: fleet.id,
        status: 'SUCCESS',
        createdAt: { gte: sevenDaysAgo }
      },
      _sum: { amount: true }
    });

    let totalQuota = 0;
    let remainingQuota = 0;

    for (const v of vehicles) {
      if (v.fuelQuotas && v.fuelQuotas.length > 0) {
        totalQuota += v.fuelQuotas[0].totalQuota.toNumber();
        remainingQuota += v.fuelQuotas[0].remainingQuota.toNumber();
      }
    }

    const consumedQuota = totalQuota - remainingQuota;
    const quotaUtilization = totalQuota > 0 ? (consumedQuota / totalQuota) * 100 : 0;

    res.json({
      fleetName: fleet.name,
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.fuelQuotas && v.fuelQuotas.length > 0).length,
      totalQuota,
      remainingQuota,
      consumedQuota,
      quotaUtilization,
      successfulTransactions,
      activeReservations,
      totalFuelConsumed: recentTransactions._sum.amount ? recentTransactions._sum.amount.toNumber() : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFleetVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { fleetId: fleet.id },
      select: {
        id: true,
        licensePlate: true,
        vehicleType: true,
        verification: { select: { status: true } },
        fuelQuotas: {
          where: { isActive: true },
          select: { totalQuota: true, remainingQuota: true }
        },
        fleetId: true
      }
    });

    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFleetTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { fleetIdSnapshot: fleet.id },
      select: {
        id: true,
        vehicleIdSnapshot: true,
        amount: true,
        fuelType: true,
        status: true,
        createdAt: true,
        station: { select: { name: true, location: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFleetReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      where: { vehicle: { fleetId: fleet.id } },
      select: {
        id: true,
        vehicle: { select: { licensePlate: true, vehicleType: true } },
        station: { select: { name: true, location: true } },
        fuelType: true,
        amount: true,
        status: true,
        createdAt: true,
        validUntil: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createFleetJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;
    const { licensePlate } = req.body;

    if (!licensePlate) {
      res.status(400).json({ error: 'License plate is required' });
      return;
    }

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { licensePlate } });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.fleetId) {
      res.status(400).json({ error: 'Vehicle is already assigned to a fleet' });
      return;
    }

    const existingRequest = await prisma.fleetJoinRequest.findFirst({
      where: { fleetId: fleet.id, vehicleId: vehicle.id, status: 'PENDING' }
    });

    if (existingRequest) {
      res.status(400).json({ error: 'There is already a pending request for this vehicle' });
      return;
    }

    const joinRequest = await prisma.fleetJoinRequest.create({
      data: {
        fleetId: fleet.id,
        vehicleId: vehicle.id,
        status: 'PENDING'
      }
    });

    res.json(joinRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFleetJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const requests = await prisma.fleetJoinRequest.findMany({
      where: { fleetId: fleet.id },
      include: { vehicle: { select: { licensePlate: true, vehicleType: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const cancelFleetJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = (req as any).user.id;
    const { id } = req.params as { id: string };

    const fleet = await prisma.fleet.findUnique({ where: { operatorId } });
    if (!fleet) {
      res.status(404).json({ error: 'Fleet not found' });
      return;
    }

    const request = await prisma.fleetJoinRequest.findUnique({ where: { id } });
    if (!request || request.fleetId !== fleet.id) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending requests can be cancelled' });
      return;
    }

    const cancelledRequest = await prisma.fleetJoinRequest.update({
      where: { id },
      data: { status: 'CANCELLED', reviewedAt: new Date() }
    });

    res.json(cancelledRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
