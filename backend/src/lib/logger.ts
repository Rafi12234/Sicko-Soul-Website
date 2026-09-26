import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  name: "sicko-soul-api",
  level: env.LOG_LEVEL,
  base: {
    environment: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
