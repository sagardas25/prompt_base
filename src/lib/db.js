import { PrismaPg } from "@prisma/adapter-pg";
import prisma from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db =
  globalThis.prisma ||
  new PrismaClient({
  adapter,
  });

if (process.env.NODE_ENV == "development") {
  globalThis.prisma = db;
}

export default db;
