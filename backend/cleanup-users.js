const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targetUserEmails = [
  "test-1790852876234@example.com",
  "station-1790853373924@example.com",
  "user-1790853373924@example.com",
  "user-1790854109048@example.com",
  "user-1790854477714@example.com",
  "owner2-1790854801127@example.com",
  "user2-1790854823496@example.com",
  "user2-1790854849185@example.com",
  "conc-user-1790855236713@example.com",
  "conc-user-1790855293787@example.com",
  "conc-user-1790855345875@example.com",
  "user2-1790855355138@example.com",
  "conc-user-1790855494946@example.com",
  "user2-1790855504747@example.com",
  "conc-user-1790856102408@example.com",
  "user2-1790856110306@example.com",
  "conc-user-1790856416844@example.com",
  "user2-1790856426481@example.com",
  "e2e_user_1791020041201@example.com",
  "e2e_user_1791020094214@example.com",
  "e2e_user_1791020145081@example.com",
  "e2e_user_1791020176476@example.com",
  "e2e_user_1791020239780@example.com"
];

const MUST_KEEP_EMAILS = [
  'akshay@gmail.com',
  'john@gmail.com',
  'e2e_user_1791022221819@example.com',
  'abhi@gmail.com'
];

async function main() {
  console.log("--- 1. PRE-DELETE SAFETY CHECK ---");

  const targetUsers = await prisma.user.findMany({
    where: { email: { in: targetUserEmails } },
    include: {
      vehicles: {
        include: { fuelQuotas: true }
      },
      reservations: true,
      transactions: true,
      stations: true
    }
  });

  if (targetUsers.length !== targetUserEmails.length) {
    console.error(`Expected ${targetUserEmails.length} target users, found ${targetUsers.length}`);
    return;
  }

  for (const user of targetUsers) {
    if (MUST_KEEP_EMAILS.includes(user.email)) {
      console.error(`CRITICAL: Target user ${user.email} is in MUST_KEEP_EMAILS list!`);
      return;
    }
    if (user.reservations.length > 0 || user.transactions.length > 0 || user.stations.length > 0) {
      console.error(`CRITICAL: Target user ${user.email} has unexpected dependent records!`);
      return;
    }
  }
  console.log("Pre-delete safety checks passed.");

  console.log("\n--- 2. SAFE DELETION ---");
  const targetUserIds = targetUsers.map(u => u.id);

  await prisma.$transaction(async (tx) => {
    // Delete quotas and vehicles
    for (const user of targetUsers) {
      for (const vehicle of user.vehicles) {
        await tx.fuelQuota.deleteMany({ where: { vehicleId: vehicle.id } });
        await tx.vehicle.delete({ where: { id: vehicle.id } });
      }
      await tx.user.delete({ where: { id: user.id } });
    }
  }, { timeout: 60000 });

  console.log("\n--- 3. POST-CLEANUP VERIFICATION ---");
  const allUsers = await prisma.user.findMany({
    include: {
      vehicles: { include: { fuelQuotas: true } },
      reservations: true,
      transactions: true,
      stations: { include: { inventory: true } }
    }
  });
  
  const allQuotas = await prisma.fuelQuota.findMany();
  const allReservations = await prisma.reservation.findMany();
  const allTransactions = await prisma.transaction.findMany();

  const fs = require('fs');
  fs.writeFileSync('cleanup_users_results.json', JSON.stringify({
    stats: {
      users: allUsers.length,
      vehicles: allUsers.reduce((sum, u) => sum + u.vehicles.length, 0),
      quotas: allQuotas.length,
      reservations: allReservations.length,
      transactions: allTransactions.length
    },
    remainingUsers: allUsers.map(u => ({
      email: u.email,
      vehicles: u.vehicles.length,
      reservations: u.reservations.length,
      transactions: u.transactions.length,
      stations: u.stations.map(s => ({
        name: s.name,
        inventory: s.inventory.map(i => `${i.fuelType} ${i.quantity}/${i.capacity}`)
      }))
    }))
  }, null, 2));

  console.log("Cleanup successful, verification results written to cleanup_users_results.json");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
