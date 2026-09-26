import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { APP_NAME, APP_VERSION } from "./config/constants.js";
import {
  assertDatabaseConnection,
  disconnectDatabase,
} from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "shutdown requested");

  const forceTimer = setTimeout(() => {
    logger.fatal("graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await disconnectDatabase();
  logger.info("shutdown complete");
  process.exit(0);
}

async function bootstrap(): Promise<void> {
  await assertDatabaseConnection();
  logger.info("database connection verified");

  server = app.listen(env.PORT, () => {
    logger.info(
      {
        app: APP_NAME,
        version: APP_VERSION,
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        environment: env.NODE_ENV,
      },
      "API server started",
    );
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandled promise rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "failed to start API server");
  process.exit(1);
});
