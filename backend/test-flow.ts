import axios from 'axios';

const API = 'http://localhost:3001/api';

async function runTests() {
  console.log('Running tests...');
  try {
    // 1. Register
    const email = `test-${Date.now()}@example.com`;
    console.log(`Registering user ${email}...`);
    const regRes = await axios.post(`${API}/auth/register`, { name: 'Test User', email, password: 'password123' });
    console.log('✅ Registration successful');

    // 2. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API}/auth/login`, { email, password: 'password123' });
    const token = loginRes.data.token;
    console.log('✅ Login successful, got token');

    // 3. Register Vehicle
    console.log('Registering vehicle...');
    const plate = `TEST-${Math.floor(Math.random() * 10000)}`;
    const vehRes = await axios.post(`${API}/vehicles`, { licensePlate: plate, vehicleType: 'CAR' }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Vehicle registered successfully:', vehRes.data.licensePlate);

    // 4. List Vehicles
    console.log('Listing vehicles...');
    const listRes = await axios.get(`${API}/vehicles`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Vehicles listed successfully. Count:', listRes.data.length);
    
    console.log('All tests passed! 🎉');
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
