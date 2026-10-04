import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'e2e_user_1791022221819@example.com' } });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

  const res = await axios.get(`${API_URL}/reservations`, { headers: { Authorization: `Bearer ${token}` } });
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
