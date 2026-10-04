import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'e2e_user_1791022221819@example.com' },
    include: {
      reservations: true,
      transactions: true
    }
  });

  console.log('User:', user?.email);
  console.log('Reservations:', user?.reservations.map(r => ({ id: r.id, status: r.status, amount: r.amount })));
  console.log('Transactions:', user?.transactions.map(t => ({ id: t.id, amount: t.amount, status: t.status, resId: t.reservationId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
