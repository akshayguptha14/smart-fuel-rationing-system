import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const API = 'http://localhost:3001/api';

async function runTest() {
  console.log('Testing Concurrency Vulnerabilities...');
  const prisma = new PrismaClient();
  try {
    const ts = Date.now();
    const ownerEmail = `conc-owner-${ts}@example.com`;
    const userEmail = `conc-user-${ts}@example.com`;

    // 1. Setup
    await axios.post(`${API}/auth/register`, { name: 'Owner', email: ownerEmail, password: 'password' });
    await prisma.user.update({ where: { email: ownerEmail }, data: { role: 'STATION_OWNER' } });
    const ownerRes = await axios.post(`${API}/auth/login`, { email: ownerEmail, password: 'password' });
    const ownerToken = ownerRes.data.token;

    await axios.post(`${API}/auth/register`, { name: 'User', email: userEmail, password: 'password' });
    const userRes = await axios.post(`${API}/auth/login`, { email: userEmail, password: 'password' });
    const userToken = userRes.data.token;

    const stRes = await axios.post(`${API}/stations`, { name: 'Conc Station', location: 'City' }, { headers: { Authorization: `Bearer ${ownerToken}` }});
    const stationId = stRes.data.id;
    await axios.post(`${API}/stations/${stationId}/inventory`, { fuelType: 'PETROL', quantity: 50, capacity: 100 }, { headers: { Authorization: `Bearer ${ownerToken}` }});

    const vehRes = await axios.post(`${API}/vehicles`, { licensePlate: `CONC-${ts}`, vehicleType: 'TRUCK' }, { headers: { Authorization: `Bearer ${userToken}` }});
    const vehicleId = vehRes.data.id;
    await new Promise(r => setTimeout(r, 500)); // wait for quota allocation

    // 2. Fire Concurrent Requests
    // The quota is 100L. Inventory is 50L.
    // If we fire 5 requests for 15L concurrently (Total 75L), 3 should succeed (45L) and 2 should fail (due to inventory limit 50L).
    
    console.log('Firing 5 concurrent booking requests of 15L each (Stock: 50L)...');
    
    const requests = [];
    for(let i=0; i<5; i++) {
      requests.push(
        axios.post(`${API}/reservations`, {
          vehicleId, stationId, fuelType: 'PETROL', amount: 15
        }, { headers: { Authorization: `Bearer ${userToken}` } })
        .then(res => 'SUCCESS')
        .catch(err => 'FAILED: ' + (err.response?.data?.error || err.message))
      );
    }

    const results = await Promise.all(requests);
    const successes = results.filter(r => r === 'SUCCESS').length;
    console.log(`Results: ${successes} Success, ${5 - successes} Failed`);
    console.log(results);

    // 3. Verify Final Balances
    const quota = await prisma.fuelQuota.findFirst({ where: { vehicleId, isActive: true } });
    const inventory = await prisma.fuelInventory.findUnique({ where: { stationId_fuelType: { stationId, fuelType: 'PETROL' } } });

    console.log(`Final Quota Remaining: ${quota?.remainingQuota} L`);
    console.log(`Final Inventory: ${inventory?.quantity} L`);

    if (Number(inventory?.quantity) < 0) {
      console.log('❌ CRITICAL VULNERABILITY: Inventory went negative!');
      process.exit(1);
    } else if (successes > 3) {
      console.log('❌ CRITICAL VULNERABILITY: Oversold inventory!');
      process.exit(1);
    } else {
      console.log('✅ Invariants maintained successfully.');
    }

  } catch (error: any) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
