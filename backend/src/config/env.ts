import "dotenv/config";
import { z } from "zod";

const boolFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}, z.boolean());

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
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(15),

  JWT_SECRET: z
    .string()
    .min(32)
    .default("development-only-sicko-soul-jwt-secret-change-me"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("8h"),

  ORDER_PENDING_TTL_MINUTES: z.coerce.number().int().min(15).max(10080).default(120),
  ORDER_EXPIRY_WORKER_INTERVAL_MS: z.coerce.number().int().min(10000).max(300000).default(60000),
  CART_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  DELIVERY_CHARGE_BDT: z.coerce.number().min(0).default(0),

  EMAIL_WORKER_ENABLED: boolFromEnv.default(true),
  EMAIL_WORKER_INTERVAL_MS: z.coerce.number().int().min(5_000).default(30_000),
  EMAIL_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  EMAIL_WORKER_LOCK_TIMEOUT_MS: z.coerce.number().int().min(60_000).default(10 * 60 * 1000),
  EMAIL_TRANSPORT: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().trim().min(3).default("Sicko Soul <noreply@sickosoul.shop>"),
  RESEND_API_KEY: z.string().trim().optional(),

  BOOTSTRAP_ADMIN_NAME: z.string().trim().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(10).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid backend environment configuration:\n${issues}`);
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.JWT_SECRET === "development-only-sicko-soul-jwt-secret-change-me"
) {
  throw new Error("JWT_SECRET must be replaced before production deployment.");
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.EMAIL_TRANSPORT === "resend" &&
  !parsed.data.RESEND_API_KEY
) {
  throw new Error("RESEND_API_KEY is required when EMAIL_TRANSPORT=resend.");
}

if (parsed.data.NODE_ENV === "production" && (parsed.data.EMAIL_TRANSPORT !== "resend" || !parsed.data.EMAIL_WORKER_ENABLED)) {
  throw new Error("P0 customer access recovery requires EMAIL_TRANSPORT=resend and EMAIL_WORKER_ENABLED=true in production.");
}
export const env = Object.freeze(parsed.data);
export type AppEnv = typeof env;
