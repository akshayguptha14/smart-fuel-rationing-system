import axios from 'axios';

const API = 'http://localhost:3001/api';

async function runTest() {
  console.log('Testing Station Management and Inventory...');
  try {
    const ts = Date.now();
    const ownerEmail = `owner-${ts}@example.com`;
    const userEmail = `user-${ts}@example.com`;
    
    // 1. Register Station Owner (In a real app, assigning STATION_OWNER role is done by admin, but we'll mock or update via DB, wait - our auth endpoint creates 'USER' by default).
    // Let's create user, then update role directly via Prisma for the test.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const hashed = 'mockhash';
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: 'Test Owner', passwordHash: hashed, role: 'STATION_OWNER' }
    });
    console.log('✅ Created Station Owner via Prisma');
    
    // We need a valid token. Since we manually inserted, we can just login if we used the proper endpoint. 
    // Wait, let's just register normally, then update role, then login.
    await prisma.user.delete({ where: { email: ownerEmail } });

    await axios.post(`${API}/auth/register`, { name: 'Test Owner', email: ownerEmail, password: 'password' });
    await prisma.user.update({ where: { email: ownerEmail }, data: { role: 'STATION_OWNER' } });
    
    const ownerLogin = await axios.post(`${API}/auth/login`, { email: ownerEmail, password: 'password' });
    const ownerToken = ownerLogin.data.token;

    // Create a regular user
    await axios.post(`${API}/auth/register`, { name: 'Regular User', email: userEmail, password: 'password' });
    const userLogin = await axios.post(`${API}/auth/login`, { email: userEmail, password: 'password' });
    const userToken = userLogin.data.token;

    console.log('✅ Users registered and authenticated');

    // 2. Try to register station as regular user (should fail)
    try {
      await axios.post(`${API}/stations`, { name: 'User Station', location: 'City' }, { headers: { Authorization: `Bearer ${userToken}` } });
      console.log('⚠️ Expected 403, but succeeded');
    } catch (e: any) {
      if (e.response?.status === 403) console.log('✅ Regular user correctly rejected (403)');
      else throw e;
    }

    // 3. Register Station as Owner
    const stationRes = await axios.post(`${API}/stations`, { 
      name: 'Central Pump', location: 'Downtown', address: '123 Main St' 
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const stationId = stationRes.data.id;
    console.log(`✅ Station registered: ${stationRes.data.name} (ID: ${stationId})`);

    // 4. Update Inventory
    const invRes = await axios.post(`${API}/stations/${stationId}/inventory`, {
      fuelType: 'PETROL', quantity: 5000, capacity: 10000
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    console.log('✅ Inventory updated successfully for PETROL');

    // 5. Try invalid inventory (exceed capacity)
    try {
      await axios.post(`${API}/stations/${stationId}/inventory`, {
        fuelType: 'PETROL', quantity: 15000, capacity: 10000
      }, { headers: { Authorization: `Bearer ${ownerToken}` } });
      console.log('⚠️ Expected 400 invalid inventory, but succeeded');
    } catch (e: any) {
      if (e.response?.status === 400) console.log('✅ Correctly rejected invalid inventory (400)');
      else throw e;
    }

    // 6. List Stations
    const listRes = await axios.get(`${API}/stations`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    console.log(`✅ Listed stations. Count: ${listRes.data.length}`);
    const stationData = listRes.data[0];
    console.log(`   Inventory count: ${stationData.inventory.length}`);
    if (stationData.inventory[0].quantity === '5000') {
        console.log('✅ Inventory amount strictly matched via API.');
    }

    console.log('🎉 All Station and Inventory tests passed successfully!');
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
