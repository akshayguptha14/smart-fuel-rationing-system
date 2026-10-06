import { PrismaClient, Prisma } from '@prisma/client';

export async function calculateDynamicQuotaFactors(
  tx: any,
  vehicleId: string,
  baseQuota: number,
  period: 'WEEKLY' | 'MONTHLY'
): Promise<{ usageMultiplier: number; locationMultiplier: number; referenceLocation: string | null; effectiveQuota: number }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Fetch recent transactions for location & fuelType frequencies
  const recentTransactions = await tx.transaction.findMany({
    where: {
      vehicleIdSnapshot: vehicleId,
      status: 'SUCCESS',
      createdAt: { gte: thirtyDaysAgo }
    },
    select: {
      fuelType: true,
      station: { select: { location: true } }
    }
  });

  const agg = await tx.transaction.aggregate({
    where: {
      vehicleIdSnapshot: vehicleId,
      status: 'SUCCESS',
      createdAt: { gte: thirtyDaysAgo }
    },
    _sum: { amount: true }
  });
  const totalDispensed = agg._sum.amount ? agg._sum.amount.toNumber() : 0;

  let referenceLocation: string | null = null;
  let relevantFuelType: string | null = null;
  let usageMultiplier = 1.0;
  let locationMultiplier = 1.0;

  if (recentTransactions.length > 0) {
    // Find most frequent location & fuelType
    const locationCounts: Record<string, number> = {};
    const fuelTypeCounts: Record<string, number> = {};

    for (const t of recentTransactions) {
      if (t.station && t.station.location) {
        locationCounts[t.station.location] = (locationCounts[t.station.location] || 0) + 1;
      }
      if (t.fuelType) {
        fuelTypeCounts[t.fuelType] = (fuelTypeCounts[t.fuelType] || 0) + 1;
      }
    }

    let maxLocCount = 0;
    for (const [loc, count] of Object.entries(locationCounts)) {
      if (count > maxLocCount) {
        maxLocCount = count;
        referenceLocation = loc;
      }
    }

    let maxFuelCount = 0;
    for (const [ft, count] of Object.entries(fuelTypeCounts)) {
      if (count > maxFuelCount) {
        maxFuelCount = count;
        relevantFuelType = ft;
      }
    }

    // 2. Evaluate Usage Factor
    // Expected 30-day baseline based on period
    let expected30DayQuota = 0;
    if (period === 'WEEKLY') {
      expected30DayQuota = baseQuota * (30 / 7);
    } else if (period === 'MONTHLY') {
      expected30DayQuota = baseQuota;
    }

    const utilization = expected30DayQuota > 0 ? totalDispensed / expected30DayQuota : 0;

    // Usage bands:
    // LOW (< 30%): multiplier = 0.8
    // NORMAL/HIGH (>= 30%): multiplier = 1.0
    // High usage MUST NOT increase future quota.
    if (utilization < 0.3) {
      usageMultiplier = 0.8;
    } else {
      usageMultiplier = 1.0;
    }
  }

  // 3. Evaluate Location/Supply Factor
  // Only evaluate if we have both a reference region and a determinable fuel type
  if (referenceLocation && relevantFuelType) {
    // Check supply condition of all stations in referenceLocation for the specific fuelType
    const regionalStations = await tx.station.findMany({
      where: { location: referenceLocation, isActive: true },
      include: {
        inventory: {
          where: { fuelType: relevantFuelType as any }
        }
      }
    });

    let totalRegionQuantity = 0;
    let totalRegionCapacity = 0;

    for (const st of regionalStations) {
      for (const inv of st.inventory) {
        totalRegionQuantity += inv.quantity.toNumber();
        totalRegionCapacity += inv.capacity.toNumber();
      }
    }

    // Regional Supply Bands:
    // < 20% (CRITICAL) => 0.8
    // 20% - 50% (REDUCED) => 0.9
    // > 50% (NORMAL) => 1.0
    if (totalRegionCapacity > 0) {
      const supplyPct = totalRegionQuantity / totalRegionCapacity;
      if (supplyPct < 0.2) {
        locationMultiplier = 0.8;
      } else if (supplyPct <= 0.5) {
        locationMultiplier = 0.9;
      }
    }
  }

  // Calculate final effective quota
  let effectiveQuota = baseQuota * usageMultiplier * locationMultiplier;

  // Round to 2 decimals
  effectiveQuota = Math.round(effectiveQuota * 100) / 100;

  return { usageMultiplier, locationMultiplier, referenceLocation, effectiveQuota };
}
