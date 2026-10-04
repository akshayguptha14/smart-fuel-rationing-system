const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const testStationIds = [
  'e47f2fb5-422f-4035-9244-8489ae120b77',
  '49b06a92-1040-4302-9b89-213c7fa2facc',
  'bdd1b28c-a5be-4d67-824f-a8c624e00efc',
  '5f8f88e6-67a5-4a99-9ca6-4bd0849d1804',
  'e2af8b21-526f-4bfc-9ff7-d55dea25504b',
  'e97012b9-2905-499d-abce-f2b7f227f5ae',
  '4cb07fed-55ce-41b4-9114-d2f79ac522a5',
  '085f7733-f9e4-4522-9eb7-c6a541da5967',
  '2535fabd-7b20-4926-86b0-792f523f7bd1',
  'e4acdb23-6eef-4a04-86db-0f0bb68404ab',
  'b2d65feb-21ad-47c9-82d5-90f0ff8b12c8',
  '9891f298-3faa-4665-9043-6d8cabc7739f',
  '64e8e33c-12b8-404b-9654-8ede511db160'
];

const REAL_STATION_ID = 'fd0ed2ae-706a-438a-a448-74d3ff566557';
const REAL_OWNER_EMAIL = 'john@gmail.com';

async function main() {
  console.log("--- 1. VERIFY TARGET SET ---");
  const targetStations = await prisma.station.findMany({
    where: { id: { in: testStationIds } },
    include: { owner: true }
  });

  if (targetStations.length !== testStationIds.length) {
    console.error(`Expected ${testStationIds.length} stations, found ${targetStations.length}`);
    return;
  }

  for (const station of targetStations) {
    if (station.id === REAL_STATION_ID) {
      console.error(`CRITICAL: Target set includes real station ID!`);
      return;
    }
    if (station.owner.email === REAL_OWNER_EMAIL) {
      console.error(`CRITICAL: Target set includes real owner ${REAL_OWNER_EMAIL}!`);
      return;
    }
  }

  console.log("Target set verified. Total target stations:", targetStations.length);
  targetStations.forEach(s => {
    console.log(`Station ID: ${s.id} | Name: ${s.name} | Owner: ${s.owner.email} | Location: ${s.location}`);
  });

  console.log("\n--- 2. PRE-CHECK REAL DATA ---");
  const realStationBefore = await prisma.station.findUnique({
    where: { id: REAL_STATION_ID },
    include: { owner: true, inventory: true, transactions: true }
  });
  
  if (!realStationBefore || realStationBefore.owner.email !== REAL_OWNER_EMAIL) {
    console.error("Real station or owner is missing or incorrect before cleanup!");
    return;
  }
  const realTxBefore = realStationBefore.transactions.find(tx => parseFloat(tx.amount) === 20 && tx.fuelType === 'PETROL');
  if (!realTxBefore) {
    console.error("Real 20 L PETROL transaction is missing before cleanup!");
    return;
  }
  console.log("Real station and transaction are intact.");

  console.log("\n--- 3. SAFE CLEANUP ---");
  
  // Extract target owner IDs
  const ownerIds = [...new Set(targetStations.map(s => s.ownerId))];

  await prisma.$transaction(async (tx) => {
    // Delete Transactions
    const deletedTx = await tx.transaction.deleteMany({
      where: { stationId: { in: testStationIds } }
    });
    console.log(`Deleted ${deletedTx.count} transactions.`);

    // Delete Reservations
    const deletedResv = await tx.reservation.deleteMany({
      where: { stationId: { in: testStationIds } }
    });
    console.log(`Deleted ${deletedResv.count} reservations.`);

    // FuelInventory deletes via Cascade, but let's be explicit if we want or let cascade handle it
    // Actually cascade handles it. Delete Stations
    const deletedStations = await tx.station.deleteMany({
      where: { id: { in: testStationIds } }
    });
    console.log(`Deleted ${deletedStations.count} stations (and cascaded inventory).`);

    // Verify owners only have test stations
    for (const ownerId of ownerIds) {
      const owner = await tx.user.findUnique({
        where: { id: ownerId },
        include: { stations: true, reservations: true, transactions: true, vehicles: true }
      });
      if (owner) {
        if (owner.stations.length === 0 && owner.reservations.length === 0 && owner.transactions.length === 0 && owner.vehicles.length === 0) {
          if (owner.email !== REAL_OWNER_EMAIL && owner.email.includes('@example.com')) {
            await tx.user.delete({ where: { id: ownerId } });
            console.log(`Deleted test owner user: ${owner.email}`);
          }
        } else {
          console.log(`Skipped owner ${owner.email} due to remaining related records.`);
        }
      }
    }
  }, { timeout: 60000 });

  console.log("\n--- 4. POST-CLEANUP VERIFICATION ---");
  const allStations = await prisma.station.findMany({
    include: { owner: true, inventory: true, transactions: true }
  });
  console.log(`Total stations remaining: ${allStations.length}`);

  const realStationAfter = allStations.find(s => s.id === REAL_STATION_ID);
  if (!realStationAfter) {
    console.error("Real station was deleted!");
    return;
  }

  console.log(`Remaining station: ${realStationAfter.name}`);
  console.log(`Owner: ${realStationAfter.owner.email}`);
  console.log(`Coordinates: ${realStationAfter.latitude}, ${realStationAfter.longitude}`);
  realStationAfter.inventory.forEach(i => {
    console.log(`${i.fuelType}: ${i.quantity} / ${i.capacity}`);
  });

  const realTxAfter = realStationAfter.transactions.find(tx => parseFloat(tx.amount) === 20 && tx.fuelType === 'PETROL');
  if (realTxAfter) {
    console.log("Real 20 L transaction verified intact.");
  } else {
    console.error("Real 20 L transaction missing!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
