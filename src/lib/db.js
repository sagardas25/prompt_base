//import { PrismaClient } from '@prisma/client'
import { PrismaClient } from '../../prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

//create a singleton instance of PrismaClient
const db = globalThis.prisma || new PrismaClient({
  adapter,
  log : ['query', 'info', 'warn', 'error'],
});

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

export default db;