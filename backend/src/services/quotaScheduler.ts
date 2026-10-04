import { prisma } from '../utils/prisma';

export const runQuotaReset = async () => {
  try {
    const now = new Date();
    
    // Find all expired active quotas
    const expiredQuotas = await prisma.fuelQuota.findMany({
      where: {
        isActive: true,
        endDate: { lte: now }
      },
      include: { vehicle: true }
    });

    if (expiredQuotas.length === 0) return;

    console.log(`[QuotaScheduler] Found ${expiredQuotas.length} expired quotas to reset.`);

    // Process safely inside a transaction for each quota
    for (const quota of expiredQuotas) {
      await prisma.$transaction(async (tx) => {
        // Mark old as inactive atomically
        const updated = await tx.fuelQuota.updateMany({
          where: { id: quota.id, isActive: true },
          data: { isActive: false }
        });
        
        // If it was already updated by a concurrent process, bail out
        if (updated.count === 0) return;

        // Find policy or fallback
        const policy = await tx.quotaPolicy.findUnique({
          where: { vehicleType: quota.vehicle.vehicleType }
        });
        const defaultQuota = policy?.defaultQuota.toNumber() || 20;
        const period = policy?.period || 'WEEKLY';

        const startDate = new Date();
        const endDate = new Date();
        if (period === 'WEEKLY') {
          endDate.setDate(startDate.getDate() + 7);
        } else {
          endDate.setMonth(startDate.getMonth() + 1);
        }

        // Create new active quota
        await tx.fuelQuota.create({
          data: {
            vehicleId: quota.vehicleId,
            totalQuota: defaultQuota,
            remainingQuota: defaultQuota,
            period,
            startDate,
            endDate,
            isActive: true
          }
        });
      });
    }

    console.log(`[QuotaScheduler] Reset ${expiredQuotas.length} quotas successfully.`);
  } catch (error) {
    console.error(`[QuotaScheduler] Error resetting quotas:`, error);
  }
};

export const startQuotaScheduler = () => {
  console.log('[QuotaScheduler] Starting background job...');
  // Run immediately on boot to catch up
  runQuotaReset();
  
  // Then run every hour
  setInterval(runQuotaReset, 60 * 60 * 1000);
};
