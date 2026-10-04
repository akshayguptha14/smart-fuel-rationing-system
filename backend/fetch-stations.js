const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stations = await prisma.station.findMany({
    include: {
      inventory: true,
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  const summary = stations.map(s => ({
    id: s.id,
    name: s.name,
    location: s.location,
    address: s.address,
    ownerName: s.owner?.name,
    ownerEmail: s.owner?.email,
    isActive: s.isActive,
    lat: s.latitude,
    lng: s.longitude,
    createdAt: s.createdAt,
    inventory: s.inventory.map(i => `${i.fuelType}: ${i.quantity}/${i.capacity}`)
  }));
  
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
