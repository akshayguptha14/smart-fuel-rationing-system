const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const transactions = await prisma.transaction.findMany({
    where: {
      reservationId: { not: null },
      vehicleIdSnapshot: null
    },
    include: {
      reservation: {
        include: {
          vehicle: true
        }
      }
    }
  });

  console.log(`Found ${transactions.length} transactions to backfill.`);
  let updated = 0;

  for (const tx of transactions) {
    if (tx.reservation && tx.reservation.vehicleId) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          vehicleIdSnapshot: tx.reservation.vehicleId,
          fleetIdSnapshot: tx.reservation.vehicle?.fleetId || null
        }
      });
      updated++;
    }
  }

  console.log(`Successfully backfilled ${updated} transactions.`);
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
