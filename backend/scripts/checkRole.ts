import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'akshay@gmail.com' } });
  console.log('DB_ROLE:', user?.role);
}
main().catch(console.error).finally(() => prisma.$disconnect());
