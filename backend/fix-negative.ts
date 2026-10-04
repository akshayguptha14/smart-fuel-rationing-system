import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  await prisma.fuelInventory.updateMany({
    where: { quantity: { lt: 0 } },
    data: { quantity: 0 }
  });
  console.log('Fixed negative inventories');
}
fix().finally(() => prisma.$disconnect());
