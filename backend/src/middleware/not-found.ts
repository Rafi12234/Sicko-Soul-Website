import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { HTTP } from "../config/constants.js";

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError({
      statusCode: HTTP.NOT_FOUND,
      code: "ROUTE_NOT_FOUND",
      message: `No route exists for ${req.method} ${req.originalUrl}`,
    }),
  );
}
