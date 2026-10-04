import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    include: {
      vehicles: {
        include: {
          fuelQuotas: {
            where: { isActive: true }
          }
        }
      }
    }
  });

  console.log(JSON.stringify(users, null, 2));

  const station = await prisma.station.findUnique({
    where: { id: 'fd0ed2ae-706a-438a-a448-74d3ff566557' },
    include: { inventory: true }
  });

  if (!station) {
    const backupStation = await prisma.station.findFirst({
      where: { name: { contains: 'Smart Fuel Station' } },
      include: { inventory: true }
    });
    console.log('Station not found by ID. Found by name:');
    console.log(JSON.stringify(backupStation, null, 2));
  } else {
    console.log('Station found:');
    console.log(JSON.stringify(station, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
