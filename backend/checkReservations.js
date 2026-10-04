const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stationId = 'fd0ed2ae-706a-438a-a448-74d3ff566557';
  
  const reservations = await prisma.reservation.findMany({
    where: { stationId },
    include: {
      transaction: true,
      user: { select: { name: true, email: true } },
      vehicle: { select: { licensePlate: true, vehicleType: true } }
    }
  });

  console.log("Reservations count:", reservations.length);
  console.log(JSON.stringify(reservations, null, 2));
}

main().finally(() => prisma.$disconnect());
