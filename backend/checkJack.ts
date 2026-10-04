import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'jack@gmail.com' } });
  console.log('User:', user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
