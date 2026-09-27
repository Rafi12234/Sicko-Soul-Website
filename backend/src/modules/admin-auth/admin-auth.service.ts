import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { StaffContext } from "../../types/auth.js";

export async function loginStaff(input: { email: string; password: string }) {
  const staff = await prisma.staff_users.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!staff || !staff.is_active) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_STAFF_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  }

  const valid = await bcrypt.compare(input.password, staff.password_hash);
  if (!valid) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_STAFF_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  }

  await prisma.staff_users.update({
    where: { staff_user_id: staff.staff_user_id },
    data: { last_login_at: new Date() },
  });

  const expiresIn = env.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
  const token = jwt.sign(
    {
      email: staff.email,
      role: staff.role,
    },
    env.JWT_SECRET,
    {
      subject: staff.staff_user_id.toString(),
      expiresIn,
    },
  );

  return {
    token,
    staff: {
      id: staff.staff_user_id.toString(),
      fullName: staff.full_name,
      email: staff.email,
      role: staff.role,
    },
  };
}

export function getStaffSession(staff: StaffContext) {
  return {
    id: staff.idString,
    fullName: staff.fullName,
    email: staff.email,
    role: staff.role,
  };
}
