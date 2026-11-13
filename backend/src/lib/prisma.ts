import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  // MySQL 8 caching_sha2_password may require RSA key retrieval on localhost.
  // Permit this only for a local development database, never for remote or production hosts.
  allowPublicKeyRetrieval:
    env.NODE_ENV === "development" &&
    ["127.0.0.1", "localhost", "::1"].includes(env.DATABASE_HOST),
  database: env.DATABASE_NAME,
  connectionLimit: env.DATABASE_CONNECTION_LIMIT,
});

export const prisma = new PrismaClient({ adapter });

export async function assertDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
