import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HTTP } from "../config/constants.js";
import { AppError } from "../errors/app-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = res.locals.requestId as string | undefined;

  if (error instanceof ZodError) {
    const message = "Request validation failed.";
    res.status(HTTP.UNPROCESSABLE_ENTITY).json({
      message,
      error: {
        code: "VALIDATION_ERROR",
        message,
        details: error.flatten(),
        requestId,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, requestId }, "application error");
    }

    const message = error.expose ? error.message : "Internal server error.";
    res.status(error.statusCode).json({
      message,
      error: {
        code: error.code,
        message,
        ...(error.details !== undefined ? { details: error.details } : {}),
        requestId,
      },
    });
    return;
  }

  logger.error({ err: error, requestId }, "unhandled error");

  const message =
    env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Internal server error.";

  res.status(HTTP.INTERNAL_SERVER_ERROR).json({
    message,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
      requestId,
    },
  });
};
