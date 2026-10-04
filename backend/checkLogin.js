const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');

const prisma = new PrismaClient();

async function main() {
  const email = 'e2e_user_1791022221819@example.com';
  const password = 'password123';

  // 1. Database Check
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    console.log('1. Does the account exist? YES');
    console.log('User ID:', user.id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Has passwordHash:', !!user.passwordHash);

    if (user.passwordHash) {
      const match1 = await bcrypt.compare(password, user.passwordHash);
      console.log('Does password123 match?', match1);
      
      const match2 = await bcrypt.compare('password', user.passwordHash);
      if (match2) console.log('Does "password" match? YES');
    }
  } else {
    console.log('1. Does the account exist? NO');
  }

  // 2. API Check
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email,
      password
    });
    console.log('HTTP Status:', res.status);
    console.log('Response:', res.data);
  } catch (error) {
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Error Response:', error.response.data);
    } else {
      console.log('Network Error:', error.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
