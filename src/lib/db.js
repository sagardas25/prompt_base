import {PrismaClient} from '@prisma/client';

//create a singleton instance of PrismaClient
const db = globalThis.prisma || new PrismaClient({
  log : ['query', 'info', 'warn', 'error'],
});

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

export default db;