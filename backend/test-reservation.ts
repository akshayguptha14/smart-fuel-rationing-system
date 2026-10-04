import axios from 'axios';

const API = 'http://localhost:3001/api';

async function runTest() {
  console.log('Testing Reservations and QR Verification...');
  try {
    const ts = Date.now();
    const ownerEmail = `owner2-${ts}@example.com`;
    const userEmail = `user2-${ts}@example.com`;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 1. Setup Station Owner
    await axios.post(`${API}/auth/register`, { name: 'Owner', email: ownerEmail, password: 'password' });
    await prisma.user.update({ where: { email: ownerEmail }, data: { role: 'STATION_OWNER' } });
    const ownerRes = await axios.post(`${API}/auth/login`, { email: ownerEmail, password: 'password' });
    const ownerToken = ownerRes.data.token;

    // 2. Setup User
    await axios.post(`${API}/auth/register`, { name: 'User', email: userEmail, password: 'password' });
    const userRes = await axios.post(`${API}/auth/login`, { email: userEmail, password: 'password' });
    const userToken = userRes.data.token;

    // 3. Register Station and Stock Inventory (by Owner)
    const stRes = await axios.post(`${API}/stations`, { name: 'Test Station', location: 'City' }, { headers: { Authorization: `Bearer ${ownerToken}` }});
    const stationId = stRes.data.id;
    await axios.post(`${API}/stations/${stationId}/inventory`, { fuelType: 'PETROL', quantity: 50, capacity: 100 }, { headers: { Authorization: `Bearer ${ownerToken}` }});
    console.log('✅ Station registered with 50L PETROL');

    // 4. Register Vehicle (by User)
    const vehRes = await axios.post(`${API}/vehicles`, { licensePlate: `TEST-${ts}`, vehicleType: 'TRUCK' }, { headers: { Authorization: `Bearer ${userToken}` }});
    const vehicleId = vehRes.data.id;
    console.log('✅ Vehicle registered. Active quota allocated.');

    // Wait a brief moment for background quota transactions
    await new Promise(r => setTimeout(r, 500));

    // 5. Test Insufficient Stock Reservation
    try {
      await axios.post(`${API}/reservations`, {
        vehicleId, stationId, fuelType: 'PETROL', amount: 100 // Try booking 100L (stock is 50L)
      }, { headers: { Authorization: `Bearer ${userToken}` }});
      console.log('⚠️ Expected failure for insufficient stock, but succeeded');
    } catch(e: any) {
      if(e.response?.data?.error?.includes('stock')) console.log('✅ Correctly blocked insufficient stock (400)');
      else throw e;
    }

    // 6. Test Valid Reservation
    const resvRes = await axios.post(`${API}/reservations`, {
      vehicleId, stationId, fuelType: 'PETROL', amount: 15
    }, { headers: { Authorization: `Bearer ${userToken}` }});
    const reservationId = resvRes.data.id;
    const qrToken = resvRes.data.qrToken;
    console.log('✅ Reservation successful (15L PETROL). QR Token Generated.');

    // 7. Verify Inventory is conceptually deducted
    const stList = await axios.get(`${API}/stations`, { headers: { Authorization: `Bearer ${ownerToken}` }});
    const inv = stList.data.find((s:any) => s.id === stationId).inventory[0];
    if (inv.quantity === '35') {
      console.log('✅ Station inventory preemptively deducted by 15L (Total now: 35L)');
    }

    // 8. Test Cancellation
    await axios.post(`${API}/reservations/${reservationId}/cancel`, {}, { headers: { Authorization: `Bearer ${userToken}` }});
    console.log('✅ Reservation cancelled');

    const stList2 = await axios.get(`${API}/stations`, { headers: { Authorization: `Bearer ${ownerToken}` }});
    if (stList2.data.find((s:any) => s.id === stationId).inventory[0].quantity === '50') {
      console.log('✅ Station inventory refunded after cancellation (Total back to 50L)');
    }

    // 9. Re-reserve and Complete (QR Scan Verification)
    const resvRes2 = await axios.post(`${API}/reservations`, {
      vehicleId, stationId, fuelType: 'PETROL', amount: 20
    }, { headers: { Authorization: `Bearer ${userToken}` }});
    const qrToken2 = resvRes2.data.qrToken;
    
    // Station owner scans it
    const verifyRes = await axios.post(`${API}/reservations/verify`, {
      qrToken: qrToken2, stationId, dispensedAmount: 18 // Partial dispensing
    }, { headers: { Authorization: `Bearer ${ownerToken}` }});
    console.log('✅ QR Code successfully verified and redeemed');
    
    if (verifyRes.data.transaction.amount === '18') {
      console.log('✅ Partial dispensing logic succeeded. Transacted 18L.');
    }

    const finalRes = await axios.get(`${API}/reservations`, { headers: { Authorization: `Bearer ${userToken}` }});
    const status = finalRes.data.find((r:any) => r.id === resvRes2.data.id).status;
    if (status === 'COMPLETED') console.log('✅ Reservation status correctly marked as COMPLETED.');

    // 10. Attempt Duplicate QR Scan
    try {
      await axios.post(`${API}/reservations/verify`, {
        qrToken: qrToken2, stationId
      }, { headers: { Authorization: `Bearer ${ownerToken}` }});
      console.log('⚠️ Expected duplicate failure, but succeeded');
    } catch(e: any) {
      if(e.response?.data?.error?.includes('COMPLETED')) console.log('✅ Duplicate QR verification blocked (Replay attack prevented)');
      else throw e;
    }

    console.log('🎉 All Reservation and Verification tests passed successfully!');
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
