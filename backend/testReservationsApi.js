const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testApi() {
  const baseURL = 'http://localhost:3001/api';
  const secret = process.env.JWT_SECRET || 'secret'; // The backend is using 'secret'

  // Generate tokens manually to bypass unknown passwords
  const userToken = jwt.sign({ id: 'uuid-user', email: 'user@test.com', role: 'USER' }, secret, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: 'uuid-admin', email: 'admin@test.com', role: 'ADMIN' }, secret, { expiresIn: '1h' });
  
  // Need the real John token to check reservations query
  const ownerToken = jwt.sign({ id: '495f80dd-39c4-471e-9aad-e4736850157e', email: 'john@gmail.com', role: 'STATION_OWNER' }, secret, { expiresIn: '1h' });

  // 1. Test STATION_OWNER (John)
  try {
    const res = await axios.get(`${baseURL}/station/reservations`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log("JOHN (STATION_OWNER): 200 OK, Count:", res.data.length);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("JOHN (STATION_OWNER) Failed:", err.response?.status, err.response?.data);
  }

  // 2. Test USER
  try {
    const res = await axios.get(`${baseURL}/station/reservations`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log("USER: Success (Unexpected!)");
  } catch (err) {
    console.log("USER:", err.response?.status === 403 ? '403 Forbidden (Expected)' : err.response?.status);
  }

  // 3. Test ADMIN
  try {
    const res = await axios.get(`${baseURL}/station/reservations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("ADMIN: Success (Unexpected!)");
  } catch (err) {
    console.log("ADMIN:", err.response?.status === 403 ? '403 Forbidden (Expected)' : err.response?.status);
  }

  // 4. Test Unauthenticated
  try {
    const res = await axios.get(`${baseURL}/station/reservations`);
    console.log("UNAUTH: Success (Unexpected!)");
  } catch (err) {
    console.log("UNAUTH:", err.response?.status === 401 ? '401 Unauthorized (Expected)' : err.response?.status);
  }
}

testApi();
