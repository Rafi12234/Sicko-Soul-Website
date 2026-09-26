import type { NextFunction, Request, Response } from "express";
import { HTTP } from "../../config/constants.js";
import { getHealth } from "./health.service.js";

export async function healthController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const health = await getHealth();
    res.status(HTTP.OK).json({ data: health });
  } catch (error) {
    next(error);
  }
}
