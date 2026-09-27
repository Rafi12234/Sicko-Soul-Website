import type { Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { StaffContext } from "../types/auth.js";

export function getStaffContext(res: Response): StaffContext {
  const staff = res.locals.staff as StaffContext | undefined;
  if (!staff) {
    throw new AppError({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Staff authentication is required.",
    });
  }
  return staff;
}
