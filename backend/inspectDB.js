const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'john@gmail.com' },
    select: { id: true, name: true, email: true, role: true }
  });

  const stations = await prisma.station.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      inventory: true
    }
  });

  console.log("JOHN'S RECORD:", JSON.stringify(user, null, 2));
  console.log("STATIONS:", JSON.stringify(stations, null, 2));
}

main().finally(() => prisma.$disconnect());
