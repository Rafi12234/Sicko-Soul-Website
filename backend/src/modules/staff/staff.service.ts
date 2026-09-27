import bcrypt from "bcryptjs";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";

function mapStaff(row: {
  staff_user_id: bigint;
  full_name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "ORDER_MANAGER" | "INVENTORY_MANAGER" | "SUPPORT";
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: row.staff_user_id.toString(),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listStaff() {
  return (await prisma.staff_users.findMany({
    orderBy: [{ created_at: "desc" }],
  })).map(mapStaff);
}

export async function createStaff(
  input: {
    fullName: string;
    email: string;
    password: string;
    role: "SUPER_ADMIN" | "ADMIN" | "ORDER_MANAGER" | "INVENTORY_MANAGER" | "SUPPORT";
    isActive: boolean;
  },
  audit: AuditContext,
) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const row = await prisma.staff_users.create({
    data: {
      full_name: input.fullName,
      email: input.email.toLowerCase(),
      password_hash: passwordHash,
      role: input.role,
      is_active: input.isActive,
    },
  });
  await recordAudit(audit, {
    action: "STAFF_CREATE",
    entityType: "staff_user",
    entityId: row.staff_user_id,
    newData: mapStaff(row),
  });
  return mapStaff(row);
}

export async function updateStaff(
  staffId: bigint,
  input: {
    fullName?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
    role?: "SUPER_ADMIN" | "ADMIN" | "ORDER_MANAGER" | "INVENTORY_MANAGER" | "SUPPORT" | undefined;
    isActive?: boolean | undefined;
  },
  audit: AuditContext,
) {
  const old = await prisma.staff_users.findUnique({ where: { staff_user_id: staffId } });
  if (!old) throw new AppError({ statusCode: 404, code: "STAFF_NOT_FOUND", message: "Staff user was not found." });
  if (staffId === audit.staff.id && input.isActive === false) {
    throw new AppError({ statusCode: 409, code: "CANNOT_DEACTIVATE_SELF", message: "You cannot deactivate your own staff account." });
  }

  const removesActiveSuperAdmin =
    old.role === "SUPER_ADMIN" &&
    old.is_active &&
    (input.isActive === false || (input.role !== undefined && input.role !== "SUPER_ADMIN"));
  if (removesActiveSuperAdmin) {
    const otherActiveSuperAdmins = await prisma.staff_users.count({
      where: {
        role: "SUPER_ADMIN",
        is_active: true,
        staff_user_id: { not: staffId },
      },
    });
    if (otherActiveSuperAdmins === 0) {
      throw new AppError({
        statusCode: 409,
        code: "LAST_SUPER_ADMIN_REQUIRED",
        message: "At least one active SUPER_ADMIN must remain.",
      });
    }
  }

  const row = await prisma.staff_users.update({
    where: { staff_user_id: staffId },
    data: {
      ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      ...(input.password !== undefined ? { password_hash: await bcrypt.hash(input.password, 12) } : {}),
    },
  });

  await recordAudit(audit, {
    action: "STAFF_UPDATE",
    entityType: "staff_user",
    entityId: staffId,
    oldData: mapStaff(old),
    newData: mapStaff(row),
  });
  return mapStaff(row);
}
