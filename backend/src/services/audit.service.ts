import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { AuditContext } from "../types/auth.js";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: bigint | null | undefined;
  oldData?: unknown;
  newData?: unknown;
};

function json(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

export async function recordAudit(
  context: AuditContext,
  input: AuditInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.audit_logs.create({
    data: {
      staff_user_id: context.staff.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_data: json(input.oldData),
      new_data: json(input.newData),
      ip_address: context.ipAddress ?? null,
      user_agent: context.userAgent ?? null,
    },
  });
}
