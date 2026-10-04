import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Prisma, VehicleType, QuotaPeriod } from '@prisma/client';
import { z } from 'zod';

export const getPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const policies = await prisma.quotaPolicy.findMany();
    res.json({ policies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updatePolicySchema = z.object({
  defaultQuota: z.number().positive().finite().max(10000),
  period: z.enum(['WEEKLY', 'MONTHLY'])
});

export const updatePolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const vehicleTypeStr = req.params.vehicleType;
    if (!Object.values(VehicleType).includes(vehicleTypeStr as VehicleType)) {
      res.status(400).json({ error: 'Invalid vehicle type' });
      return;
    }
    const vehicleType = vehicleTypeStr as VehicleType;

    const parsed = updatePolicySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error });
      return;
    }

    const { defaultQuota, period } = parsed.data;

    const policy = await prisma.quotaPolicy.upsert({
      where: { vehicleType },
      update: {
        defaultQuota: new Prisma.Decimal(defaultQuota),
        period: period as QuotaPeriod
      },
      create: {
        vehicleType,
        defaultQuota: new Prisma.Decimal(defaultQuota),
        period: period as QuotaPeriod
      }
    });

    res.json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
