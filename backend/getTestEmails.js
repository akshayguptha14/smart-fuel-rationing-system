const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(users.filter(u => u.role === 'USER').map(u => u.email).slice(0, 1));
  console.log(users.filter(u => u.role === 'ADMIN').map(u => u.email).slice(0, 1));
  console.log(users.filter(u => u.role === 'STATION_OWNER').map(u => u.email).slice(0, 1));
}
main().finally(() => prisma.$disconnect());
