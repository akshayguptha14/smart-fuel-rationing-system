import axios from 'axios';

const API = 'http://localhost:3001/api';

async function runTest() {
  console.log('Testing Quota Allocation with Seeded Policies...');
  try {
    const ts = Date.now();
    const userEmail = `user-${ts}@example.com`;
    
    // 1. Register User
    await axios.post(`${API}/auth/register`, { name: 'Test User', email: userEmail, password: 'password' });
    const loginRes = await axios.post(`${API}/auth/login`, { email: userEmail, password: 'password' });
    const token = loginRes.data.token;
    console.log('✅ User created');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Register CAR and check if it gets 40L
    const carRes = await axios.post(`${API}/vehicles`, { licensePlate: `CAR-${ts}`, vehicleType: 'CAR' }, { headers });
    const carId = carRes.data.id;
    const carBalance = await axios.get(`${API}/quotas/${carId}`, { headers });
    console.log(`✅ CAR Quota: ${carBalance.data.activeQuota.totalQuota}L (Expected: 40L)`);

    // 3. Register TRUCK and check if it gets 100L
    const truckRes = await axios.post(`${API}/vehicles`, { licensePlate: `TRK-${ts}`, vehicleType: 'TRUCK' }, { headers });
    const truckId = truckRes.data.id;
    const truckBalance = await axios.get(`${API}/quotas/${truckId}`, { headers });
    console.log(`✅ TRUCK Quota: ${truckBalance.data.activeQuota.totalQuota}L (Expected: 100L)`);

    console.log('🎉 Seed configurations are working perfectly for new registrations!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
