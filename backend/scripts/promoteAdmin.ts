import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updatedUser = await prisma.user.update({
    where: { email: 'akshay@gmail.com' },
    data: { role: 'ADMIN' },
  });

  console.log(
    'Successfully promoted user:',
    updatedUser.email,
    'to role:',
    updatedUser.role
  );
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
