import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getTransactionMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req as any).user.role;
    
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aggregate = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: today
        }
      }
    });

    const totalAmount = aggregate._sum.amount ? aggregate._sum.amount.toNumber() : 0;

    res.json({ todayDispensedFuel: totalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
