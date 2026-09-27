import type { staff_users_role } from "../../generated/prisma/client.js";

export type StaffContext = {
  id: bigint;
  idString: string;
  email: string;
  fullName: string;
  role: staff_users_role;
};

export type AuditContext = {
  staff: StaffContext;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
};
