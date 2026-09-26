import { prisma } from "../../lib/prisma.js";

const bootedAt = Date.now();

export type HealthResult = {
  status: "ok";
  service: "sicko-soul-api";
  database: "connected";
  uptimeSeconds: number;
  timestamp: string;
};

export async function getHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok",
    service: "sicko-soul-api",
    database: "connected",
    uptimeSeconds: Math.floor((Date.now() - bootedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}
