import { prisma } from "../../lib/prisma.js";

export async function listAuditLogs() {
  const rows = await prisma.audit_logs.findMany({
    include: {
      staff_users: {
        select: { full_name: true, email: true, role: true },
      },
    },
    orderBy: [{ created_at: "desc" }],
    take: 500,
  });

  return rows.map((row) => ({
    id: row.audit_log_id.toString(),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id?.toString() ?? null,
    oldData: row.old_data,
    newData: row.new_data,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
    staff: row.staff_users
      ? {
          name: row.staff_users.full_name,
          email: row.staff_users.email,
          role: row.staff_users.role,
        }
      : null,
  }));
}
