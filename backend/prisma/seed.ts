import { PrismaClient, VehicleType, QuotaPeriod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting QuotaPolicy seeding...');

  const policies = [
    { vehicleType: VehicleType.MOTORCYCLE, defaultQuota: 20, period: QuotaPeriod.MONTHLY },
    { vehicleType: VehicleType.CAR, defaultQuota: 40, period: QuotaPeriod.MONTHLY },
    { vehicleType: VehicleType.THREE_WHEELER, defaultQuota: 25, period: QuotaPeriod.MONTHLY },
    { vehicleType: VehicleType.TRUCK, defaultQuota: 100, period: QuotaPeriod.MONTHLY },
    { vehicleType: VehicleType.BUS, defaultQuota: 120, period: QuotaPeriod.MONTHLY },
    { vehicleType: VehicleType.OTHER, defaultQuota: 20, period: QuotaPeriod.MONTHLY },
  ];

  for (const policy of policies) {
    // Check if policy already exists to avoid overwriting administrator-customized values
    const existing = await prisma.quotaPolicy.findUnique({
      where: { vehicleType: policy.vehicleType }
    });

    if (existing) {
      console.log(`⚠️ Policy for ${policy.vehicleType} already exists. Preserving existing values.`);
      continue;
    }

    // Create if not exists
    await prisma.quotaPolicy.create({
      data: {
        vehicleType: policy.vehicleType,
        defaultQuota: policy.defaultQuota,
        period: policy.period
      }
    });
    console.log(`✅ Created policy for ${policy.vehicleType}: ${policy.defaultQuota}L (${policy.period})`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
