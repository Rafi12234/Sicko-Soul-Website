import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { staff_users_role } from "../../generated/prisma/client.js";
import type { StaffContext } from "../types/auth.js";

const tokenPayloadSchema = z.object({
  sub: z.string().regex(/^\d+$/),
  email: z.string().email(),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "ORDER_MANAGER",
    "INVENTORY_MANAGER",
    "SUPPORT",
  ]),
});

export async function authenticateStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    next(
      new AppError({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "A valid staff bearer token is required.",
      }),
    );
    return;
  }

  try {
    const token = header.slice("Bearer ".length).trim();
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const payload = tokenPayloadSchema.parse(decoded);

    const staff = await prisma.staff_users.findFirst({
      where: {
        staff_user_id: BigInt(payload.sub),
        email: payload.email,
        is_active: true,
      },
      select: {
        staff_user_id: true,
        email: true,
        full_name: true,
        role: true,
      },
    });

    if (!staff) {
      throw new AppError({
        statusCode: 401,
        code: "STAFF_SESSION_INVALID",
        message: "The staff session is no longer valid.",
      });
    }

    const context: StaffContext = {
      id: staff.staff_user_id,
      idString: staff.staff_user_id.toString(),
      email: staff.email,
      fullName: staff.full_name,
      role: staff.role,
    };

    res.locals.staff = context;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(
      new AppError({
        statusCode: 401,
        code: "STAFF_SESSION_INVALID",
        message: "The staff session is invalid or expired.",
      }),
    );
  }
}

export function requireRoles(...roles: staff_users_role[]): RequestHandler {
  return (_req, res, next) => {
    const staff = res.locals.staff as StaffContext | undefined;

    if (!staff) {
      next(
        new AppError({
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Staff authentication is required.",
        }),
      );
      return;
    }

    if (staff.role !== "SUPER_ADMIN" && !roles.includes(staff.role)) {
      next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "Your staff role cannot perform this action.",
        }),
      );
      return;
    }

    next();
  };
}
