const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: 'john' },
        { email: { contains: 'john' } }
      ]
    }
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log("BEFORE:", JSON.stringify(user, null, 2));

  if (user.role === 'USER') {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'STATION_OWNER' }
    });
    console.log("AFTER:", JSON.stringify(updatedUser, null, 2));
  } else {
    console.log("User role is already", user.role);
  }
}

main().finally(() => prisma.$disconnect());
