import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PREFIX: z.string().trim().min(1).default("/api/v1"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().trim().min(1),
  DATABASE_HOST: z.string().trim().min(1).default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DATABASE_USER: z.string().trim().min(1),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string().trim().min(1).default("sicko_soul"),
  DATABASE_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid backend environment configuration:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
export type AppEnv = typeof env;
