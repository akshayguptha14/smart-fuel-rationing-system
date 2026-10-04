import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Successfully connected to Neon PostgreSQL!`);
    console.log(`📊 Current User count in database: ${userCount}`);
  } catch (error) {
    console.error(`❌ Connection failed:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
