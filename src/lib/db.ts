import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Convert Prisma-style "file:./path" to a plain file path
  return url.startsWith("file:") ? url.slice(5) : url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: getDatabaseUrl() });
  // Type assertion needed: Prisma 7 adapter option types don't align with PrismaClientOptions yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
