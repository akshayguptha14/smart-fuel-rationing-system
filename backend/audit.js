const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all data for audit...");
  
  const users = await prisma.user.findMany({
    include: {
      vehicles: {
        include: {
          fuelQuotas: true,
          reservations: true
        }
      },
      reservations: true,
      transactions: true,
      stations: true
    }
  });

  const allQuotas = await prisma.fuelQuota.findMany();
  const allReservations = await prisma.reservation.findMany();
  const allTransactions = await prisma.transaction.findMany();

  const MUST_KEEP_EMAILS = [
    'akshay@gmail.com',
    'john@gmail.com',
    'e2e_user_1791022221819@example.com'
  ];

  let mustKeepUsers = [];
  let safeTestUsers = [];
  let uncertainUsers = [];

  for (const user of users) {
    const isMustKeep = MUST_KEEP_EMAILS.includes(user.email);
    const isTestLike = user.email.includes('@example.com') && !isMustKeep;
    
    if (isMustKeep) {
      mustKeepUsers.push(user);
    } else if (isTestLike) {
      safeTestUsers.push(user);
    } else {
      uncertainUsers.push(user);
    }
  }

  const formatUser = u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    vehiclesCount: u.vehicles.length,
    reservationsCount: u.reservations.length,
    transactionsCount: u.transactions.length,
    ownsStation: u.stations.length > 0
  });

  const fs = require('fs');
  fs.writeFileSync('audit_results.json', JSON.stringify({
    stats: {
      users: users.length,
      vehicles: users.reduce((sum, u) => sum + u.vehicles.length, 0),
      quotas: allQuotas.length,
      reservations: allReservations.length,
      transactions: allTransactions.length
    },
    mustKeep: mustKeepUsers.map(formatUser),
    safeTest: safeTestUsers.map(formatUser),
    uncertain: uncertainUsers.map(formatUser),
    mustKeepDetails: mustKeepUsers.map(u => ({
      email: u.email,
      vehicles: u.vehicles.map(v => ({
        plate: v.licensePlate,
        quotas: v.fuelQuotas.length,
        reservations: v.reservations.length
      })),
      transactions: u.transactions.length
    })),
    safeTestDetails: safeTestUsers.map(u => ({
      email: u.email,
      vehicles: u.vehicles.map(v => ({
        plate: v.licensePlate,
        type: v.vehicleType,
        quotas: v.fuelQuotas.length,
        activeQuota: v.fuelQuotas.find(q => q.isActive)
      })),
      reservations: u.reservations.length,
      transactions: u.transactions.length
    }))
  }, null, 2));
  console.log("Audit complete, written to audit_results.json");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
