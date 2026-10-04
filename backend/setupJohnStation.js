const { PrismaClient, FuelType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const johnsUserId = "495f80dd-39c4-471e-9aad-e4736850157e";
  
  // Create station
  const station = await prisma.station.create({
    data: {
      name: "Smart Fuel Station - Bengaluru",
      location: "Bengaluru",
      address: "Koramangala, Bengaluru, Karnataka",
      latitude: 12.9352, // Koramangala
      longitude: 77.6245,
      isActive: true,
      ownerId: johnsUserId,
      inventory: {
        create: [
          {
            fuelType: FuelType.PETROL,
            quantity: 1250.50,
            capacity: 2000.00
          },
          {
            fuelType: FuelType.DIESEL,
            quantity: 850.00,
            capacity: 1500.00
          },
          {
            fuelType: FuelType.ELECTRIC,
            quantity: 8.00,
            capacity: 10.00
          }
        ]
      }
    },
    include: {
      inventory: true
    }
  });

  console.log("Created Station:");
  console.log(JSON.stringify(station, null, 2));

  // Count total stations
  const totalStations = await prisma.station.count();
  console.log("Total stations in DB:", totalStations);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
